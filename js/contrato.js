function fmtDate(d){
  if(!d) return '___';
  const [y,m,dd] = d.split('-');
  return `${dd}/${m}/${y}`;
}

function numLetras(n){
  const map = {
    100:'cien',150:'ciento cincuenta',175:'ciento setenta y cinco',200:'doscientos',
    225:'doscientos veinticinco',250:'doscientos cincuenta',275:'doscientos setenta y cinco',
    300:'trescientos',325:'trescientos veinticinco',350:'trescientos cincuenta',
    375:'trescientos setenta y cinco',400:'cuatrocientos',425:'cuatrocientos veinticinco',
    450:'cuatrocientos cincuenta',475:'cuatrocientos setenta y cinco',500:'quinientos',
    550:'quinientos cincuenta',600:'seiscientos',650:'seiscientos cincuenta',700:'setecientos',
    750:'setecientos cincuenta',800:'ochocientos',850:'ochocientos cincuenta',900:'novecientos',
    950:'novecientos cincuenta',1000:'mil'
  };
  return map[parseInt(n)] || n;
}

function numHabitaciones(n){
  const map = ['','uno','dos','tres','cuatro','cinco','seis','siete','ocho','nueve','diez'];
  return map[parseInt(n)] || n;
}

function applyEdiciones(html, ediciones){
  if(!ediciones || Object.keys(ediciones).length === 0) return html;
  // Split on h2 tags same way as index.html does
  const parts = html.split(/(?=<h2>)/);
  return parts.map((part, i) => {
    const key = part.match(/<h2>/) ? 'sec_' + i : (i === 0 ? 'sec_intro' : 'sec_' + i);
    if(ediciones[key] !== undefined){
      const h2match = part.match(/(<h2>.*?<\/h2>)/);
      const h2 = h2match ? h2match[1] : '';
      // edicion is plain text, wrap in paragraphs
      const editedHtml = ediciones[key].split('\n').filter(l=>l.trim()).map(l=>`<p>${l}</p>`).join('');
      return h2 + editedHtml;
    }
    return part;
  }).join('');
}

function buildContrato(d){
  const hoy = new Date().toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'});
  const conAvalista = d.avalista && d.av_nombre;
  const conSeguro = d.seguro;

  const _html = `
<h1>CONTRATO DE ARRENDAMIENTO DE HABITACIÓN</h1>
<p class="sub">Sometido al Código Civil</p>
<p>En ${d.ciudad}, a ${hoy}</p>

<h2>REUNIDOS</h2>
<p>De una parte, D. ${d.an}, mayor de edad, con DNI ${d.ad}, y con domicilio a efecto de notificaciones en la ciudad de ${d.ciudad}, ${d.adom}.</p>
<p>De otra parte, D. ${d.tn}, mayor de edad, con DNI ${d.td} de nacionalidad ${d.tnac} y con domicilio a efecto de notificaciones en ${d.tdom}.</p>
${conAvalista ? `<p>Y de otra parte, D. ${d.av_nombre}, mayor de edad, con DNI ${d.av_dni}, en calidad de avalista solidario.</p>` : ''}

<h2>INTERVIENEN</h2>
<p>D. ${d.an}, en su propio nombre y derecho, como parte arrendadora.</p>
<p>D. ${d.tn}, en su propio nombre y derecho, como parte arrendataria.</p>
<p>Reconociéndose todas las partes capacidad legal suficiente para el otorgamiento del presente contrato de arrendamiento de vivienda.</p>

<h2>EXPONEN</h2>
<p>PRIMERO.- Que la parte arrendadora es propietaria de la vivienda sita en la ciudad de ${d.ciudad}, en ${d.idir}, que consta de ${d.htot} habitaciones numeradas del uno al ${numHabitaciones(d.htot)}, un salón/cocina y un cuarto de baño.</p>
<p>SEGUNDO.- Que la parte arrendataria manifiesta no encontrarse, ni ella ni su unidad familiar, en situación de vulnerabilidad económica y/o social a la fecha de la firma del presente documento, resultando este motivo esencial para que la arrendadora acepte cederle en arrendamiento el inmueble objeto del presente contrato.</p>
<p>TERCERO.- Que el arrendador ha convenido con el arrendatario el arrendamiento de la habitación amueblada número ${d.hnum}, cuya superficie y composición son perfectamente conocidas por el arrendatario. El arrendamiento de dicha habitación dará derecho al uso común con el resto de arrendatarios de las zonas comunes. Se adjunta inventario del mobiliario existente. El arrendamiento se realiza con sujeción al régimen jurídico establecido en el código civil.</p>

<h2>CLÁUSULAS</h2>

<h2>PRIMERA.- OBJETO Y DESTINO</h2>
<p>Por medio del presente contrato, la parte arrendadora arrienda a la parte arrendataria la habitación número ${d.hnum} descrita en este contrato, quien la acepta en las condiciones pactadas en este documento.</p>
<p>La habitación se arrienda como cuerpo cierto. La parte arrendataria afirma que la habitación arrendada no tiene carácter de vivienda habitual. Se prohíbe variar dicho uso sin consentimiento escrito de la parte arrendadora. El incumplimiento será motivo de resolución del contrato.</p>
<p>La habitación se pone a disposición de la parte arrendataria en el momento de la firma del presente contrato, manifestando ésta conocer su estado y ser apto para el fin al que se destina.</p>

<h2>SEGUNDA.- DERECHO DE ACCESO A LA VIVIENDA DEL ARRENDADOR</h2>
<p>Las partes acuerdan expresamente la renuncia del arrendatario a impedir que el arrendador pueda acceder a las zonas comunes de la vivienda y a las habitaciones que circunstancialmente no se encuentren arrendadas. La violación de este derecho será considerada causa de resolución del contrato.</p>

<h2>TERCERA.- DURACIÓN, PRÓRROGAS Y FINALIZACIÓN DEL CONTRATO</h2>
<p>El presente contrato se acuerda por la temporada comprendida entre el ${fmtDate(d.fi)} y el ${fmtDate(d.ff)}.</p>
<p>Llegada la fecha de finalización, en caso de que la parte arrendataria quisiese continuar deberá comunicárselo a la parte arrendadora con un mínimo de 7 días de antelación, debiendo formularse un nuevo contrato. En caso contrario la parte arrendataria devolverá la posesión del inmueble libre de ocupantes.</p>
<p>El presente contrato no se prorrogará automáticamente en ningún caso.</p>
<p>En caso de desistimiento anticipado, el arrendatario abonará una indemnización equivalente a la mensualidad completa hasta que termine el mes en curso.</p>
<p>De no devolverse la posesión del inmueble en la fecha de vencimiento, las partes establecen una cláusula penal equivalente al doble de la renta mensual que se viniere devengando, calculada en atención al número de días o meses de retraso.</p>

<h2>CUARTA.- RENTA Y ACTUALIZACIÓN DE LA RENTA</h2>
<p>El arrendatario abonará al arrendador, en concepto de renta, la cantidad de ${numLetras(d.renta)} (${d.renta}) euros mensuales, debiendo hacerlo de forma anticipada en el momento de su incorporación, mediante ingreso o transferencia bancaria en el número de cuenta ${d.aiban}.</p>
<p>El arrendatario hace entrega en este acto del primer mes de renta, sirviendo este documento como la más eficaz carta de pago.</p>
<p>En caso de prórroga del contrato, la renta podrá ser actualizada en función de las variaciones porcentuales del IPC publicado por el INE.</p>

<h2>QUINTA.- GASTOS GENERALES</h2>
<p>Los gastos generales, tales como la comunidad de propietarios, IBI, etc., serán asumidos por la parte arrendadora.</p>

<h2>SEXTA.- SUMINISTROS</h2>
<p>Se incluyen en la renta mensual pactada los siguientes suministros: internet, agua, recogida de basuras y electricidad, hasta un máximo conjunto de ${d.lsum} € por mes.</p>
<p>Si la suma total de los suministros supera los ${d.lsum} € multiplicado por el número total de arrendatarios que ocupen el inmueble durante ese mes, el importe excedente se dividirá de manera equitativa entre todos los arrendatarios presentes en dicho período, debiendo abonarse junto con la siguiente mensualidad.</p>
<p>En caso de impago de suministros: (a) se considerará incumplimiento contractual; (b) el arrendador podrá suspender los servicios adicionales; (c) el importe devengará intereses del 1,5% mensual; (d) la falta de pago durante dos meses consecutivos o tres alternos en seis meses dará lugar a la resolución del contrato.</p>

<h2>SÉPTIMA.- OBRAS Y REPARACIONES</h2>
<p>Las partes se someten al régimen establecido en el código civil.</p>

<h2>OCTAVA.- NORMAS DE CONVIVENCIA</h2>
<p>La parte arrendataria se someterá durante toda la vigencia del contrato a las normas de la comunidad de propietarios. Se prohíbe expresamente la estancia de cualquier tipo de animal en el inmueble, salvo autorización escrita del arrendador.</p>
<p>Limpieza: cada arrendatario será responsable de limpiar y recoger los utensilios o enseres personales tras su uso en las zonas comunes. El baño y la cocina deberán mantenerse en condiciones higiénicas adecuadas.</p>
<p>Ruido y descanso: no se permitirá realizar ruidos ni actividades que puedan perturbar el descanso, especialmente entre las 23:00 y las 8:00 horas.</p>
<p>Visitas: las visitas ocasionales están permitidas, siempre que no pernocten sin consentimiento previo de la parte arrendadora ni alteren la convivencia.</p>
<p>Prohibiciones: no se permite fumar dentro de la vivienda ni en los balcones, mantener animales, ni realizar fiestas o reuniones que generen molestias. Tampoco se permitirá modificar el mobiliario ni instalar electrodomésticos sin autorización del propietario.</p>
<p>Cualquier incumplimiento grave de estas normas se considerará causa de resolución del contrato.</p>

<h2>NOVENA.- MANTENIMIENTO, REPARACIONES Y SUSTITUCIONES</h2>
<p>La parte arrendadora será responsable de las reparaciones derivadas del uso normal y desgaste natural. El arrendatario se compromete a utilizar correctamente el mobiliario y electrodomésticos, asumiendo el coste de reparación o sustitución en caso de uso indebido o negligencia. Toda incidencia deberá comunicarse en un plazo máximo de 48 horas desde su detección.</p>

<h2>DÉCIMA.- CONSUMIBLES Y UTENSILIOS DE LIMPIEZA</h2>
<p>La parte arrendadora proporcionará de forma inicial y de cortesía: detergente para lavadora, detergente para lavavajillas, jabón de manos, papel higiénico, bolsas de basura, escoba y fregona. Una vez agotados, será responsabilidad de los arrendatarios reponerlos.</p>

<h2>DÉCIMO PRIMERA.- CESIÓN Y SUBARRIENDO</h2>
<p>El inmueble no se podrá ceder ni subarrendar de forma parcial ni total. El incumplimiento será causa de resolución inmediata del contrato.</p>

<h2>DÉCIMO SEGUNDA.- DERECHO DE ADQUISICIÓN PREFERENTE</h2>
<p>La parte arrendataria renuncia expresamente al derecho de adquisición preferente tanto de la habitación como de la vivienda en la que se ubica.</p>

<h2>DÉCIMO TERCERA.- FIANZA Y OTRAS GARANTÍAS ADICIONALES</h2>
<p>La parte arrendataria entrega en este acto a la parte arrendadora un total de ${d.fianza} euros en concepto de FIANZA, equivalente a una mensualidad de renta, para garantizar el cumplimiento de sus obligaciones.</p>
<p>La fianza no podrá ser utilizada para sustituir o compensar el incumplimiento de la obligación de pago de ninguna mensualidad. Esta fianza se devolverá una vez comprobada la limpieza de la habitación y zonas comunes y recibidas las últimas facturas de suministro. El arrendador tiene un plazo máximo de un mes para su devolución.</p>

<h2>DÉCIMO CUARTA.- AVALISTA SOLIDARIO</h2>
${conAvalista ? `<p>D. ${d.av_nombre}, con DNI ${d.av_dni}, se constituye en avalista solidario de la parte arrendataria, respondiendo de todas las obligaciones dinerarias derivadas del presente contrato de forma solidaria con el arrendatario.</p>` : '<p>No aplica en el presente contrato.</p>'}

<h2>DÉCIMO QUINTA.- DOMICILIO A EFECTO DE NOTIFICACIONES</h2>
<p>Las partes acuerdan que serán válidas las notificaciones enviadas a la parte arrendadora en ${d.adom}, y a la parte arrendataria en la habitación arrendada.</p>
<p>Alternativamente, será válida la notificación por correo electrónico: Arrendador: ${d.amail} / Arrendatario: ${d.tmail}.</p>

<h2>DÉCIMO SEXTA.- RÉGIMEN APLICABLE</h2>
<p>El presente contrato es un contrato de arrendamiento de habitación no sometido a la Ley de Arrendamientos Urbanos sino al Código Civil.</p>

<h2>DÉCIMO SÉPTIMA.- SOLUCIÓN DE CONFLICTOS</h2>
<p>Apartado 1.- Seguro de impago: ${conSeguro ? 'Las partes acuerdan la contratación de un seguro de impago de renta, cuyos términos y condiciones se adjuntan como anexo al presente contrato.' : 'No se aplica en este caso.'}</p>
<p>Apartado 2.- Las partes acuerdan someter las controversias derivadas del presente contrato a los juzgados y tribunales de ${d.ciudad} capital.</p>

<h2>DÉCIMO OCTAVA.- PROTECCIÓN DE DATOS</h2>
<p>Las partes declaran conocer el Reglamento (UE) 2016/279 (RGPD) y la Ley Orgánica 3/2018 de protección de datos personales y garantía de los derechos digitales, obligándose a su cumplimiento. Los datos serán conservados durante el tiempo necesario para ejecutar la relación de arrendamiento y cumplir con las obligaciones legales.</p>

${d.extra ? `<h2>CLÁUSULAS ADICIONALES</h2><p>${d.extra.replace(/\n/g,'</p><p>')}</p>` : ''}
`;
  return applyEdiciones(_html, d.ediciones);
}
