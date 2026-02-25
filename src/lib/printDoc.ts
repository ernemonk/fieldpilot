/**
 * Opens a print/save-as-PDF window with the given HTML content styled for documents.
 * The caller should pass `containerRef.current?.innerHTML ?? ''` as bodyHtml.
 */
export function printDocument(title: string, bodyHtml: string) {
  const w = window.open('', '_blank', 'width=880,height=700');
  if (!w) {
    alert('Please allow popups in your browser, then click Print again.');
    return;
  }
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  w.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Georgia, 'Times New Roman', serif;
      max-width: 750px;
      margin: 40px auto;
      padding: 0 24px 60px;
      color: #111827;
      line-height: 1.7;
      font-size: 14px;
    }
    .doc-header { border-bottom: 2px solid #111827; padding-bottom: 14px; margin-bottom: 28px; }
    .doc-header h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
    .doc-header p  { color: #6b7280; font-size: 12px; }
    h1 { font-size: 20px; font-weight: 700; margin-top: 28px; margin-bottom: 10px; }
    h2 { font-size: 16px; font-weight: 600; margin-top: 24px; margin-bottom: 8px; color: #1f2937; }
    h3 { font-size: 14px; font-weight: 600; margin-top: 18px; margin-bottom: 6px; }
    h4 { font-size: 13px; font-weight: 600; margin-top: 14px; margin-bottom: 4px; }
    p  { margin-bottom: 10px; }
    ul, ol { padding-left: 22px; margin-bottom: 10px; }
    li { margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 13px; }
    th, td { border: 1px solid #d1d5db; padding: 7px 11px; text-align: left; }
    th { background: #f9fafb; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 22px 0; }
    blockquote { border-left: 3px solid #9ca3af; margin: 14px 0; padding-left: 16px; color: #6b7280; font-style: italic; }
    code { background: #f3f4f6; padding: 2px 5px; border-radius: 3px; font-family: 'Courier New', monospace; font-size: 0.88em; }
    pre  { background: #f3f4f6; padding: 14px; border-radius: 6px; overflow-x: auto; margin: 14px 0; }
    pre code { background: none; padding: 0; }
    strong { font-weight: 700; }
    em { font-style: italic; }
    @media print {
      body { margin: 0; max-width: none; }
      .doc-header { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="doc-header">
    <h1>${escapeHtml(title)}</h1>
    <p>Generated on ${date}</p>
  </div>
  ${bodyHtml}
</body>
</html>`);
  w.document.close();
  // Small delay lets the browser finish rendering before the print dialog opens
  setTimeout(() => { w.focus(); w.print(); }, 450);
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
