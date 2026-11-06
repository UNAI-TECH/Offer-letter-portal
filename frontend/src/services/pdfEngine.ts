import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { OFFICIAL_TEMPLATE_BASE64 } from '../data/officialPdfTemplate';

export interface GeneratePdfOptions {
  participantName: string;
  collegeName: string;
  domainName: string;
  issueDate?: string;
  customTemplateBase64?: string;
}

/**
 * Pixel-perfect client/server PDF generation engine using pdf-lib.
 * Calibrated against ammu.pdf (3).pdf with exact MediaBox offset (7.83 pt).
 */
export async function generateOfferLetterPdf({
  participantName,
  collegeName,
  domainName,
  issueDate = '01 November 2026',
  customTemplateBase64,
}: GeneratePdfOptions): Promise<Uint8Array> {
  const base64Data = customTemplateBase64 || OFFICIAL_TEMPLATE_BASE64;
  
  // Convert base64 to Uint8Array
  const binaryString = atob(base64Data);
  const templateBytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    templateBytes[i] = binaryString.charCodeAt(i);
  }

  const pdfDoc = await PDFDocument.load(templateBytes);
  
  // Set official document metadata (replaces original 'ammu.pdf' browser tab title)
  pdfDoc.setTitle('UNAITECH_OFFER LETTER');
  pdfDoc.setAuthor('UNAI TECH Pvt. Ltd.');
  pdfDoc.setSubject('Official Internship Offer Letter');
  pdfDoc.setCreator('UNAI TECH Official Portal');
  pdfDoc.setProducer('UNAI TECH Document Engine');

  const page = pdfDoc.getPages()[0];
  const { height } = page.getSize();

  // MediaBox offset calibration for ammu.pdf (mediaBox.y0 = 7.83)
  const yOffset = 7.83;

  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  // 1. Participant name
  // Context: 'Dear {participant name}'
  // Original Bounding Box: x0=87.62, y0=212.89, x1=183.08, y1=224.90
  const maxNameWidth = 340;
  let nameFontSize = 12.0;
  const measuredNameWidth = timesRomanBold.widthOfTextAtSize(participantName, nameFontSize);
  if (measuredNameWidth > maxNameWidth) {
    nameFontSize = (maxNameWidth / measuredNameWidth) * 12.0;
    if (nameFontSize < 8.5) nameFontSize = 8.5;
  }

  // Cover original placeholder {participant name} with clean white rectangle
  page.drawRectangle({
    x: 87.0,
    y: height - 224.90 + yOffset,
    width: 98,
    height: 12.5,
    color: rgb(1, 1, 1),
  });
  // Draw verified participant name
  page.drawText(participantName, {
    x: 87.62,
    y: height - 221.50 + yOffset,
    size: nameFontSize,
    font: timesRomanBold,
    color: rgb(0, 0, 0),
  });

  // 2. Date: Right aligned section
  // Context: '{date}' at x0=454.31, y0=212.89, x1=485.68, y1=224.90
  page.drawRectangle({
    x: 453.0,
    y: height - 224.90 + yOffset,
    width: 35,
    height: 12.5,
    color: rgb(1, 1, 1),
  });
  page.drawText(issueDate, {
    x: 442.0,
    y: height - 221.50 + yOffset,
    size: 12.0,
    font: timesRomanBold,
    color: rgb(0, 0, 0),
  });

  // 3. College Name & Body Paragraph Reflow
  // Original paragraph lines:
  // Line 3: 'currently pursuing your studies at {College Name} and appreciate your interest in gaining'
  // Line 4: 'practical knowledge and professional experience with our organization.'
  // Cover Line 3 and Line 4 with a clean white rectangle
  page.drawRectangle({
    x: 58.0,
    y: height - 328.00 + yOffset,
    width: 496.0,
    height: 31.0,
    color: rgb(1, 1, 1),
  });

  const fullParagraphText = `currently pursuing your studies at ${collegeName.trim()} and appreciate your interest in gaining practical knowledge and professional experience with our organization.`;
  const words = fullParagraphText.split(/\s+/);
  const targetWidth = 551.93 - 58.88; // 493.05 pt

  let collegeFontSize = 12.0;

  function wrapText(fontSize: number): string[][] {
    const lines: string[][] = [];
    let currentLine: string[] = [];
    for (const w of words) {
      const testLine = [...currentLine, w].join(' ');
      if (timesRoman.widthOfTextAtSize(testLine, fontSize) <= targetWidth) {
        currentLine.push(w);
      } else {
        if (currentLine.length > 0) lines.push(currentLine);
        currentLine = [w];
      }
    }
    if (currentLine.length > 0) lines.push(currentLine);
    return lines;
  }

  let wrappedLines = wrapText(collegeFontSize);
  while (wrappedLines.length > 2 && collegeFontSize > 10.0) {
    collegeFontSize -= 0.5;
    wrappedLines = wrapText(collegeFontSize);
  }

  const yLine3 = height - 306.28 + yOffset;
  const yLine4 = height - 324.29 + yOffset;
  const baselines = [yLine3, yLine4];

  for (let lineIdx = 0; lineIdx < wrappedLines.length; lineIdx++) {
    const lineWords = wrappedLines[lineIdx];
    const yPos = baselines[lineIdx] ?? (yLine4 - (lineIdx - 1) * 18.0);

    // If it's the first line and not the last line, apply justification to match the original document
    if (lineIdx === 0 && wrappedLines.length > 1 && lineWords.length > 1) {
      const naturalWidth = timesRoman.widthOfTextAtSize(lineWords.join(' '), collegeFontSize);
      const spaceToDistribute = targetWidth - naturalWidth;
      const extraPerGap = spaceToDistribute / (lineWords.length - 1);

      let curX = 58.88;
      for (let wIdx = 0; wIdx < lineWords.length; wIdx++) {
        page.drawText(lineWords[wIdx], {
          x: curX,
          y: yPos,
          size: collegeFontSize,
          font: timesRoman,
          color: rgb(0, 0, 0),
        });
        curX +=
          timesRoman.widthOfTextAtSize(lineWords[wIdx], collegeFontSize) +
          timesRoman.widthOfTextAtSize(' ', collegeFontSize) +
          extraPerGap;
      }
    } else {
      // Last line: left-aligned at x = 58.88, matching original template
      page.drawText(lineWords.join(' '), {
        x: 58.88,
        y: yPos,
        size: collegeFontSize,
        font: timesRoman,
        color: rgb(0, 0, 0),
      });
    }
  }

  // 4. Domain in Subject line
  // Context: 'Subject: Acceptance for Internship in {domain}'
  // Original Bounding Box: x0=249.91, y0=239.15, x1=296.77, y1=251.16
  page.drawRectangle({
    x: 249.0,
    y: height - 251.16 + yOffset,
    width: 50,
    height: 12.5,
    color: rgb(1, 1, 1),
  });
  page.drawText(domainName, {
    x: 249.91,
    y: height - 247.76 + yOffset,
    size: 12.0,
    font: timesRomanBold,
    color: rgb(0, 0, 0),
  });

  // 5. Domain in Internship Details section
  // Context: 'Domain: {domain}'
  // Original Bounding Box: x0=126.71, y0=505.51, x1=177.22, y1=517.52
  page.drawRectangle({
    x: 126.0,
    y: height - 517.52 + yOffset,
    width: 52,
    height: 12.5,
    color: rgb(1, 1, 1),
  });
  page.drawText(domainName, {
    x: 126.71,
    y: height - 514.12 + yOffset,
    size: 12.0,
    font: timesRoman,
    color: rgb(0, 0, 0),
  });

  return await pdfDoc.save();
}

