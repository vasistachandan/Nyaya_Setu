"""PDF helpers — file persistence + text extraction fallback."""
from __future__ import annotations

import base64
import uuid
from pathlib import Path
from typing import BinaryIO

from pypdf import PdfReader

from config import settings


def save_uploaded_pdf(file_obj: BinaryIO, original_filename: str) -> tuple[str, str]:
    """Persist an uploaded PDF and return (absolute_path, stored_filename)."""
    storage_dir = settings.storage_dir
    safe_name = original_filename.replace(" ", "_")
    stored_filename = f"{uuid.uuid4().hex}_{safe_name}"
    target = storage_dir / stored_filename
    with target.open("wb") as out:
        while True:
            chunk = file_obj.read(1024 * 1024)
            if not chunk:
                break
            out.write(chunk)
    return str(target.resolve()), stored_filename


def read_pdf_as_base64(pdf_path: str) -> str:
    with open(pdf_path, "rb") as fh:
        return base64.standard_b64encode(fh.read()).decode("utf-8")


def extract_text_quick(pdf_path: str, max_pages: int = 25) -> str:
    """Cheap text extraction from the first ``max_pages`` (for quick previews)."""
    try:
        reader = PdfReader(pdf_path)
    except Exception:
        return ""
    out: list[str] = []
    for i, page in enumerate(reader.pages[:max_pages]):
        try:
            out.append(page.extract_text() or "")
        except Exception:
            continue
    return "\n".join(out).strip()


def extract_full_text(pdf_path: str, max_chars: int = 18_000) -> tuple[str, dict]:
    """Extract text from a PDF as a single string with page markers, sized
    to fit LLM context windows and provider rate limits.

    Page markers like ``[Page 3]`` are inserted before each page's content so
    the model can produce references such as "Para 12, Page 5".

    Smart truncation: if the full text exceeds ``max_chars`` we keep the
    **head** (case header, parties, prayer) and the **tail** (operative
    paragraphs / directions / disposal) — i.e. the parts that actually
    determine the action plan — and drop the middle judicial reasoning.

    Returns
    -------
    (text, meta)
        text : the assembled string (may be empty if the PDF is image-only).
        meta : { 'pages': int, 'pages_used': int, 'truncated': bool,
                 'is_likely_scanned': bool, 'strategy': str, 'total_chars': int }
    """
    meta = {
        "pages": 0,
        "pages_used": 0,
        "truncated": False,
        "is_likely_scanned": False,
        "strategy": "full",
        "total_chars": 0,
    }
    try:
        reader = PdfReader(pdf_path)
    except Exception:
        return "", meta

    meta["pages"] = len(reader.pages)
    page_texts: list[tuple[int, str]] = []  # (page_number, text)
    non_empty_pages = 0

    for i, page in enumerate(reader.pages):
        try:
            t = page.extract_text() or ""
        except Exception:
            t = ""
        if t.strip():
            non_empty_pages += 1
        page_texts.append((i + 1, t))

    # Compute total length up-front so we can choose a strategy.
    full_chunks = [f"[Page {n}]\n{t}" for n, t in page_texts]
    full_text = "\n\n".join(full_chunks).strip()
    meta["total_chars"] = len(full_text)

    # Detect scanned PDFs first.
    if meta["pages"] > 0 and non_empty_pages == 0:
        meta["is_likely_scanned"] = True
    elif meta["pages"] > 2 and non_empty_pages / meta["pages"] < 0.2:
        meta["is_likely_scanned"] = True

    # Fits comfortably — return everything.
    if len(full_text) <= max_chars:
        meta["pages_used"] = meta["pages"]
        return full_text, meta

    # ------------------------------------------------------------------
    # Smart truncation: head + tail.
    # We give the head 55% of the budget and the tail 45%, so we keep
    # parties / prayer at the top and operative directions / disposal
    # at the bottom — exactly what the action-plan extractor needs.
    # ------------------------------------------------------------------
    meta["truncated"] = True
    meta["strategy"] = "head_tail"

    head_budget = int(max_chars * 0.55)
    tail_budget = max_chars - head_budget

    head_parts: list[str] = []
    head_used = 0
    last_head_page = 0
    for n, t in page_texts:
        chunk = f"[Page {n}]\n{t}"
        if head_used + len(chunk) > head_budget:
            remaining = head_budget - head_used
            if remaining > 200:  # only keep partial page if meaningful
                head_parts.append(chunk[:remaining])
            last_head_page = n - 1
            break
        head_parts.append(chunk)
        head_used += len(chunk) + 2  # +2 for the \n\n joiner
        last_head_page = n

    tail_parts: list[str] = []
    tail_used = 0
    first_tail_page = meta["pages"] + 1
    for n, t in reversed(page_texts):
        if n <= last_head_page:
            break
        chunk = f"[Page {n}]\n{t}"
        if tail_used + len(chunk) > tail_budget:
            break
        tail_parts.insert(0, chunk)
        tail_used += len(chunk) + 2
        first_tail_page = n

    middle_marker = (
        f"\n\n[... pages {last_head_page + 1}–{first_tail_page - 1} of judicial "
        "reasoning omitted to fit context window — operative paragraphs "
        "preserved below ...]\n\n"
        if first_tail_page > last_head_page + 1
        else ""
    )

    text = (
        "\n\n".join(head_parts).strip()
        + middle_marker
        + "\n\n".join(tail_parts).strip()
    ).strip()

    # Pages "used" = head pages + tail pages.
    meta["pages_used"] = last_head_page + (meta["pages"] - first_tail_page + 1)
    return text, meta


def page_count(pdf_path: str) -> int:
    try:
        return len(PdfReader(pdf_path).pages)
    except Exception:
        return 0
