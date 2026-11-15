/* AGRI-ORBIT · js/models/cadastre.js
   Catastro de El Salvador (CNR · IGCN) a través del backend (server/lib/cadastre.js).
   El navegador solo pide imágenes y atributos al backend; nunca ve credenciales del CNR. */

const CAD = { state:'unknown', status:null, base:null, span:0.02, view:null, info:null, infoState:null, err:null, sig:null };
const CAD_SV = [-90.2, 13.1, -87.6, 14.5];   // extensión de El Salvador (igual que el backend)
const CAD_MIN_SPAN = 0.004;

/* Mismo backend que AGRI-AI: …/api/agri-ai → …/api/cadastre */
function cadResolveBase(){
  const ep = typeof aiResolveEndpoint === 'function' ? aiResolveEndpoint() : null;
  return ep ? ep.replace(/\/api\/agri-ai$/, '/api/cadastre') : null;
}
const cadInSV = (lon, lat) => lon >= CAD_SV[0] && lon <= CAD_SV[2] && lat >= CAD_SV[1] && lat <= CAD_SV[3];
function cadView(lat, lon, span, w = 640, h = 400){
  const hw = span / 2, hh = hw * h / w;
  return { bbox: [lon - hw, lat - hh, lon + hw, lat + hh].map(v => +v.toFixed(6)), w, h };
}
const cadQS = v => `bbox=${v.bbox.join(',')}&w=${v.w}&h=${v.h}`;
const cadMapURL = v => `${CAD.base}/map?${cadQS(v)}`;

async function cadLoadStatus(){
  CAD.base = cadResolveBase();
  if (!CAD.base){ CAD.state = 'nobackend'; return; }
  try {
    const r = await fetch(CAD.base + '/status');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    CAD.status = await r.json();
    CAD.state = CAD.status.connected ? 'ready' : 'pending';
    if (CAD.status.maxSpanDeg) CAD.span = Math.min(CAD.span, CAD.status.maxSpanDeg);
  } catch (e) { CAD.state = 'nobackend'; }
}

async function cadIdentify(lon, lat){
  CAD.infoState = 'loading'; CAD.info = null; CAD.err = null;
  try {
    const r = await fetch(`${CAD.base}/identify?${cadQS(CAD.view)}&lon=${lon.toFixed(6)}&lat=${lat.toFixed(6)}`);
    const j = await r.json().catch(() => ({}));
    if (!r.ok){ CAD.infoState = 'error'; CAD.err = j.error || ('HTTP ' + r.status); return; }
    CAD.info = j; CAD.infoState = j.state || 'unparsed';
  } catch (e) { CAD.infoState = 'error'; CAD.err = 'unreachable'; }
}
