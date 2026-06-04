// Client-side, deterministic PDF export of the 3-option comparison
// (EPC / PPA / EPC+Battery). Independent of the Groq LLM text path — this
// builds straight from buildProposalOptions() and opens a styled printable
// HTML table so the browser's "Save as PDF" produces a real downloadable PDF.
//
// Zero runtime deps: no jsPDF. Spanish labels, USD formatting, Solaris colors.

import { buildProposalOptions, type ProposalOption } from '@/services/proposalOptions'
import type { SolarFinancialInput } from '@/services/solarFinancials'

const fmtUsd = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)

const fmtYears = (n: number) =>
  n > 0
    ? `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(n)} años`
    : '—'

const fmtTons = (n: number) =>
  `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(n)} t`

/** Row definitions for the comparison table (Spanish labels + value getter). */
const ROWS: Array<{ label: string; value: (o: ProposalOption) => string }> = [
  { label: 'Inversión inicial', value: (o) => (o.upfront_usd > 0 ? fmtUsd(o.upfront_usd) : 'Sin inversión inicial') },
  { label: 'Ahorro anual', value: (o) => fmtUsd(o.annual_savings_usd) },
  { label: 'Recuperación (años)', value: (o) => fmtYears(o.payback_years) },
  { label: 'Ahorro 25 años', value: (o) => fmtUsd(o.savings_25yr_usd) },
  { label: 'CO₂ 25 años', value: (o) => fmtTons(o.co2_tons_25yr) },
]

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export interface ProposalPdfMeta {
  buildingName?: string
  address?: string
}

/** Build the self-contained printable HTML document for the comparison table. */
export function buildProposalPdfHtml(
  options: ProposalOption[],
  meta: ProposalPdfMeta = {},
): string {
  const title = escapeHtml(meta.buildingName?.trim() || 'Propuesta Solar')
  const subtitle = escapeHtml(meta.address?.trim() || '')
  const dateStr = new Intl.DateTimeFormat('es-PA', { dateStyle: 'long' }).format(new Date())

  const headCells = options
    .map((o) => `<th>${escapeHtml(o.label_es)}</th>`)
    .join('')

  const bodyRows = ROWS.map((row) => {
    const cells = options
      .map((o) => `<td>${escapeHtml(row.value(o))}</td>`)
      .join('')
    return `<tr><th scope="row">${escapeHtml(row.label)}</th>${cells}</tr>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title} — Solaris Panamá</title>
<style>
  :root {
    --bg: #0a0a0f;
    --ink: #1a1a2e;
    --muted: #555566;
    --accent: #00ffcc;
    --accent2: #0ea5e9;
    --line: #e2e8f0;
  }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
    color: var(--ink);
    margin: 0;
    padding: 40px;
    background: #fff;
  }
  .brand {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 3px solid var(--accent);
    padding-bottom: 16px;
    margin-bottom: 24px;
  }
  .brand .logo {
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--ink);
  }
  .brand .logo span { color: var(--accent2); }
  .brand .date { font-size: 12px; color: var(--muted); }
  h1 { font-size: 24px; margin: 0 0 4px; }
  .subtitle { font-size: 14px; color: var(--muted); margin: 0 0 28px; }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
  }
  caption {
    text-align: left;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--muted);
    padding-bottom: 10px;
  }
  thead th {
    background: var(--ink);
    color: #fff;
    padding: 14px 16px;
    text-align: right;
    font-weight: 700;
  }
  thead th:first-child {
    background: transparent;
    color: var(--muted);
    text-align: left;
  }
  tbody th[scope='row'] {
    text-align: left;
    font-weight: 600;
    color: var(--ink);
    padding: 14px 16px;
    background: #f8fafc;
    border-bottom: 1px solid var(--line);
  }
  tbody td {
    text-align: right;
    padding: 14px 16px;
    border-bottom: 1px solid var(--line);
    font-variant-numeric: tabular-nums;
  }
  tbody tr:nth-child(even) td,
  tbody tr:nth-child(even) th[scope='row'] { background: #f1f5f9; }
  .footer {
    margin-top: 28px;
    font-size: 11px;
    color: var(--muted);
    line-height: 1.6;
  }
  @media print {
    body { padding: 24px; }
    @page { margin: 16mm; }
  }
</style>
</head>
<body>
  <div class="brand">
    <div class="logo">Solar<span>is</span> Panamá</div>
    <div class="date">${escapeHtml(dateStr)}</div>
  </div>

  <h1>${title}</h1>
  ${subtitle ? `<p class="subtitle">${subtitle}</p>` : '<div style="height:12px"></div>'}

  <table>
    <caption>Comparación de opciones (USD)</caption>
    <thead>
      <tr><th>Concepto</th>${headCells}</tr>
    </thead>
    <tbody>
      ${bodyRows}
    </tbody>
  </table>

  <p class="footer">
    Cifras estimadas en dólares (USD) para una instalación en Panamá. Los valores de
    ahorro, recuperación y reducción de CO₂ son proyecciones a 25 años basadas en el
    tamaño del sistema y las horas solares pico del techo analizado. Documento generado
    automáticamente por Solaris Panamá.
  </p>

  <script>
    window.addEventListener('load', function () {
      window.focus();
      window.print();
    });
  </script>
</body>
</html>`
}

/**
 * Opens a new window with the printable comparison table and triggers the
 * browser's print dialog (Save as PDF). Deterministic — no network, no LLM.
 */
export function downloadProposalPdf(
  base: SolarFinancialInput,
  meta: ProposalPdfMeta = {},
): void {
  const options = buildProposalOptions(base)
  const html = buildProposalPdfHtml(options, meta)

  const win = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1000')
  if (!win) {
    // Pop-up blocked — fall back to a same-tab blob so the user still gets the file.
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank', 'noopener')
    return
  }
  win.document.open()
  win.document.write(html)
  win.document.close()
}
