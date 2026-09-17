// Minimal quote-aware CSV parser — good enough for the small, flat files this app reads (no
// need to pull in a library for this). Handles quoted fields, escaped `""`, and commas/newlines
// inside quotes.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((v) => v !== "")) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.some((v) => v !== "")) rows.push(row);
  }
  return rows;
}

/** Parses a CSV with a header row into objects keyed by the (trimmed, lowercased) header. */
export function parseCsvWithHeader(text: string): Record<string, string>[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const [header, ...rest] = rows;
  const keys = (header ?? []).map((h) => h.trim().toLowerCase());
  return rest.map((row) => {
    const obj: Record<string, string> = {};
    keys.forEach((key, i) => {
      obj[key] = (row[i] ?? "").trim();
    });
    return obj;
  });
}
