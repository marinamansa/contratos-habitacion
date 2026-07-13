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
      firma_inquilino, firma_avalista
      // firma_arrendador removed: CEDENTE has no signature field on LOPD
    } = JSON.parse(event.body);

    const pdfUrl = `${SUPABASE_URL}/storage/v1/object/public/anexos/lopd.pdf`;
    const pdfRes = await fetch(pdfUrl);
    if(!pdfRes.ok) throw new Error(`No se pudo cargar el PDF LOPD: ${pdfRes.status}`);
    const pdfBytes = await pdfRes.arrayBuffer();

    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const fontNormal = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold   = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const page = pdfDoc.getPages()[0];
    const { height } = page.getSize(); // 841.92

    const black = rgb(0, 0, 0);
    const fs = 9;

    // pdfplumber top → pdf-lib y baseline
    const y = (top) => height - top - 7;

    // --- CEDENTE ---
    if(cedente_nombre) page.drawText(cedente_nombre, { x: 170, y: y(158.1), size: fs, font: fontNormal, color: black });
    if(cedente_nif)    page.drawText(cedente_nif,    { x: 449, y: y(158.1), size: fs, font: fontNormal, color: black });

    // --- CESIONARIOS ---
    // Row tops from pdfplumber: 231.07, 267.55, 304.03, 340.51, 376.87, 413.37
    const rows = [231.07, 267.55, 304.03, 340.51, 376.87, 413.37];
    const cesionarios = [];
    if(cesionario1_nombre) cesionarios.push({ nombre: cesionario1_nombre, nif: cesionario1_nif });
    if(cesionario2_nombre) cesionarios.push({ nombre: cesionario2_nombre, nif: cesionario2_nif });

    cesionarios.forEach((c, i) => {
      const rowY = y(rows[i]);
      if(c.nombre) page.drawText(c.nombre, { x: 75,  y: rowY, size: fs, font: fontNormal, color: black });
      if(c.nif)    page.drawText(c.nif,    { x: 290, y: rowY, size: fs, font: fontNormal, color: black });
      // X inside checkbox: checkbox char at x0=503.38, bottom=241.03 → pdf-lib y = 841.92-241.03+1 = 601.9
      const checkY = height - (rows[i] + 9.96) + 1;
      page.drawText('X', { x: 504, y: checkY, size: 7.5, font: fontBold, color: black });
    });

    // --- SIGNATURES (CESIONARIOS only, no CEDENTE) ---
    // firma area starts at x=375 ("firma___"), sig fits in that space
    const sigW = 75, sigH = 18;

    if(firma_inquilino) {
      try {
        const img = await pdfDoc.embedPng(Buffer.from(firma_inquilino.replace(/^data:image\/png;base64,/, ''), 'base64'));
        const checkY = height - (rows[0] + 9.96) + 1;
        page.drawImage(img, { x: 396, y: checkY - sigH + 6, width: sigW, height: sigH });
      } catch(e){ console.error('firma_inquilino:', e.message); }
    }

    if(firma_avalista) {
      try {
        const img = await pdfDoc.embedPng(Buffer.from(firma_avalista.replace(/^data:image\/png;base64,/, ''), 'base64'));
        const checkY = height - (rows[1] + 9.96) + 1;
        page.drawImage(img, { x: 396, y: checkY - sigH + 6, width: sigW, height: sigH });
      } catch(e){ console.error('firma_avalista:', e.message); }
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
