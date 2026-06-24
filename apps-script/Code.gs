/**
 * CoinTrack — Backend de Google Sheets para sincronizar pedidos
 * entre CoinTrackCliente.html (celular) y CoinTrack.html (oficina).
 *
 * Instalación:
 * 1. Crea un Google Sheet nuevo (vacío).
 * 2. Extensiones > Apps Script.
 * 3. Borra el contenido de Code.gs y pega TODO este archivo.
 * 4. Guarda (Ctrl+S).
 * 5. Implementar > Nueva implementación > tipo: Aplicación web.
 *    - Ejecutar como: Yo
 *    - Quién tiene acceso: Cualquier usuario
 * 6. Autoriza los permisos cuando te lo pida.
 * 7. Copia la URL del Web App (termina en /exec).
 * 8. Pega esa URL en CoinTrack.html y CoinTrackCliente.html,
 *    en el campo "URL de Apps Script" (CoinTrack.html) y en la
 *    constante SCRIPT_URL_FALLBACK (CoinTrackCliente.html).
 *
 * Cada vez que vuelvas a "Implementar" cambios en este script,
 * usa "Administrar implementaciones" > editar > Nueva versión
 * para que la URL siga funcionando igual.
 */

const SHEET_NAME = 'Pedidos';
const HEADERS = ['id','fecha','nombre','tel','email','denoms','totalMonto','commission','fechaEntrega','notas','processed','fechaProcesado'];

function doGet(e) {
  const action = (e.parameter.action || 'list');
  if (action === 'list') {
    return jsonOut(listOrders());
  }
  if (action === 'markProcessed') {
    markProcessed(e.parameter.id);
    return jsonOut({ ok: true });
  }
  return jsonOut({ error: 'unknown action' });
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    addOrder(data);
    return jsonOut({ ok: true });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
  }
  return sh;
}

function addOrder(o) {
  const sh = getSheet();
  sh.appendRow([
    o.id || '', o.fecha || '', o.nombre || '', o.tel || '', o.email || '',
    JSON.stringify(o.denoms || {}), o.totalMonto || 0, o.commission || 0,
    o.fechaEntrega || '', o.notas || '', false, ''
  ]);
}

function listOrders() {
  const sh = getSheet();
  const rows = sh.getDataRange().getValues();
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[0]) continue;
    if (r[10] === true || r[10] === 'TRUE') continue; // ya procesado, no lo reenviamos
    let denoms = {};
    try { denoms = JSON.parse(r[5] || '{}'); } catch (e) {}
    out.push({
      id: r[0], fecha: r[1], nombre: r[2], tel: r[3], email: r[4],
      denoms: denoms, totalMonto: r[6], commission: r[7],
      fechaEntrega: r[8], notas: r[9], processed: false
    });
  }
  return out;
}

function markProcessed(id) {
  if (!id) return;
  const sh = getSheet();
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) {
      sh.getRange(i + 1, 11).setValue(true);
      sh.getRange(i + 1, 12).setValue(new Date());
      break;
    }
  }
}
