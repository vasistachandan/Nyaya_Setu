import { useCallback, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

function truncateSearchText(raw) {
  if (raw == null || raw === "") return "";
  const s = String(raw).trim();
  return s.length > 60 ? s.slice(0, 60) : s;
}

/**
 * @param {{ pdfUrl: string, searchText: string | null | undefined }} props
 */
export default function PDFViewer({ pdfUrl, searchText }) {
  const containerRef = useRef(null);
  const [numPages, setNumPages] = useState(0);
  const searchTextRef = useRef(searchText);

  useEffect(() => {
    searchTextRef.current = searchText;
  }, [searchText]);

  const highlightMultiSpan = useCallback((root, rawText) => {
    const text = truncateSearchText(rawText);
    if (!text || !root) return;

    const spans = Array.from(root.querySelectorAll(".react-pdf__Page__textContent span"));
    if (!spans.length) return;

    const fullText = spans.map((s) => s.textContent || "").join(" ");
    const lowerFull = fullText.toLowerCase();
    const lowerSearch = text.toLowerCase();
    const searchIdx = lowerFull.indexOf(lowerSearch);
    if (searchIdx < 0) return;

    let charCount = 0;
    let scrolled = false;
    const searchEnd = searchIdx + text.length;

    for (const span of spans) {
      const len = (span.textContent || "").length;
      const start = charCount;
      const end = charCount + len;
      if (start <= searchEnd && end >= searchIdx) {
        span.classList.add("highlighted");
        if (!scrolled) {
          span.scrollIntoView({ behavior: "smooth", block: "center" });
          scrolled = true;
        }
      }
      charCount += len + 1;
    }
  }, []);

  const highlightTextInLayer = useCallback(
    (rawText) => {
      const root = containerRef.current;
      if (!root) return;

      const text = truncateSearchText(rawText);
      const spans = root.querySelectorAll(".react-pdf__Page__textContent span");
      spans.forEach((span) => span.classList.remove("highlighted"));

      if (!text) return;

      const lowerSearch = text.toLowerCase();
      let scrolled = false;
      let anySimple = false;

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

      if (!anySimple) {
        highlightMultiSpan(root, rawText);
      }
    },
    [highlightMultiSpan],
  );

  const handlePageRender = useCallback(() => {
    highlightTextInLayer(searchTextRef.current);
  }, [highlightTextInLayer]);

  useEffect(() => {
    highlightTextInLayer(searchText);
  }, [searchText, highlightTextInLayer]);

  return (
    <div ref={containerRef} className="pdf-viewer-root h-full min-h-0 overflow-auto">
      <Document
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
