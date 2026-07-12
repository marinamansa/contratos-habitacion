const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

exports.handler = async function(event) {
  if(event.httpMethod !== 'POST'){
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const SUPABASE_URL = 'https://kyrjqbautyklefhqzqbo.supabase.co';

  try {
    const {
      // Cedente (arrendador)
      cedente_nombre, cedente_nif,
      // Cesionario 1 (arrendatario)
      cesionario1_nombre, cesionario1_nif,
      // Cesionario 2 (avalista, opcional)
      cesionario2_nombre, cesionario2_nif,
      // Firmas
      firma_inquilino, firma_arrendador
    } = JSON.parse(event.body);

    // Fetch PDF from Supabase Storage
    const pdfUrl = `${SUPABASE_URL}/storage/v1/object/public/anexos/lopd.pdf`;
    const pdfRes = await fetch(pdfUrl);
    if(!pdfRes.ok) throw new Error('No se pudo cargar el PDF LOPD');
    const pdfBytes = await pdfRes.arrayBuffer();

    const pdfDoc = await PDFDocument.load(pdfBytes);
    const fontNormal = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold   = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const page = pdfDoc.getPages()[0];
    const { height } = page.getSize(); // 842

    const black = rgb(0, 0, 0);
    const fs = 9; // font size for fields

    // Helper: pdfplumber top → pdf-lib y (baseline)
    const y = (top, lineHeight = 10) => height - top - lineHeight + 3;

    // --- CEDENTE ---
    // "Nombre completo___" line top=158.1, after "Nombre completo" label
    page.drawText(cedente_nombre || '', { x: 170, y: y(158.1), size: fs, font: fontNormal, color: black });
    // NIF after "con NIF" at x=448.7
    page.drawText(cedente_nif || '', { x: 449, y: y(158.1), size: fs, font: fontNormal, color: black });

    // --- CESIONARIOS ---
    // Row positions (top values): 231.1, 267.6, 304.0, 340.5, 376.9, 413.4
    const rows = [231.1, 267.6, 304.0, 340.5, 376.9, 413.4];
    const cesionarios = [];
    if(cesionario1_nombre) cesionarios.push({ nombre: cesionario1_nombre, nif: cesionario1_nif });
    if(cesionario2_nombre) cesionarios.push({ nombre: cesionario2_nombre, nif: cesionario2_nif });

    cesionarios.forEach((c, i) => {
      const rowY = y(rows[i]);
      // Name after "Sr/sra" at x=74.4
      page.drawText(c.nombre || '', { x: 75, y: rowY, size: fs, font: fontNormal, color: black });
      // NIF after "NIF" at x=289.7
      page.drawText(c.nif || '', { x: 290, y: rowY, size: fs, font: fontNormal, color: black });
      // "✓ Sí" mark at x=516.2
      page.drawText('✓', { x: 509, y: rowY, size: fs + 1, font: fontBold, color: black });
    });

    // --- SIGNATURES ---
    // Inquilino signature: row 1 firma area x=375, small inline sig
    // Arrendador: not on this form, only cesionarios sign
    // We embed the inquilino signature in row 1 firma field
    const sigW = 80, sigH = 22;

    if(firma_inquilino) {
      const base64Data = firma_inquilino.replace(/^data:image\/png;base64,/, '');
      const imgBytes = Buffer.from(base64Data, 'base64');
      const img = await pdfDoc.embedPng(imgBytes);
      // Row 1: top=231.1 → y in pdf-lib
      page.drawImage(img, { x: 375, y: height - 231.1 - sigH + 4, width: sigW, height: sigH });
      // If avalista, same signature in row 2? Or leave blank — inquilino only signs row 1
    }

    if(firma_arrendador) {
      // Arrendador is the CEDENTE — no signature field on LOPD for cedente, 
      // so we add it below the cedente line as confirmation
      const base64Data = firma_arrendador.replace(/^data:image\/png;base64,/, '');
      const imgBytes = Buffer.from(base64Data, 'base64');
      const img = await pdfDoc.embedPng(imgBytes);
      page.drawImage(img, { x: 375, y: height - 158.1 - sigH + 4, width: sigW, height: sigH });
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
