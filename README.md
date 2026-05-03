# Nyaya Setu — CCMS AI Judgment Analyser

> **From Court Judgments to Verified Action Plans.**
> Built for the Karnataka government's Court Case Monitoring System (CCMS),
> Nyaya Setu reads complex legal PDFs, extracts directives, drafts a structured
> action plan, and routes everything through a human reviewer before anything
> reaches the dashboard. **AI does the reading. Officials make the decisions.**

---

## What's inside

| Layer       | Tech                                                     |
| ----------- | -------------------------------------------------------- |
| Frontend    | React 18 (Vite) · Tailwind CSS · Chart.js · react-pdf    |
| Backend     | FastAPI · Python 3.11 · SQLAlchemy 2                     |
| AI          | Groq `llama-3.3-70b-versatile` · text-only (free tier, very fast) |
| Database    | PostgreSQL 15 (auto-falls-back to SQLite if Docker is off) |
| PDF parsing | `pypdf` extracts page-tagged text → fed to Groq                 |
| Auth        | Simple JWT scaffold (admin reviewer role)                |
| Dev infra   | Docker Compose (Postgres only)                           |

---

## Project layout

```
nyaya-setu-prototype/
├── backend/
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   ├── clear_data.py     # wipe all cases + PDFs (optional)
│   ├── routers/
│   │   ├── upload.py
│   │   ├── extraction.py
│   │   ├── verification.py
│   │   └── dashboard.py
│   ├── services/
│   │   ├── ai_service.py
│   │   └── pdf_service.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/        (Landing, Upload, Verify, Dashboard)
│   │   ├── components/   (Navbar, PDFViewer, ExtractionPanel, …)
│   │   ├── api/          (Axios client)
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
└── docker-compose.yml    # PostgreSQL only
```

---

## Quick start

### 1. Database (PostgreSQL via Docker)

```bash
docker compose up -d
```

> No Docker? **Skip this step** — the backend will automatically fall back to
> a local SQLite file at `backend/storage/ccms.sqlite`.

### 2. Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env       # then edit .env and set GROQ_API_KEY
uvicorn main:app --reload --port 8000
```

The API will be live at <http://localhost:8000> with docs at `/docs`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>.

> The Vite dev server proxies `/api/*` and `/health` to `http://localhost:8000`,
> so the frontend just calls relative paths — no extra config needed.

---

## Configuration

Edit `backend/.env`:

| Var                    | Purpose                                                                     |
| ---------------------- | --------------------------------------------------------------------------- |
| `GROQ_API_KEY`         | **Required** for extraction. Get a key at <https://console.groq.com/keys>. Without it, `POST /api/extract/...` returns HTTP 503. |
| `DATABASE_URL`         | Connection string. Defaults to local Postgres.                              |
| `PDF_STORAGE_PATH`     | Where uploaded PDFs are saved.                                              |
| `GROQ_MODEL`           | Default `llama-3.3-70b-versatile` (128k context, free tier).                |
| `GROQ_MAX_INPUT_CHARS` | Cap on PDF-text length sent to Groq. Default `18000` (free-tier safe — see "Free-tier rate limits" below). |
| `GROQ_MAX_OUTPUT_TOKENS` | Cap on JSON output. Default `2048`.                                       |

---

## How the AI extraction works

Groq is text-only, so the backend runs a two-step pipeline in
`backend/services/ai_service.py`:

1. **PDF → page-tagged text.** `pdf_service.extract_full_text()` reads
   every page with `pypdf` and prepends `[Page N]` markers before each
   chunk, capped at `GROQ_MAX_INPUT_CHARS` (default 18,000 — see
   "Free-tier rate limits" below). The model can therefore produce
   paragraph references like *"Para 12, Page 5"*. If a PDF has
   effectively no extractable text (scanned image), the service
   surfaces a clean error instead of feeding empty input to the model.

   **Smart truncation:** for judgments longer than the budget, the
   extractor keeps the **opening pages** (case header, parties, prayer)
   AND the **closing pages** (operative directions, disposal) and drops
   the middle judicial reasoning — i.e. the parts that actually drive
   the action plan are always preserved.

2. **Text → JSON via Groq.** We call `groq.chat.completions.create()` on
   `llama-3.3-70b-versatile` with `response_format={"type":"json_object"}`,
   which forces strict JSON — no markdown fences, no commentary.

### Free-tier rate limits

Groq's free tier on `llama-3.3-70b-versatile` allows **6,000 tokens per
minute** (combined input + output). A single 80-page judgment is around
30,000 tokens — sending that on free tier causes Groq's edge layer to
**silently drop the connection** (the SDK reports `APIConnectionError:
Connection error.` after 3 retries).

Defaults are tuned for free tier:

| Setting                  | Free tier  | Developer tier (paid) |
| ------------------------ | ---------- | --------------------- |
| `GROQ_MAX_INPUT_CHARS`   | `18000`    | up to `200000`        |
| `GROQ_MAX_OUTPUT_TOKENS` | `2048`     | `4096`                |

Combined with the head+tail smart truncation above, this keeps every
request under ~5,500 input tokens — well inside the 6,000 TPM ceiling
— while still giving the model the parties and the operative
directions of arbitrarily long judgments.

The system prompt asks Groq to return strict JSON in this shape:

```json
{
  "case_details": { "case_number": "", "court_name": "", "date_of_order": "", "bench": "" },
  "parties": { "petitioner": "", "respondent": "" },
  "key_directions": [
    { "direction": "", "paragraph_reference": "", "confidence": 0.0 }
  ],
  "timelines": [
    { "event": "", "date_or_period": "", "is_inferred": false }
  ],
  "action_plan": {
    "compliance_required": true,
    "compliance_details": "",
    "appeal_recommended": false,
    "appeal_rationale": "",
    "limitation_period": "",
    "responsible_departments": [],
    "nature_of_action": "",
    "key_dates": [{ "label": "", "date": "YYYY-MM-DD", "is_inferred": false }]
  },
  "overall_confidence": 0.0,
  "summary": ""
}
```

Per-direction `confidence` lights up the verify panel:

| Range      | Colour | Meaning                                |
| ---------- | ------ | -------------------------------------- |
| `≥ 0.80`   | Green  | Explicit, high-confidence extraction.  |
| `0.50–0.79`| Amber  | Likely correct, reviewer should glance.|
| `< 0.60`   | Red    | Auto-highlighted on verify panel.      |

If Groq can't find a limitation period, it **infers the standard 90-day
High Court appeal window** and tags it `is_inferred: true`.

---

## API reference (cheat sheet)

| Method | Path                                  | Purpose                                  |
| ------ | ------------------------------------- | ---------------------------------------- |
| GET    | `/health`                             | Service health + AI / demo mode flags    |
| POST   | `/api/upload`                         | Upload a judgment PDF                    |
| POST   | `/api/extract/{case_id}`              | Run Groq over the saved PDF text         |
| GET    | `/api/cases?status=…`                 | List cases (optionally filtered)         |
| GET    | `/api/cases/{case_id}`                | Full case + extraction                   |
| GET    | `/api/cases/{case_id}/pdf`            | Raw PDF (for `react-pdf`)                |
| POST   | `/api/cases/{case_id}/verify`         | Approve / edit / reject                  |
| GET    | `/api/dashboard?department=…`         | Aggregated dashboard data                |

All requests/responses are documented at <http://localhost:8000/docs>.

---

## Pages & flow

1. **Landing** (`/`) — Hero, pipeline diagram, tech-stack overview.
2. **Upload** (`/upload`) — Drag & drop a PDF; multi-stage progress UI; one-click
   handoff to the verify queue.
3. **Verify** (`/verify`, `/verify/:id`) — Two-pane reviewer workspace:
   * **Left:** Scrollable PDF viewer with zoom + page navigation.
   * **Right:** Editable cards for case details, parties, directions, timelines,
     action plan. Confidence badges everywhere.
   * **Footer:** Approve · Edit & Approve (with notes) · Reject (with reason).
4. **Dashboard** (`/dashboard`) — Department-filterable view of **only verified**
   cases: stats, action cards, deadlines panel, departmental Chart.js bar chart,
   and a full-detail modal.

---

## Groq API key

Extraction calls **require** `GROQ_API_KEY` in `backend/.env`. If it is missing,
`POST /api/extract/{case_id}` returns **503** with a clear message. The navbar
shows **Set GROQ_API_KEY** until a key is configured.

## Scanned (image-only) PDFs

`pypdf` can only extract text from PDFs that have a text layer. Pure
scans (camera photos, fax-style judgments) will return empty text, in
which case the live Groq call short-circuits with a clear error:

> Could not extract any text from this PDF — it appears to be a scanned
> image. OCR pre-processing is required (e.g. Tesseract).

To handle scanned judgments end-to-end, plug in an OCR step
(`pytesseract` + `pdf2image`, or AWS Textract) inside
`pdf_service.extract_full_text()` and the rest of the pipeline keeps
working unchanged.

---

## Clear all data

To delete every case, related rows, and each case's PDF file:

```bash
cd backend
python clear_data.py
```

---

## Design language

* Permanent dark mode — bg `#0f1117`, surface `#1a1d27`, line `#2a2d3e`.
* Brand indigo `#6366f1`. Success `#22c55e`. Warning `#f59e0b`. Danger `#ef4444`.
* Display font: **Sora**. Body font: **Inter**.
* Skeleton shimmer while extracting; toast notifications on every state change;
  micro-animations on hover.

---

## Evaluation criteria → where each is addressed

| Criterion                          | Where                                    |
| ---------------------------------- | ---------------------------------------- |
| Accuracy of extraction             | `services/ai_service.py` (Groq + page-tagged text) |
| Quality of action plan             | Same — strict JSON contract              |
| Effectiveness of human verification| `pages/Verify.jsx` + verification logs   |
| Clarity & usability of dashboard   | `pages/Dashboard.jsx` (stats + deadlines + chart) |
| Explainability                     | Confidence per field · `is_inferred` flags |
| Decision support, not automation   | Status only flips to `verified` after explicit reviewer action |

---

## Built for the next round of judging

* Every extracted field is editable.
* Every reviewer action (approve / edit / reject) is logged in
  `verification_logs` with the reviewer ID and timestamp.
* Rejected cases re-appear in the queue with the rejection reason visible,
  so a different officer can re-review.
