// Script to visually calibrate the y-coordinate of the internship dates line in the template PDF
// We'll generate a test PDF with colored markers to identify the exact position

const fs = require('fs');
const { PDFDocument, StandardFonts, rgb } = require('./frontend/node_modules/pdf-lib');

async function calibrate() {
  const templateBuffer = fs.readFileSync('source-files/ammu.pdf (3).pdf');
  const pdfDoc = await PDFDocument.load(templateBuffer);
  const page = pdfDoc.getPages()[0];
  const { width, height } = page.getSize();
  const yOffset = 7.83;
  
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  
  console.log('Page height:', height, 'yOffset:', yOffset);
  
  // The internship dates line is in the internship details section.
  // Known y positions (in PDF coordinate system from top of page, converted for pdf-lib which uses bottom-left):
  // Let's draw red boxes at several y positions to identify the exact line
  
  // Known calibrations from previous work:
  // - Dear line: y=212.89 from top → y = height - 212.89 + yOffset
  // - Subject: y=239.15 from top
  // - College paragraph lines: y=306.28, y=324.29 from top
  // - Domain details: y=505.51 from top
  
  // The internship dates text is in the body paragraph below college info
  // Let's try several y values in the 340-450 range
  
  const testYValues = [340, 355, 370, 385, 400, 415, 430, 445, 460, 475, 490];
  
  testYValues.forEach((yFromTop, i) => {
    const yPdf = height - yFromTop + yOffset;
    page.drawRectangle({
      x: 56,
      y: yPdf - 2,
      width: 490,
      height: 2,
      color: rgb(1, 0, 0),
      opacity: 0.5,
    });
    page.drawText(`y=${yFromTop}`, {
      x: 10,
      y: yPdf,
      size: 6,
      font: timesRoman,
      color: rgb(1, 0, 0),
    });
  });
  
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync('docs/calibration_dates.pdf', pdfBytes);
  console.log('Calibration PDF saved to docs/calibration_dates.pdf');
}

calibrate().catch(console.error);

