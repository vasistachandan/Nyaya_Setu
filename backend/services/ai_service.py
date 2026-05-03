"""AI service for extracting structured data from court judgments.

Powered by Groq (`llama-3.3-70b-versatile` by default). Groq is text-only, so
we extract PDF text first with ``pypdf`` and prepend page markers before
sending it to the model.

Requires ``GROQ_API_KEY`` in the environment. There is no mock fallback —
callers must handle errors via HTTP status codes from the extraction router.
"""
from __future__ import annotations

import json
import re
from typing import Any

from groq import APIConnectionError, APIStatusError, Groq

from config import settings
from services.pdf_service import extract_full_text

SYSTEM_PROMPT = """You are a senior legal document analyst working with the
Karnataka government's Court Case Monitoring System (CCMS). You will be given
the full text of a High Court judgment, with page boundaries marked as
"[Page N]". You must extract the structured action plan that the responsible
department needs.

Return ONLY a valid JSON object matching this exact schema (no markdown, no
prose, no commentary):

{
  "case_details": {
    "case_number": "",
    "court_name": "",
    "date_of_order": "",
    "bench": "",
    "case_number_src": {"page": 1, "quote": "verbatim excerpt from judgment for this field"},
    "court_name_src": {"page": 1, "quote": ""},
    "date_of_order_src": {"page": 1, "quote": ""},
    "bench_src": {"page": 1, "quote": ""}
  },
  "parties": {
    "petitioner": "",
    "respondent": "",
    "petitioner_src": {"page": 1, "quote": ""},
    "respondent_src": {"page": 1, "quote": ""}
  },
  "key_directions": [
    {
      "direction": "",
      "paragraph_reference": "",
      "confidence": 0.0,
      "source": {"page": 1, "quote": "verbatim phrase from the direction in the judgment"}
    }
  ],
  "timelines": [
    {"event": "", "date_or_period": "", "is_inferred": false}
  ],
  "action_plan": {
    "compliance_required": true,
    "compliance_details": "",
    "appeal_recommended": false,
    "appeal_rationale": "",
    "limitation_period": "",
    "responsible_departments": [],
    "nature_of_action": "",
    "key_dates": [
      {"label": "", "date": "YYYY-MM-DD", "is_inferred": false}
    ]
  },
  "overall_confidence": 0.0,
  "summary": "",
  "summary_src": {"page": 1, "quote": "verbatim excerpt the summary is based on"}
}

Rules:
- For each direction, set confidence between 0 and 1 based on how explicitly
  the direction is stated in the judgment.
- "paragraph_reference" should be the paragraph number from the judgment
  combined with the page marker, e.g. "Para 12, Page 5".
- For timelines, set is_inferred=true if you calculated a date rather than
  reading it directly from the judgment.
- If no explicit limitation period is mentioned, infer the standard 90-day
  appeal window for a High Court judgment and note that in
  appeal_rationale.
- Dates must be ISO format YYYY-MM-DD whenever possible.
- "responsible_departments" should be Karnataka government bodies (e.g.
  "Revenue Department", "Public Works Department", "Health Department",
  "Education Department", "Urban Development Department",
  "Finance Department"). Pick the ones the directions actually bind.
- Keep "summary" to 2-3 sentences in plain English for a busy officer.
- SOURCE HIGHLIGHTS (*_src fields, direction "source", "summary_src"): For every
  case_details field, parties field, each key_directions item, and the summary,
  you MUST fill the matching "_src" or "source" object when the field is
  non-empty. Copy "quote" EXACTLY as it appears in the judgment text (same
  spelling, spaces, punctuation; 40–200 characters; no paraphrase). Set "page" to
  the number N from the nearest preceding "[Page N]" marker for that quote. If
  you cannot find a contiguous verbatim substring, use the shortest exact phrase
  you can still copy. Use {"page": 0, "quote": ""} only when the field is empty.
"""


def _strip_to_json(text: str) -> str:
    """Trim surrounding markdown / commentary and isolate the JSON object."""
    text = (text or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z]*", "", text).strip()
        if text.endswith("```"):
            text = text[:-3].strip()
    first = text.find("{")
    last = text.rfind("}")
    if first != -1 and last != -1 and last > first:
        return text[first : last + 1]
    return text


def _safe_json(text: str) -> dict[str, Any]:
    try:
        return json.loads(text)
    except Exception:
        cleaned = _strip_to_json(text)
        try:
            return json.loads(cleaned)
        except Exception:
            return {}


def _call_groq(pdf_path: str) -> dict[str, Any]:
    """Extract text from PDF, send to Groq, return parsed JSON."""
    pdf_text, meta = extract_full_text(
        pdf_path, max_chars=settings.groq_max_input_chars
    )

    if not pdf_text or len(pdf_text.strip()) < 50:
        raise RuntimeError(
            "Could not extract any text from this PDF — it appears to be a "
            "scanned image. OCR pre-processing is required (e.g. Tesseract). "
            f"Pages: {meta['pages']}, scanned: {meta['is_likely_scanned']}"
        )

    truncation_note = ""
    if meta.get("truncated"):
        if meta.get("strategy") == "head_tail":
            truncation_note = (
                "\n\nNote: The judgment was longer than the model context. "
                "The text above contains the **opening pages** (case header, "
                "parties, prayer) and the **closing pages** (operative "
                "directions, disposal) — middle judicial reasoning was "
                "omitted to fit the budget. The operative directions are "
                "preserved, so produce a confident action plan from them."
            )
        else:
            truncation_note = (
                "\n\nNote: The judgment was longer than the model context "
                "and was truncated. Extract what you can and lower confidence "
                "accordingly."
            )

    user_prompt = (
        "Below is the text of a court judgment. Page boundaries are marked "
        "as `[Page N]`. Read it carefully and produce the JSON action plan "
        "exactly as specified in the system prompt.\n\n"
        "--- BEGIN JUDGMENT TEXT ---\n"
        f"{pdf_text}\n"
        "--- END JUDGMENT TEXT ---"
        f"{truncation_note}"
    )

    client = Groq(api_key=settings.groq_api_key, timeout=90.0)
    try:
        response = client.chat.completions.create(
            model=settings.groq_model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
            max_tokens=settings.groq_max_output_tokens,
        )
    except (APIConnectionError, APIStatusError) as exc:
        raise RuntimeError(f"Groq API error: {exc!s}") from exc

    raw_text = (response.choices[0].message.content or "").strip()
    parsed = _safe_json(raw_text)
    parsed["_raw"] = raw_text
    parsed["_meta"] = meta
    return parsed


def extract_judgment(pdf_path: str) -> dict[str, Any]:
    """Return parsed extraction dict for a judgment PDF.

    Raises
    ------
    ValueError
        If ``GROQ_API_KEY`` is not configured.
    RuntimeError
        Scanned/unreadable PDF, empty model response, or Groq failure.
    """
    if not (settings.groq_api_key or "").strip():
        raise ValueError(
            "GROQ_API_KEY is not set. Add it to backend/.env to run extraction."
        )
    return _call_groq(pdf_path)
