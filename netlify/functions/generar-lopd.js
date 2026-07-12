const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

exports.handler = async function(event) {
  if(event.httpMethod !== 'POST'){
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const SUPABASE_URL = 'https://kyrjqbautyklefhqzqbo.supabase.co';

  try {
    const {
      cedente_nombre, cedente_nif,
      cesionario1_nombre, cesionario1_nif,
      cesionario2_nombre, cesionario2_nif,
      firma_inquilino, firma_arrendador
    } = JSON.parse(event.body);

    // Fetch PDF from Supabase Storage
    const pdfUrl = `${SUPABASE_URL}/storage/v1/object/public/anexos/lopd.pdf`;
    const pdfRes = await fetch(pdfUrl);
    if(!pdfRes.ok) throw new Error(`No se pudo cargar el PDF LOPD: ${pdfRes.status}`);
    const pdfBytes = await pdfRes.arrayBuffer();

    // Load with ignoreEncryption to handle any PDF quirks
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const fontNormal = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold   = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const page = pdfDoc.getPages()[0];
    const { height } = page.getSize();

    const black = rgb(0, 0, 0);
    const fs = 9;

    // pdfplumber top → pdf-lib y baseline
    const y = (top) => height - top - 7;

    // --- CEDENTE ---
    if(cedente_nombre) page.drawText(cedente_nombre, { x: 170, y: y(158.1), size: fs, font: fontNormal, color: black });
    if(cedente_nif)    page.drawText(cedente_nif,    { x: 449, y: y(158.1), size: fs, font: fontNormal, color: black });

    // --- CESIONARIOS ---
    const rows = [231.1, 267.6, 304.0, 340.5, 376.9, 413.4];
    const cesionarios = [];
    if(cesionario1_nombre) cesionarios.push({ nombre: cesionario1_nombre, nif: cesionario1_nif });
    if(cesionario2_nombre) cesionarios.push({ nombre: cesionario2_nombre, nif: cesionario2_nif });

    cesionarios.forEach((c, i) => {
      const rowY = y(rows[i]);
      if(c.nombre) page.drawText(c.nombre, { x: 75,  y: rowY, size: fs, font: fontNormal, color: black });
      if(c.nif)    page.drawText(c.nif,    { x: 290, y: rowY, size: fs, font: fontNormal, color: black });
      // Use "Si" instead of "✓" since Helvetica doesn't support special chars
      page.drawText('Si', { x: 511, y: rowY, size: fs, font: fontBold, color: black });
    });

    // --- SIGNATURES ---
    const sigW = 80, sigH = 20;

    if(firma_inquilino) {
      try {
        const imgBytes = Buffer.from(firma_inquilino.replace(/^data:image\/png;base64,/, ''), 'base64');
        const img = await pdfDoc.embedPng(imgBytes);
        page.drawImage(img, { x: 375, y: y(231.1) - sigH + 8, width: sigW, height: sigH });
      } catch(e){ console.error('firma_inquilino error:', e.message); }
    }

    if(firma_arrendador) {
      try {
        const imgBytes = Buffer.from(firma_arrendador.replace(/^data:image\/png;base64,/, ''), 'base64');
        const img = await pdfDoc.embedPng(imgBytes);
        page.drawImage(img, { x: 375, y: y(158.1) - sigH + 8, width: sigW, height: sigH });
      } catch(e){ console.error('firma_arrendador error:', e.message); }
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
