import { useCallback, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { highlightAcrossPages } from "../lib/pdfSourceHighlight";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

function allTextSpans(root) {
  if (!root) return [];
  return Array.from(
    root.querySelectorAll(".react-pdf__Page__textContent span, .react-pdf__Page__textLayer span"),
  );
}

function clearHighlights(root) {
  if (!root) return;
  allTextSpans(root).forEach((span) => {
    span.classList.remove("highlighted", "pdf-source-highlight");
  });
}

function truncateForSearch(raw) {
  if (raw == null || raw === "") return "";
  const s = String(raw).trim();
  return s.length > 220 ? s.slice(0, 220) : s;
}

/**
 * Try substring / multi-span search when no pdfSource quote matched.
 * @param {HTMLElement | null} root
 * @param {string} rawText
 * @returns {boolean} whether anything was highlighted
 */
function fallbackHighlightInDocument(root, rawText) {
  if (!root) return false;
  let text = String(rawText ?? "").trim();
  if (!text) return false;

  const tryOnce = (chunk) => {
    const t = String(chunk).trim();
    if (t.length < 3) return false;

    const lowerSearch = t.toLowerCase();
    let scrolled = false;
    let anySimple = false;
    const spans = allTextSpans(root);

    spans.forEach((span) => {
      const content = (span.textContent || "").toLowerCase();
      if (content.includes(lowerSearch)) {
        anySimple = true;
        span.classList.add("highlighted");
        if (!scrolled) {
          span.scrollIntoView({ behavior: "smooth", block: "center" });
          scrolled = true;
        }
      }
    });

    if (anySimple) return true;

    if (!spans.length) return false;

    const fullText = spans.map((s) => s.textContent || "").join(" ");
    const lowerFull = fullText.toLowerCase();
    const searchIdx = lowerFull.indexOf(lowerSearch);
    if (searchIdx < 0) return false;

    let charCount = 0;
    let scrolled2 = false;
    const searchEnd = searchIdx + t.length;

    for (const span of spans) {
      const len = (span.textContent || "").length;
      const start = charCount;
      const end = charCount + len;
      if (start <= searchEnd && end >= searchIdx) {
        span.classList.add("highlighted");
        if (!scrolled2) {
          span.scrollIntoView({ behavior: "smooth", block: "center" });
          scrolled2 = true;
        }
      }
      charCount += len + 1;
    }
    return true;
  };

  const lens = [
    Math.min(text.length, 400),
    Math.min(text.length, 220),
    Math.min(text.length, 120),
    Math.min(text.length, 80),
    Math.min(text.length, 55),
  ];
  const uniq = [...new Set(lens.filter((n) => n >= 3))].sort((a, b) => b - a);
  for (const n of uniq) {
    if (tryOnce(text.slice(0, n))) return true;
  }
  return false;
}

/**
 * @param {{
 *   pdfUrl: string,
 *   highlight: null | { key?: string, pdfSource?: { page?: number, quote?: string } | null, value?: string }
 * }} props
 */
export default function PDFViewer({ pdfUrl, highlight }) {
  const containerRef = useRef(null);
  const [numPages, setNumPages] = useState(0);
  const highlightRef = useRef(highlight);

  useEffect(() => {
    highlightRef.current = highlight;
  }, [highlight]);

  const applyHighlight = useCallback(() => {
    const h = highlightRef.current;
    const root = containerRef.current;
    clearHighlights(root);
    if (!h || !root) return;

    const quote = h.pdfSource?.quote != null ? String(h.pdfSource.quote).trim() : "";
    const page = h.pdfSource?.page != null ? Number(h.pdfSource.page) : 0;
    const value = h.value != null ? String(h.value).trim() : "";

    if (quote.length >= 8) {
      const pageEls = Array.from(root.querySelectorAll(".react-pdf__Page"));
      const n = pageEls.length;
      if (n > 0) {
        const pageRefs = {};
        pageEls.forEach((el, i) => {
          pageRefs[i + 1] = el;
        });
        const found = highlightAcrossPages(pageRefs, n, page, quote);
        if (found > 0) return;
      }
    }

    fallbackHighlightInDocument(root, truncateForSearch(value));
  }, []);

  const handlePageRender = useCallback(() => {
    applyHighlight();
  }, [applyHighlight]);

  useEffect(() => {
    applyHighlight();
  }, [highlight, numPages, applyHighlight]);

  return (
    <div ref={containerRef} className="pdf-viewer-root h-full min-h-0 overflow-auto">
      <Document
        key={pdfUrl}
        file={pdfUrl}
        loading={<div className="p-4 text-sm text-ink-muted">Loading PDF…</div>}
        error={<div className="p-4 text-sm text-danger">Could not load PDF.</div>}
        onLoadSuccess={(doc) => setNumPages(doc.numPages)}
      >
        {numPages > 0 &&
          Array.from({ length: numPages }, (_, i) => (
            <Page
              key={i + 1}
              pageNumber={i + 1}
              width={600}
              renderTextLayer
              renderAnnotationLayer={false}
              onRenderSuccess={handlePageRender}
              onRenderTextLayerSuccess={handlePageRender}
            />
          ))}
      </Document>
    </div>
  );
}
