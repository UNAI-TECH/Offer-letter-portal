const fs = require('fs');
const path = require('path');

const pdfPath = path.join(__dirname, 'source-files', 'ammu.pdf (3).pdf');
const buf = fs.readFileSync(pdfPath);
const base64 = buf.toString('base64');

const outPath = path.join(__dirname, 'frontend', 'src', 'data', 'officialPdfTemplate.ts');
fs.writeFileSync(outPath, `// Official UNAI TECH Offer Letter PDF Template
export const OFFICIAL_TEMPLATE_BASE64 = "${base64}";
`);
console.log('Saved encoded PDF template to', outPath);

