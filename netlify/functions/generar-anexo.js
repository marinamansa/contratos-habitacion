const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

exports.handler = async function(event) {
  if(event.httpMethod !== 'POST'){
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const SUPABASE_URL = 'https://kyrjqbautyklefhqzqbo.supabase.co';

  try {
    const { hnum, inquilino, fecha, firma_arrendador, firma_inquilino } = JSON.parse(event.body);
    if(!hnum || !inquilino || !fecha){
      return { statusCode: 400, body: JSON.stringify({ error: 'Faltan datos' }) };
    }

    // Fetch PDF from Supabase Storage
    const pdfUrl = `${SUPABASE_URL}/storage/v1/object/public/anexos/anexo-${hnum}.pdf`;
    const pdfRes = await fetch(pdfUrl);
    if(!pdfRes.ok) throw new Error('No se pudo cargar el anexo');
    const pdfBytes = await pdfRes.arrayBuffer();

    // Load and modify PDF
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pages = pdfDoc.getPages();
    const page = pages[pages.length - 1]; // last page has signature block
    const firstPage = pages[0];
    const { height } = firstPage.getSize(); // 841.92

    const fontSize = 11;
    // Align text to baseline of each line (top=194.2, bottom=206.2 → baseline ≈ height - bottom + 2)
    const inquilinoX = 215;
    const inquilinoY = height - 204.5;
    const fechaX = 125;
    const fechaY = height - 221.5;

    firstPage.drawText(inquilino, { x: inquilinoX, y: inquilinoY, size: fontSize, font: fontBold, color: rgb(0,0,0) });
    firstPage.drawText(fecha,     { x: fechaX,     y: fechaY,     size: fontSize, font: fontBold, color: rgb(0,0,0) });

    // Signature block coordinates per room (pdfplumber top coords → pdf-lib y = height - top)
    // Rooms 1 and 3 have no signature block in PDF → we add labels manually
    const sigConfig = {
      '1': null, // no block, we'll add it
      '2': { labelTop: 400.9, leftX: 87.5,  rightX: 370.4 },
      '3': null,
      '4': { labelTop: 452.7, leftX: 85.1,  rightX: 384.8 }
    };

    const { width: pageWidth, height: pageHeight } = page.getSize();
    const fontNormal = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const sigWidth = 160;
    const sigHeight = 55;

    let labelY, leftX, rightX;
    const cfg = sigConfig[String(hnum)];

    if(cfg) {
      // Position signatures above existing label
      labelY = pageHeight - cfg.labelTop;
      leftX = cfg.leftX;
      rightX = cfg.rightX;
    } else {
      // Add label + signatures near bottom of last page
      labelY = 100;
      leftX = 85;
      rightX = pageWidth / 2 + 20;
      // Draw labels
      page.drawText('Firma Arrendador', { x: leftX, y: labelY - 15, size: 11, font: fontBold, color: rgb(0,0,0) });
      page.drawText('Firma Arrendatario/a', { x: rightX, y: labelY - 15, size: 11, font: fontBold, color: rgb(0,0,0) });
    }

    if(firma_arrendador) {
      const base64Data = firma_arrendador.replace(/^data:image\/png;base64,/, '');
      const imgBytes = Buffer.from(base64Data, 'base64');
      const img = await pdfDoc.embedPng(imgBytes);
      page.drawImage(img, { x: leftX, y: labelY + 5, width: sigWidth, height: sigHeight });
    }

    if(firma_inquilino) {
      const base64Data = firma_inquilino.replace(/^data:image\/png;base64,/, '');
      const imgBytes = Buffer.from(base64Data, 'base64');
      const img = await pdfDoc.embedPng(imgBytes);
      page.drawImage(img, { x: rightX, y: labelY + 5, width: sigWidth, height: sigHeight });
    }

    const modifiedPdfBytes = await pdfDoc.save();
    const base64 = Buffer.from(modifiedPdfBytes).toString('base64');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ pdf: base64 })
    };
  } catch(e) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: e.message })
    };
  }
};

