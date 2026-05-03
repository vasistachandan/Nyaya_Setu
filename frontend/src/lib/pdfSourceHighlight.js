/** Highlight verbatim quotes in react-pdf text layers (verify / source pane). */

export const PDF_HIGHLIGHT_CLASS = "pdf-source-highlight";

export function clearPdfHighlights(containerEl) {
  if (!containerEl) return;
  containerEl.querySelectorAll(`.${PDF_HIGHLIGHT_CLASS}`).forEach((el) => {
    el.classList.remove(PDF_HIGHLIGHT_CLASS);
  });
}

/**
 * @param {HTMLElement | null | undefined} pageWrapperEl - Outer ref from PDFViewer (wraps Page).
 * @param {string} rawQuote - Verbatim or near-verbatim substring to find.
 * @returns {boolean}
 */
export function highlightQuoteInPageWrapper(pageWrapperEl, rawQuote) {
  const pageEl = pageWrapperEl?.querySelector?.(".react-pdf__Page") ?? pageWrapperEl;
  if (!pageEl) return false;

  const layer =
    pageEl.querySelector(".react-pdf__Page__textLayer") ||
    pageEl.querySelector(".textLayer");
  if (!layer || !rawQuote) return false;

  const spans = [...layer.querySelectorAll("span")];
  if (!spans.length) return false;

  const full = spans.map((s) => s.textContent ?? "").join("");

  let q = String(rawQuote).trim();
  while (q.length > 10 && full.indexOf(q) < 0) {
    q = q.slice(0, -1);
  }
  if (q.length < 8) return false;

  const idx = full.indexOf(q);
  if (idx < 0) return false;
  const end = idx + q.length;

  let pos = 0;
  let startSpan = -1;
  let endSpan = -1;
  for (let i = 0; i < spans.length; i++) {
    const len = (spans[i].textContent ?? "").length;
    const s = pos;
    pos += len;
    if (startSpan < 0 && pos > idx) startSpan = i;
    if (pos >= end) {
      endSpan = i;
      break;
    }
  }
  if (startSpan < 0) return false;
  if (endSpan < 0) endSpan = spans.length - 1;

  for (let i = startSpan; i <= endSpan; i++) {
    spans[i].classList.add(PDF_HIGHLIGHT_CLASS);
  }

  const first = spans[startSpan];
  first?.scrollIntoView?.({ behavior: "smooth", block: "center" });
  return true;
}

/**
 * @param {Record<number, HTMLElement | null>} pageRefs
 * @param {number} numPages
 * @param {number} preferredPage - 1-based; 0 = search all
 * @param {string} quote
 * @returns {number} page that matched, or 0
 */
export function highlightAcrossPages(pageRefs, numPages, preferredPage, quote) {
  if (!quote?.trim() || numPages < 1) return 0;

  const pages = [];
  if (preferredPage >= 1 && preferredPage <= numPages) pages.push(preferredPage);
  for (let n = 1; n <= numPages; n++) {
    if (n !== preferredPage) pages.push(n);
  }

  for (const n of pages) {
    const wrap = pageRefs[n];
    if (wrap && highlightQuoteInPageWrapper(wrap, quote)) return n;
  }
  return 0;
}

export function pageHintFromParagraphRef(ref) {
  if (ref == null) return null;
  const m = String(ref).match(/page\s*(\d+)/i);
  return m ? Number(m[1]) : null;
}
