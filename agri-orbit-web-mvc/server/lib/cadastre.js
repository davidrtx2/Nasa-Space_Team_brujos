/* AGRI-ORBIT · capa catastral de El Salvador (CNR · IGCN) a través del backend.
   El navegador nunca habla con el CNR ni ve credenciales: pide al backend una imagen
   del área visible (/map) o los atributos de un punto (/identify), y el backend
   consulta el servicio oficial configurado (WMS o ArcGIS REST MapServer).
   Sin URL, capas y referencia del convenio/autorización, la capa queda "pendiente". */
'use strict';

const SV_DOMAIN = [-90.2, 13.1, -87.6, 14.5];            // extensión de El Salvador (lon/lat, con margen)
const CRS_OK = ['EPSG:4326', 'CRS:84', 'EPSG:3857'];
const TECH_FIELDS = /^(objectid|fid|gid|ogc_fid|shape|shape[._]?(area|len|length)|shape\.st(area|length)\(\)|st_(area|length)\(shape\)|geom|the_geom|geometry|globalid)$/i;
const OWNER_FIELDS = /propietari|owner|titular|poseedor|contribuyente|dui|\bnit\b|nombre_?(prop|tit|due)|due[ñn]o/i;
const REGISTRY_FIELDS = /inscrip|matr[ií]cula|asiento|folio|antecedente|historial|tradici[oó]n|libro|tomo|registr/i;
const KEY_FIELD = /^(clave[_ ]?catastral|cod(igo)?[_ ]?catastral|clave_cat|clavecat|clave)$/i;

function getCadastreConfig(env = process.env){
  const int = (k, d) => { const v = parseInt(env[k], 10); return Number.isFinite(v) && v > 0 ? v : d; };
  const num = (k, d) => { const v = parseFloat(env[k]); return Number.isFinite(v) && v > 0 ? v : d; };
  const boxes = s => String(s || '').split(';').map(b => b.split(',').map(Number)).filter(b => b.length === 4 && b.every(Number.isFinite) && b[0] < b[2] && b[1] < b[3]);
  return {
    protocol: String(env.CNR_CADASTRE_PROTOCOL || '').trim().toLowerCase(),
    url: String(env.CNR_CADASTRE_URL || '').trim().replace(/\/+$/, ''),
    layers: String(env.CNR_CADASTRE_LAYERS || '').trim(),
    version: env.CNR_CADASTRE_WMS_VERSION === '1.1.1' ? '1.1.1' : '1.3.0',
    crs: String(env.CNR_CADASTRE_CRS || 'EPSG:4326').trim().toUpperCase(),
    infoFormat: String(env.CNR_CADASTRE_INFO_FORMAT || 'application/json').trim(),
    queryable: env.CNR_CADASTRE_QUERY !== '0',
    auth: String(env.CNR_CADASTRE_AUTH || 'none').trim().toLowerCase(),
    user: env.CNR_CADASTRE_USER || '', password: env.CNR_CADASTRE_PASSWORD || '',
    token: env.CNR_CADASTRE_TOKEN || '', tokenParam: env.CNR_CADASTRE_TOKEN_PARAM || 'token',
    headerName: env.CNR_CADASTRE_HEADER_NAME || '',
    agreement: String(env.CNR_CADASTRE_AGREEMENT || '').trim(),
    attribution: env.CNR_CADASTRE_ATTRIBUTION || 'Centro Nacional de Registros (CNR) · Instituto Geográfico y del Catastro Nacional (IGCN)',
    updated: String(env.CNR_CADASTRE_UPDATED || '').trim(),
    coverage: boxes(env.CNR_CADASTRE_COVERAGE),
    maxSpanDeg: num('CNR_CADASTRE_MAX_SPAN_DEG', 0.05),
    keyField: String(env.CNR_CADASTRE_KEY_FIELD || '').trim(),
    allowOwnerFields: env.CNR_CADASTRE_ALLOW_OWNER_FIELDS === '1',
    timeoutMs: int('CNR_CADASTRE_TIMEOUT_MS', 15000),
    rateMax: int('CNR_CADASTRE_RATE_MAX', 240),
    maxBytes: int('CNR_CADASTRE_MAX_BYTES', 8 * 1024 * 1024)
  };
}

/* Qué falta para conectar la capa (nombres de variables de entorno, nunca valores) */
function cadastreMissing(c){
  const m = [];
  if (!['wms', 'arcgis'].includes(c.protocol)) m.push('CNR_CADASTRE_PROTOCOL');
  if (!/^https:\/\//i.test(c.url)) m.push('CNR_CADASTRE_URL');
  if (!c.layers) m.push('CNR_CADASTRE_LAYERS');
  if (!c.agreement) m.push('CNR_CADASTRE_AGREEMENT');
  if (!CRS_OK.includes(c.crs)) m.push('CNR_CADASTRE_CRS');
  if (!['none', 'basic', 'token', 'header'].includes(c.auth)) m.push('CNR_CADASTRE_AUTH');
  if (c.auth === 'basic' && (!c.user || !c.password)) m.push('CNR_CADASTRE_USER/CNR_CADASTRE_PASSWORD');
  if ((c.auth === 'token' || c.auth === 'header') && !c.token) m.push('CNR_CADASTRE_TOKEN');
  if (c.auth === 'header' && !c.headerName) m.push('CNR_CADASTRE_HEADER_NAME');
  return m;
}

function cadastreStatus(c){
  const missing = cadastreMissing(c);
  return {
    ok: true, connected: missing.length === 0, state: missing.length ? 'pending' : 'ready', missing,
    protocol: missing.length ? null : c.protocol, attribution: c.attribution, updated: c.updated || null,
    domain: SV_DOMAIN, coverage: c.coverage, maxSpanDeg: c.maxSpanDeg,
    queryable: c.queryable && !missing.length, keyField: c.keyField || null, ownerFields: c.allowOwnerFields
  };
}

const R = 6378137, toR = Math.PI / 180;
const merc = (lon, lat) => [R * lon * toR, R * Math.log(Math.tan(Math.PI / 4 + lat * toR / 2))];
/* BBOX en el orden de ejes que exige cada CRS/versión (WMS 1.3.0 + EPSG:4326 = lat,lon) */
function bboxFor(c, [w, s, e, n], wms = c.protocol === 'wms'){
  if (c.crs === 'EPSG:3857') { const a = merc(w, s), b = merc(e, n); return [a[0], a[1], b[0], b[1]]; }
  if (wms && c.version === '1.3.0' && c.crs === 'EPSG:4326') return [s, w, n, e];
  return [w, s, e, n];
}
const srCode = c => c.crs === 'EPSG:3857' ? 3857 : 4326;

function parseView(q, c){
  const bbox = String(q.get('bbox') || '').split(',').map(Number);
  const w = parseInt(q.get('w'), 10), h = parseInt(q.get('h'), 10);
  if (bbox.length !== 4 || !bbox.every(Number.isFinite) || !(bbox[0] < bbox[2] && bbox[1] < bbox[3])) return { error: 'bbox' };
  if (bbox[0] < -180 || bbox[2] > 180 || bbox[1] < -90 || bbox[3] > 90) return { error: 'bbox' };
  if (!(w >= 16 && w <= 2048 && h >= 16 && h <= 2048)) return { error: 'size' };
  const [W, S, E, N] = bbox, D = SV_DOMAIN;
  if (E < D[0] || W > D[2] || N < D[1] || S > D[3]) return { error: 'outside', bbox, w, h };
  if (Math.max(E - W, N - S) > c.maxSpanDeg * 1.05) return { error: 'zoom', bbox, w, h };
  const covered = c.coverage.some(b => W < b[2] && E > b[0] && S < b[3] && N > b[1]);
  return { bbox, w, h, covered };
}

function authed(c, url){
  const headers = { 'User-Agent': 'AGRI-ORBIT cadastre proxy' };
  if (c.auth === 'basic') headers.Authorization = 'Basic ' + Buffer.from(c.user + ':' + c.password).toString('base64');
  if (c.auth === 'header') headers[c.headerName] = c.token;
  if (c.auth === 'token') url.searchParams.set(c.tokenParam, c.token);
  return headers;
}

function mapURL(c, v){
  const u = new URL(c.protocol === 'arcgis' ? c.url + '/export' : c.url), p = u.searchParams, bb = bboxFor(c, v.bbox).join(',');
  if (c.protocol === 'arcgis') {
    Object.entries({ bbox: bb, bboxSR: srCode(c), imageSR: srCode(c), size: v.w + ',' + v.h, format: 'png32', transparent: 'true', layers: 'show:' + c.layers, dpi: '96', f: 'image' }).forEach(([k, x]) => p.set(k, x));
  } else {
    Object.entries({ SERVICE: 'WMS', REQUEST: 'GetMap', VERSION: c.version, LAYERS: c.layers, STYLES: '', [c.version === '1.3.0' ? 'CRS' : 'SRS']: c.crs, BBOX: bb, WIDTH: v.w, HEIGHT: v.h, FORMAT: 'image/png', TRANSPARENT: 'TRUE' }).forEach(([k, x]) => p.set(k, x));
  }
  return u;
}

function identifyURL(c, v, lon, lat){
  const fx = (lon - v.bbox[0]) / (v.bbox[2] - v.bbox[0]);
  const fy = c.crs === 'EPSG:3857' ? (merc(0, v.bbox[3])[1] - merc(0, lat)[1]) / (merc(0, v.bbox[3])[1] - merc(0, v.bbox[1])[1]) : (v.bbox[3] - lat) / (v.bbox[3] - v.bbox[1]);
  const i = Math.max(0, Math.min(v.w - 1, Math.floor(fx * v.w))), j = Math.max(0, Math.min(v.h - 1, Math.floor(fy * v.h)));
  if (c.protocol === 'arcgis') {
    const u = new URL(c.url + '/identify'), pt = c.crs === 'EPSG:3857' ? merc(lon, lat) : [lon, lat];
    Object.entries({ geometry: pt.join(','), geometryType: 'esriGeometryPoint', sr: srCode(c), layers: 'visible:' + c.layers, tolerance: '2',
      mapExtent: bboxFor(c, v.bbox).join(','), imageDisplay: `${v.w},${v.h},96`, returnGeometry: 'false', f: 'json' }).forEach(([k, x]) => u.searchParams.set(k, x));
    return u;
  }
  const u = mapURL(c, v), p = u.searchParams;
  p.set('REQUEST', 'GetFeatureInfo'); p.set('QUERY_LAYERS', c.layers); p.set('INFO_FORMAT', c.infoFormat); p.set('FEATURE_COUNT', '5');
  p.set(c.version === '1.3.0' ? 'I' : 'X', String(i)); p.set(c.version === '1.3.0' ? 'J' : 'Y', String(j));
  p.delete('TRANSPARENT');
  return u;
}

class UpstreamError extends Error { constructor(kind, status){ super(kind); this.kind = kind; this.status = status; } }

async function upstream(c, url, fetchImpl){
  const headers = authed(c, url), ctl = new AbortController(), to = setTimeout(() => ctl.abort(), c.timeoutMs);
  try {
    const r = await fetchImpl(url.toString(), { headers, signal: ctl.signal, redirect: 'manual' });
    if (r.status === 401 || r.status === 403) throw new UpstreamError('upstream_auth', r.status);
    if (r.status >= 300 && r.status < 400) throw new UpstreamError('upstream_redirect', r.status);
    if (!r.ok) throw new UpstreamError('upstream_error', r.status);
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > c.maxBytes) throw new UpstreamError('upstream_too_large', 502);
    return { type: String(r.headers.get('content-type') || '').toLowerCase(), buf };
  } catch (e) {
    if (e instanceof UpstreamError) throw e;
    if (ctl.signal.aborted || (e && e.name === 'AbortError')) throw new UpstreamError('upstream_timeout', 504);
    throw new UpstreamError('upstream_unreachable', 502);
  } finally { clearTimeout(to); }
}

const decodeXml = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (m, d) => String.fromCharCode(+d)).replace(/&amp;/g, '&');
/* Extrae los registros de atributos tal como los devuelve el servicio */
function parseFeatures(type, text){
  if (/json/.test(type) || /^\s*[{[]/.test(text)) {
    let j; try { j = JSON.parse(text); } catch (e) { return null; }
    if (j && j.error) { const code = +j.error.code; throw new UpstreamError([401, 403, 498, 499].includes(code) ? 'upstream_auth' : 'upstream_exception', 502); }
    if (Array.isArray(j && j.results)) return j.results.map(r => ({ layer: r.layerName || null, attrs: r.attributes || {} }));
    if (Array.isArray(j && j.features)) return j.features.map(f => ({ layer: (f.id && String(f.id).split('.')[0]) || null, attrs: f.properties || f.attributes || {} }));
    return null;
  }
  if (/xml|gml/.test(type) || /^\s*</.test(text)) {
    if (/ServiceException|ExceptionReport/i.test(text)) throw new UpstreamError('upstream_exception', 502);
    const out = [];
    for (const m of text.matchAll(/<FIELDS\s+([^>]*?)\/?>/g)) {
      const attrs = {};
      for (const a of m[1].matchAll(/([\w.:()-]+)\s*=\s*"([^"]*)"/g)) attrs[a[1]] = decodeXml(a[2]);
      out.push({ layer: null, attrs });
    }
    if (out.length || /<FeatureInfoResponse|<FeatureCollection|<msGMLOutput/i.test(text)) return out;
  }
  return null;
}

/* Solo atributos reales y no personales: quita campos técnicos y, salvo autorización, los de propietario/registro */
function cleanFeature(c, f){
  const shown = [], withheld = [], tech = [];
  for (const [k, raw] of Object.entries(f.attrs || {})) {
    if (typeof k !== 'string' || !k || k.length > 80 || k === '__proto__') continue;
    if (TECH_FIELDS.test(k)) { tech.push(k); continue; }
    if (!c.allowOwnerFields && (OWNER_FIELDS.test(k) || REGISTRY_FIELDS.test(k))) { withheld.push(k); continue; }
    if (raw === null || raw === undefined || typeof raw === 'object') continue;
    const v = String(raw).trim().slice(0, 300);            // valor original; el navegador lo escapa al mostrarlo
    if (!v || /^(null|<null>)$/i.test(v)) continue;
    shown.push([k.slice(0, 80), v]);
  }
  const kf = c.keyField ? shown.find(([k]) => k.toLowerCase() === c.keyField.toLowerCase()) : shown.find(([k]) => KEY_FIELD.test(k));
  return { layer: f.layer ? String(f.layer).slice(0, 80) : null, key: kf ? kf[1] : null, keyField: kf ? kf[0] : null, attributes: shown, withheld, technical: tech.length };
}

function createCadastreHandler(c, deps = {}){
  const fetchImpl = deps.fetch || fetch;
  const log = deps.log || (() => {});
  const source = () => ({ name: c.attribution, updated: c.updated || null, kind: 'cadastre', notNasa: true });
  const fail = (json, res, e) => {
    const status = e.status === 504 ? 504 : 502;
    log('cadastre upstream', { kind: e.kind, status: e.status });          // sin URL ni credenciales
    return json(res, status, { error: e.kind });
  };

  async function handleMap(req, res, q, json){
    const v = parseView(q, c);
    if (v.error) return json(res, v.error === 'zoom' ? 409 : v.error === 'outside' ? 422 : 400, { error: v.error, maxSpanDeg: c.maxSpanDeg });
    let up;
    try { up = await upstream(c, mapURL(c, v), fetchImpl); } catch (e) { return fail(json, res, e); }
    if (!/^image\/(png|jpeg|gif|webp)/.test(up.type)) {
      const t = up.buf.toString('utf8', 0, 4000);
      return json(res, 502, { error: /ServiceException|ExceptionReport|"error"/i.test(t) ? 'upstream_exception' : 'upstream_not_image' });
    }
    res.writeHead(200, { 'Content-Type': up.type.split(';')[0], 'Content-Length': up.buf.length, 'Cache-Control': 'private, max-age=300',
      'X-Cadastre-Coverage': v.covered ? 'confirmed' : 'unconfirmed' });
    res.end(up.buf);
  }

  async function handleIdentify(req, res, q, json){
    if (!c.queryable) return json(res, 200, { state: 'unsupported', source: source() });
    const v = parseView(q, c), lon = +q.get('lon'), lat = +q.get('lat');
    if (v.error) return json(res, v.error === 'zoom' ? 409 : v.error === 'outside' ? 422 : 400, { error: v.error, maxSpanDeg: c.maxSpanDeg });
    if (!Number.isFinite(lon) || !Number.isFinite(lat) || lon < v.bbox[0] || lon > v.bbox[2] || lat < v.bbox[1] || lat > v.bbox[3]) return json(res, 400, { error: 'point' });
    let up;
    try { up = await upstream(c, identifyURL(c, v, lon, lat), fetchImpl); } catch (e) { return fail(json, res, e); }
    let feats;
    try { feats = parseFeatures(up.type, up.buf.toString('utf8')); } catch (e) { return fail(json, res, e); }
    const base = { lon, lat, coverage: v.covered ? 'confirmed' : 'unconfirmed', source: source(), queriedAt: new Date().toISOString() };
    if (feats === null) return json(res, 200, { ...base, state: 'unparsed' });
    // Respuesta vacía ≠ "no hay parcela": puede ser un hueco del servicio, un error de tolerancia o una zona sin cobertura
    if (!feats.length) return json(res, 200, { ...base, state: 'none_returned' });
    return json(res, 200, { ...base, state: 'found', features: feats.slice(0, 5).map(f => cleanFeature(c, f)) });
  }

  return async function handle(req, res, url, json){
    const p = url.pathname;
    if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
    if (p === '/api/cadastre/status') return json(res, 200, cadastreStatus(c));
    if (p !== '/api/cadastre/map' && p !== '/api/cadastre/identify') return json(res, 404, { error: 'Not found' });
    if (cadastreMissing(c).length) return json(res, 503, { error: 'pending', state: 'pending' });
    return p === '/api/cadastre/map' ? handleMap(req, res, url.searchParams, json) : handleIdentify(req, res, url.searchParams, json);
  };
}

module.exports = { getCadastreConfig, cadastreStatus, cadastreMissing, createCadastreHandler, bboxFor, parseFeatures, cleanFeature, SV_DOMAIN };
