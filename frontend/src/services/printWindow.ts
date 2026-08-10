type PrintWindowOptions = {
  title: string;
  heading: string;
  html: string;
  direction: 'rtl' | 'ltr';
  width?: number;
  height?: number;
  extraStyles?: string;
};

export function openPrintableWindow({
  title,
  heading,
  html,
  direction,
  width = 1100,
  height = 760,
  extraStyles = '',
}: PrintWindowOptions): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const printWindow = window.open('', '_blank', `width=${width},height=${height}`);
  if (!printWindow) {
    return false;
  }

  printWindow.document.write(`
    <!doctype html>
    <html lang="${direction === 'rtl' ? 'he' : 'en'}" dir="${direction}">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 24px;
            font-family: Assistant, sans-serif;
            background: #fff;
            color: #1f2a22;
          }
          .harvest-print__title {
            margin: 0 auto 12px;
            max-width: 1180px;
            text-align: center;
            font-size: 22px;
            font-weight: 800;
            color: #1f4f29;
          }
          .harvest-print__content {
            max-width: 1180px;
            margin: 0 auto;
            display: block;
          }
          tr, td, th {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          ${extraStyles}
        </style>
      </head>
      <body>
        <h1 class="harvest-print__title">${heading}</h1>
        <div class="harvest-print__content">${html}</div>
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
  return true;
}