// Verify base64 round-trip and check for correct year
const fs = require('fs');
const { PDFDocument } = require('./frontend/node_modules/pdf-lib');

const content = fs.readFileSync('./frontend/src/data/officialPdfTemplate.ts', 'utf8');
const start = content.indexOf('"') + 1;
const end = content.lastIndexOf('"');
const b64 = content.slice(start, end);
const buf = Buffer.from(b64, 'base64');
const str = buf.toString('latin1');

const has2026 = str.includes('01.11.2026') && str.includes('01.12.2026');
const has2025 = str.includes('01.11.2025');
console.log('Has 2026 dates:', has2026);
console.log('Has old 2025 dates:', has2025);
console.log('Base64 decodes to', buf.length, 'bytes');

PDFDocument.load(buf).then(pdf => {
  console.log('PDF loads OK, page count:', pdf.getPageCount());
}).catch(e => console.error('PDF load error:', e.message));
