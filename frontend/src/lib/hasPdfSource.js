/**
 * True when extraction included a PDF pointer (verbatim quote and/or page) for this field.
 * @param {{ page?: number, quote?: string } | null | undefined} src
 */
export function hasPdfSourceRef(src) {
  if (!src || typeof src !== "object") return false;
  const quote = String(src.quote ?? "").trim();
  const page = src.page != null ? Number(src.page) : 0;
  return quote.length >= 3 || page > 0;
}
