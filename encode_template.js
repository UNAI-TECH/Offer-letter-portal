// Re-encode the updated template PDF to Base64 and write officialPdfTemplate.ts
const fs = require('fs');
const path = require('path');

const templatePath = path.join(__dirname, 'source-files', 'ammu.pdf (3).pdf');
const outputPath = path.join(__dirname, 'frontend', 'src', 'data', 'officialPdfTemplate.ts');

const buf = fs.readFileSync(templatePath);
const base64 = buf.toString('base64');

const content = `// AUTO-GENERATED – do not edit manually.
// Source: source-files/ammu.pdf (3).pdf
// Updated: internship dates changed from 2025 → 2026 (01.11.2026 – 01.12.2026)
export const OFFICIAL_TEMPLATE_BASE64 = "${base64}";
`;

fs.writeFileSync(outputPath, content, 'utf8');
console.log('Written', outputPath);
console.log('Base64 length:', base64.length, 'chars');
console.log('Source file size:', buf.length, 'bytes');
