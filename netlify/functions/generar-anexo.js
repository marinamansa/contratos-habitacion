const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

exports.handler = async function(event) {
  if(event.httpMethod !== 'POST'){
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const SUPABASE_URL = 'https://kyrjqbautyklefhqzqbo.supabase.co';

  try {
    const { hnum, inquilino, fecha } = JSON.parse(event.body);
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
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();
    const page = pages[0];
    const { height } = page.getSize(); // 841.92

    // Coordinates from pdfplumber (convert y: pdfplumber top-down → pdf-lib bottom-up)
    // "Inquilino / Responsable: ___" line: y0=194.2 in pdfplumber → pdf-lib y = height - y0 - lineHeight
    const fontSize = 10;
    const inquilinoX = 215; // right after "Responsable: "
    const inquilinoY = height - 206.2 + 1;
    const fechaX = 125;     // right after "Fecha: "
    const fechaY = height - 223.1 + 1;

    page.drawText(inquilino, { x: inquilinoX, y: inquilinoY, size: fontSize, font, color: rgb(0,0,0) });
    page.drawText(fecha,     { x: fechaX,     y: fechaY,     size: fontSize, font, color: rgb(0,0,0) });

    const modifiedPdfBytes = await pdfDoc.save();
    const base64 = Buffer.from(modifiedPdfBytes).toString('base64');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
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
