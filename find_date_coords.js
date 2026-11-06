const fs = require('fs');
const { PDFDocument, StandardFonts, rgb } = require('./frontend/node_modules/pdf-lib');

async function findCoords() {
  const rawBuf = fs.readFileSync('source-files/ammu.pdf (3).pdf');
  const str = rawBuf.toString('latin1');
  
  // Find the internship dates text
  const dateIdx = str.indexOf('01.11.2025');
  console.log('Date text "01.11.2025" found at byte index:', dateIdx);
  
  // Look at context around it
  const contextBefore = str.slice(Math.max(0, dateIdx - 400), dateIdx);
  const contextAfter = str.slice(dateIdx, Math.min(str.length, dateIdx + 200));
  
  // Print printable chars only
  const printable = (s) => s.replace(/[\x00-\x08\x0e-\x1f\x7f-\xff]/g, '.');
  console.log('\n--- Context BEFORE ---\n');
  console.log(printable(contextBefore));
  console.log('\n--- Context AFTER ---\n');
  console.log(printable(contextAfter));
}

findCoords().catch(console.error);

