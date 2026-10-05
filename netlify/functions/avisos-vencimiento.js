// Netlify scheduled function — runs daily at 9:00 AM Europe/Madrid
// Sends email to martinipateiro@gmail.com when a contract expires in ≤15 days
// Schedule is set in netlify.toml:
//   [functions."avisos-vencimiento"]
//   schedule = "0 7 * * *"   ← 09:00 Madrid (UTC+2 summer, UTC+1 winter → use 7 UTC as safe midpoint)

const SUPABASE_URL = 'https://kyrjqbautyklefhqzqbo.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
// Uses send-email function internally via fetch, OR Nodemailer/Resend if env vars present

export const handler = async () => {
  try {
    // 1. Fetch all contratos
    const res = await fetch(`${SUPABASE_URL}/rest/v1/contratos?select=id,datos,firma_inquilino,firma_arrendador,firma_anexo_inquilino,firma_anexo_arrendador,firma_lopd_inquilino,firma_lopd_arrendador,firma_avalista_contrato,firma_lopd_avalista`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    const contratos = await res.json();

    const hoy = new Date(); hoy.setHours(0,0,0,0);
    const alertas = [];

    for(const c of contratos){
      const d = c.datos;
      if(!d || !d.ff) continue;

      // Parse end date in local time
      const [y,m,dia] = d.ff.split('-');
      const fin = new Date(+y, +m-1, +dia);

      // Days remaining
      const dias = Math.round((fin - hoy) / (1000*60*60*24));

      // Only alert for contracts expiring in 1–15 days (not already expired)
      if(dias < 1 || dias > 15) continue;

      // Only active/pending contracts (not already in histórico)
      const conSeguro = !!d.seguro;
      const conAvalista = !!(d.avalista && d.av_nombre);
      const margen = new Date(hoy); margen.setDate(margen.getDate()-2);
      if(fin < margen) continue; // already in histórico

      alertas.push({
        id: c.id,
        inquilino: d.tn || '—',
        hnum: d.hnum || '?',
        ff: d.ff,
        dias,
        renta: d.renta || 0
      });
    }

    if(!alertas.length){
      console.log('No hay contratos próximos a vencer.');
      return { statusCode: 200, body: 'No alertas' };
    }

    // Sort by soonest first
    alertas.sort((a,b) => a.dias - b.dias);

    // Build email body
    const filas = alertas.map(a =>
      `  • Habitación ${a.hnum} — ${a.inquilino}: vence el ${a.ff} (${a.dias} día${a.dias!==1?'s':''} restante${a.dias!==1?'s':''})`
    ).join('\n');

    const emailBody = `Hola,

Los siguientes contratos vencen en los próximos 15 días:

${filas}

Accede al panel para gestionar las renovaciones o extinciones:
https://contrato-universidade.netlify.app/panel.html

--
Contratos App · Avenida da Universidade Nº 13, Ourense
`;

    const htmlBody = `
<div style="font-family:'Segoe UI',system-ui,sans-serif;max-width:520px;margin:0 auto;padding:2rem">
  <div style="background:#1a1a1a;border-radius:12px 12px 0 0;padding:1.25rem 1.5rem">
    <h1 style="color:#fff;font-size:15px;font-weight:600;margin:0">⚠️ Contratos próximos a vencer</h1>
  </div>
  <div style="background:#fff;border:1px solid #e8e8e8;border-top:none;border-radius:0 0 12px 12px;padding:1.5rem">
    <p style="color:#555;font-size:13px;margin-bottom:1rem">Los siguientes contratos vencen en los próximos <strong>15 días</strong>:</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead>
        <tr style="border-bottom:2px solid #f0f0f0">
          <th style="text-align:left;padding:.5rem .75rem;color:#aaa;font-size:10.5px;text-transform:uppercase">Habitación</th>
          <th style="text-align:left;padding:.5rem .75rem;color:#aaa;font-size:10.5px;text-transform:uppercase">Inquilino</th>
          <th style="text-align:left;padding:.5rem .75rem;color:#aaa;font-size:10.5px;text-transform:uppercase">Vencimiento</th>
          <th style="text-align:left;padding:.5rem .75rem;color:#aaa;font-size:10.5px;text-transform:uppercase">Días</th>
        </tr>
      </thead>
      <tbody>
        ${alertas.map(a => `
        <tr style="border-bottom:1px solid #f5f5f5">
          <td style="padding:.6rem .75rem;font-weight:600">Hab. ${a.hnum}</td>
          <td style="padding:.6rem .75rem">${a.inquilino}</td>
          <td style="padding:.6rem .75rem">${a.ff}</td>
          <td style="padding:.6rem .75rem">
            <span style="background:${a.dias<=7?'#fee2e2':'#fef9c3'};color:${a.dias<=7?'#991b1b':'#854d0e'};padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600">
              ${a.dias} día${a.dias!==1?'s':''}
            </span>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
    <div style="margin-top:1.5rem;padding-top:1rem;border-top:1px solid #f0f0f0">
      <a href="https://contrato-universidade.netlify.app/panel.html"
         style="display:inline-block;padding:9px 20px;background:#1D9E75;color:#fff;text-decoration:none;border-radius:7px;font-size:13px;font-weight:600">
        Ir al Panel de Contratos
      </a>
    </div>
  </div>
</div>`;

    // Send via Netlify send-email function (Mailgun/SendGrid)
    // Adapt to whichever email provider is configured in your site
    await sendEmail({
      to: 'martinipateiro@gmail.com',
      subject: `⚠️ ${alertas.length} contrato${alertas.length!==1?'s':''} vence${alertas.length===1?'':'n'} en ≤15 días`,
      text: emailBody,
      html: htmlBody
    });

    console.log(`Alertas enviadas para ${alertas.length} contratos.`);
    return { statusCode: 200, body: `Alertas: ${alertas.length}` };

  } catch(e){
    console.error('Error en avisos-vencimiento:', e);
    return { statusCode: 500, body: e.message };
  }
};

// ---------------------------------------------------------------------------
// Email sender — uses SMTP via Nodemailer if SMTP_HOST is set,
// or falls back to calling the site's own /.netlify/functions/send-email
// ---------------------------------------------------------------------------
async function sendEmail({ to, subject, text, html }){
  // Option A: Resend API (set RESEND_API_KEY in Netlify env vars)
  if(process.env.RESEND_API_KEY){
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'Contratos <avisos@contrato-universidade.netlify.app>', to, subject, text, html })
    });
    if(!r.ok) throw new Error('Resend error: ' + (await r.text()));
    return;
  }

  // Option B: call existing send-email function on this same Netlify site
  const siteUrl = process.env.URL || 'https://contrato-universidade.netlify.app';
  const r = await fetch(`${siteUrl}/.netlify/functions/send-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, subject, text, html })
  });
  if(!r.ok) throw new Error('send-email error: ' + (await r.text()));
}
