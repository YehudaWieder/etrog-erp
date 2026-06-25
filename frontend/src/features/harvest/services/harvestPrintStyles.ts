export const HARVEST_PRINT_BASE_STYLE = `
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 22px;
    font-family: Assistant, sans-serif;
    color: #1f2a22;
    background: #fff;
  }
  h1 {
    margin: 0 0 14px;
    font-size: 22px;
    color: #1f4f29;
    text-align: center;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: auto;
    font-size: 10px;
  }
  th,
  td {
    border: 1px solid #ccd9cf;
    padding: 5px;
    text-align: center;
    white-space: nowrap;
  }
  th {
    background: #1f5a32;
    color: #fff;
    font-weight: 700;
  }
  tbody tr:nth-child(even) {
    background: #f8fcf9;
  }
  @page {
    size: A4 landscape;
    margin: 8mm;
  }
`;

export const HARVEST_DETAILS_PRINT_EXTRA_STYLES = `
  .harvest-daily-workspace__print-content {
    max-width: 1180px;
    margin: 0 auto;
    display: block;
  }
  .harvest-daily-workspace__sheet-card {
    border: 1px solid #cfdcd2;
    border-radius: 12px;
    background: #fff;
    padding: 12px;
    margin-bottom: 14px;
    display: grid;
    gap: 12px;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .harvest-daily-workspace__sheet-head {
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: stretch;
    direction: ltr;
    text-align: left;
    color: #243f2b;
    font-weight: 600;
  }
  .harvest-daily-workspace__sheet-head p {
    margin: 0;
    width: 100%;
    max-width: 100%;
    direction: inherit;
    unicode-bidi: plaintext;
  }
  html[dir='rtl'] .harvest-daily-workspace__sheet-head {
    direction: rtl;
    text-align: right;
  }
  .harvest-daily-workspace__sheet-status {
    justify-self: center;
    border: 1px solid #b7cdbf;
    background: #f1f8f3;
    color: #1f4f29;
    font-weight: 800;
    padding: 4px 12px;
    border-radius: 999px;
  }
  .harvest-daily-workspace__sheet-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 12px;
  }
  .harvest-daily-workspace__sheet-table th,
  .harvest-daily-workspace__sheet-table td {
    border: 1px solid #ccd9cf;
    padding: 6px;
    text-align: center;
    vertical-align: middle;
  }
  .harvest-daily-workspace__sheet-table th {
    background: #f1f7f3;
    color: #284f31;
    font-weight: 700;
    white-space: nowrap;
  }
  .harvest-daily-workspace__sheet-row--summary {
    background: #e7f2eb !important;
  }
  .harvest-daily-workspace__sheet-row--summary td {
    font-weight: 800;
    color: #1f4f29;
  }
  .harvest-daily-workspace__sheet-note {
    margin: 0;
    color: #2f4536;
    line-height: 1.45;
    border-top: 1px dashed #d0dcd3;
    padding-top: 8px;
  }
  .harvest-daily-workspace__related-sortings-card {
    border-radius: 12px;
    background: #fff;
    padding: 12px;
    display: grid;
    gap: 10px;
  }
  .harvest-daily-workspace__related-sortings-title {
    margin: 0;
    color: #214f2a;
    font-size: 16px;
  }
  .harvest-daily-workspace__related-sortings-table-wrap {
    overflow: visible;
  }
  .harvest-daily-workspace__related-sortings-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 12px;
  }
  .harvest-daily-workspace__related-sortings-table th,
  .harvest-daily-workspace__related-sortings-table td {
    border: 1px solid #ccd9cf;
    padding: 6px;
    text-align: center;
    vertical-align: middle;
  }
  .harvest-daily-workspace__related-sortings-table th {
    background: #f1f7f3;
    color: #284f31;
    font-weight: 700;
  }
  .harvest-daily-workspace__related-sortings-table tbody tr:nth-child(even) {
    background: #f8fcf9;
  }
  .harvest-daily-workspace__related-sorting-note {
    display: inline;
  }
  .harvest-daily-workspace__related-sorting-note-bubble,
  .harvest-daily-workspace__related-sorting-note-tooltip {
    display: none !important;
  }
  .harvest-daily-workspace__related-sorting-note::after {
    content: attr(aria-label);
    color: #2f4536;
    white-space: pre-wrap;
  }
`;

export const HARVEST_FIELD_REPORT_DETAILS_PRINT_EXTRA_STYLES = `
  .harvest-daily-workspace__sheet-card {
    border: 1px solid #cfdcd2;
    border-radius: 12px;
    background: #fff;
    padding: 12px;
    display: grid;
    gap: 12px;
  }
  .harvest-daily-workspace__sheet-head {
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: stretch;
    direction: ltr;
    text-align: left;
    color: #243f2b;
    font-weight: 600;
  }
  .harvest-daily-workspace__sheet-head p {
    margin: 0;
    width: 100%;
    max-width: 100%;
    direction: inherit;
    unicode-bidi: plaintext;
  }
  html[dir='rtl'] .harvest-daily-workspace__sheet-head {
    direction: rtl;
    text-align: right;
  }
  .harvest-daily-workspace__sheet-status {
    justify-self: center;
    border: 1px solid #b7cdbf;
    background: #f1f8f3;
    color: #1f4f29;
    font-weight: 800;
    padding: 4px 12px;
    border-radius: 999px;
  }
  .harvest-daily-workspace__sheet-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 12px;
  }
  .harvest-daily-workspace__sheet-table th,
  .harvest-daily-workspace__sheet-table td {
    border: 1px solid #ccd9cf;
    padding: 6px;
    text-align: center;
    vertical-align: middle;
  }
  .harvest-daily-workspace__sheet-table th {
    background: #f1f7f3;
    color: #284f31;
    font-weight: 700;
    white-space: nowrap;
  }
  .harvest-daily-workspace__sheet-table th:first-child,
  .harvest-daily-workspace__sheet-table td:first-child {
    font-weight: 700;
    background: #f6fbf8;
    min-width: 88px;
  }
  .harvest-daily-workspace__sheet-table tbody tr:nth-child(even) {
    background: #f8fcf9;
  }
  .harvest-daily-workspace__related-sortings-card {
    border-radius: 12px;
    background: #fff;
    padding: 12px;
    display: grid;
    gap: 10px;
  }
  .harvest-daily-workspace__related-sortings-title {
    margin: 0;
    color: #214f2a;
    font-size: 16px;
  }
  .harvest-daily-workspace__related-sortings-table-wrap {
    overflow: visible;
  }
  .harvest-daily-workspace__related-sortings-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 12px;
  }
  .harvest-daily-workspace__related-sortings-table th,
  .harvest-daily-workspace__related-sortings-table td {
    border: 1px solid #ccd9cf;
    padding: 6px;
    text-align: center;
    vertical-align: middle;
  }
  .harvest-daily-workspace__related-sortings-table th {
    background: #f1f7f3;
    color: #284f31;
    font-weight: 700;
  }
  .harvest-daily-workspace__related-sortings-table tbody tr:nth-child(even) {
    background: #f8fcf9;
  }
  .harvest-daily-workspace__related-sorting-note {
    display: inline;
  }
  .harvest-daily-workspace__related-sorting-note-bubble,
  .harvest-daily-workspace__related-sorting-note-tooltip {
    display: none !important;
  }
  .harvest-daily-workspace__related-sorting-note::after {
    content: attr(aria-label);
    color: #2f4536;
    white-space: pre-wrap;
  }
  .global-left-details-panel {
    position: static !important;
    transform: none !important;
    width: 100% !important;
    min-width: 0 !important;
    height: auto !important;
    box-shadow: none !important;
    border: 1px solid #d2ded6;
  }
  .global-left-details-panel__header-actions,
  .global-left-details-panel__close {
    display: none !important;
  }
  .global-left-details-panel__body {
    overflow: visible !important;
  }
  .global-data-table__viewport {
    overflow: visible !important;
  }
  .global-data-table__header,
  .global-data-table__body,
  .global-data-table__row {
    width: 100% !important;
    min-width: 0 !important;
  }
`;

export const HARVEST_SORTING_DAILY_DETAILS_PRINT_EXTRA_STYLES = `
  .harvest-daily-workspace__print-content {
    max-width: 1180px;
    margin: 0 auto;
    display: block;
  }
  .harvest-daily-workspace__sheet-card {
    border: 1px solid #cfdcd2;
    border-radius: 12px;
    background: #fff;
    padding: 12px;
    margin-bottom: 14px;
    display: grid;
    gap: 12px;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .harvest-daily-workspace__sheet-card--borderless {
    border: 0;
    border-radius: 0;
    background: transparent;
    padding: 0;
  }
  .harvest-daily-workspace__sheet-card--category-breakdown::before {
    content: '';
    display: block;
    width: 100%;
    border-top: 1px solid #d4dfd7;
    margin-bottom: 12px;
  }
  .harvest-daily-workspace__sheet-head {
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: stretch;
    direction: ltr;
    text-align: left;
    color: #243f2b;
    font-weight: 600;
  }
  .harvest-daily-workspace__sheet-head p {
    margin: 0;
    width: 100%;
    max-width: 100%;
    direction: inherit;
    unicode-bidi: plaintext;
  }
  html[dir='rtl'] .harvest-daily-workspace__sheet-head {
    direction: rtl;
    text-align: right;
  }
  .harvest-daily-workspace__sheet-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 12px;
  }
  .harvest-daily-workspace__sheet-table th,
  .harvest-daily-workspace__sheet-table td {
    border: 1px solid #ccd9cf;
    padding: 6px;
    text-align: center;
    vertical-align: middle;
  }
  .harvest-daily-workspace__sheet-table th {
    background: #f1f7f3;
    color: #284f31;
    font-weight: 700;
    white-space: nowrap;
  }
  .harvest-daily-workspace__sheet-row--summary {
    background: #e7f2eb !important;
  }
  .harvest-daily-workspace__sheet-row--summary td {
    font-weight: 800;
    color: #1f4f29;
  }
  .harvest-daily-workspace__related-sortings-title {
    margin: 0;
    color: #214f2a;
    font-size: 16px;
  }
`;
