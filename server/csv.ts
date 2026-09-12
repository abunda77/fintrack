/**
 * Pembuatan CSV yang aman dari formula injection (PRD pasal 14).
 * Field yang diawali karakter berbahaya (=, +, -, @, tab, CR) diawali tanda kutip.
 */
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export function sanitizeCsvField(value: unknown): string {
  const raw = value === null || value === undefined ? "" : String(value);
  const prefix = FORMULA_PREFIX.test(raw) ? "'" : "";
  const escaped = raw.replace(/"/g, '""');
  return prefix + escaped;
}

export interface CsvRow {
  [key: string]: unknown;
}

export function buildCsv(headers: string[], rows: CsvRow[]): string {
  const headerLine = headers.map(sanitizeCsvField).join(",");
  const body = rows.map((row) =>
    headers.map((h) => `"${sanitizeCsvField(row[h])}"`).join(","),
  );
  // BOM agar Excel mengenali UTF-8.
  return "﻿" + [headerLine, ...body].join("\r\n") + "\r\n";
}