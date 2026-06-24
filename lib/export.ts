// ---------------------------------------------------------------------------
// Client-side export helpers. Zero dependencies — CSV and Excel (.xls via the
// HTML-table trick that Excel opens natively) downloads, plus print-to-PDF.
// ---------------------------------------------------------------------------

export type Cell = string | number | null | undefined;
export type Row = Cell[];

function escapeCsv(value: Cell): string {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportCsv(filename: string, headers: string[], rows: Row[]) {
  const lines = [headers, ...rows].map((r) => r.map(escapeCsv).join(","));
  // Prepend BOM so Excel renders UTF-8 (accents) correctly.
  const blob = new Blob(["﻿" + lines.join("\r\n")], {
    type: "text/csv;charset=utf-8;",
  });
  download(blob, filename.endsWith(".csv") ? filename : `${filename}.csv`);
}

function escapeHtml(value: Cell): string {
  const s = value == null ? "" : String(value);
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Excel export without a library: a styled HTML table served with the legacy
 * Excel mime type. Excel, Numbers and Google Sheets all import it cleanly.
 */
export function exportExcel(
  filename: string,
  headers: string[],
  rows: Row[],
  sheetName = "Report",
) {
  const head = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("");
  const body = rows
    .map(
      (r) =>
        `<tr>${r
          .map((c) => `<td>${escapeHtml(c)}</td>`)
          .join("")}</tr>`,
    )
    .join("");
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>${escapeHtml(
    sheetName,
  )}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--><style>th{background:#4f46e5;color:#fff;text-align:left;padding:6px 10px;font-family:sans-serif}td{padding:5px 10px;border:1px solid #e5e7eb;font-family:sans-serif}</style></head><body><table>${`<tr>${head}</tr>`}${body}</table></body></html>`;
  const blob = new Blob(["﻿" + html], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });
  download(blob, filename.endsWith(".xls") ? filename : `${filename}.xls`);
}

/**
 * Print-to-PDF: opens a clean print window with the given report HTML and
 * triggers the browser's native "Save as PDF". Keeps zero dependencies while
 * giving a polished, branded document.
 */
export function exportPdf(title: string, bodyHtml: string) {
  const w = window.open("", "_blank", "width=900,height=1200");
  if (!w) return;
  const date = new Date().toLocaleDateString("en", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(
    title,
  )}</title><style>
    *{box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#18181b;margin:0;padding:48px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    header{display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #4f46e5;padding-bottom:16px;margin-bottom:28px}
    .brand{display:flex;align-items:center;gap:10px;font-weight:700;font-size:15px}
    .logo{width:26px;height:26px;border-radius:7px;background:#4f46e5;color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px}
    h1{font-size:22px;margin:0 0 4px}
    .muted{color:#71717a;font-size:13px}
    h2{font-size:15px;margin:28px 0 10px;border-bottom:1px solid #e5e7eb;padding-bottom:6px}
    table{width:100%;border-collapse:collapse;font-size:12.5px;margin:8px 0 16px}
    th{background:#f4f4f5;text-align:left;padding:8px 10px;font-weight:600;border-bottom:1px solid #e5e7eb}
    td{padding:7px 10px;border-bottom:1px solid #f1f1f3}
    .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:8px 0}
    .stat{border:1px solid #e5e7eb;border-radius:10px;padding:12px}
    .stat .k{font-size:11px;color:#71717a}
    .stat .v{font-size:20px;font-weight:700;margin-top:2px}
    footer{margin-top:40px;border-top:1px solid #e5e7eb;padding-top:12px;color:#a1a1aa;font-size:11px;display:flex;justify-content:space-between}
    @media print{body{padding:24px}}
  </style></head><body>
    <header>
      <div class="brand"><span class="logo">M</span> Merqueo MOS</div>
      <div class="muted">${date}</div>
    </header>
    ${bodyHtml}
    <footer><span>Marketing Operating System</span><span>Confidential · Merqueo Tires</span></footer>
  </body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 350);
}

export function htmlTable(headers: string[], rows: Row[]): string {
  const head = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("");
  const body = rows
    .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`)
    .join("");
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

export function statGrid(stats: { k: string; v: Cell }[]): string {
  return `<div class="grid">${stats
    .map(
      (s) =>
        `<div class="stat"><div class="k">${escapeHtml(
          s.k,
        )}</div><div class="v">${escapeHtml(s.v)}</div></div>`,
    )
    .join("")}</div>`;
}
