/* AGRI-ORBIT · js/models/aiClient.js
   Cliente de AGRI-AI: estado de la conversación y comunicación con el backend.
   El navegador NUNCA guarda claves de API: solo habla con el backend propio
   (server/), que es quien consulta al proveedor de IA. */

const AGRI_AI = {
  endpoint: null,        // URL base del backend, p. ej. https://mi-backend.onrender.com/api/agri-ai
  status: 'unknown',     // unknown | checking | online | offline | unconfigured | noconn
  provider: null, model: null,
  open: false, busy: false, error: null,
  history: [],           // [{role:'user'|'assistant', content, at}]
  MAX_TURNS: 10, MAX_CHARS: 1200, MAX_HISTORY_CHARS: 12000
};

/* Resuelve el endpoint: window.AGRI_AI_ENDPOINT > <meta name="agri-ai-endpoint"> > mismo origen /api/agri-ai */
function aiResolveEndpoint(){
  let ep = (typeof window !== 'undefined' && window.AGRI_AI_ENDPOINT) || '';
  if (!ep && typeof document !== 'undefined' && document.querySelector) {
    const m = document.querySelector('meta[name="agri-ai-endpoint"]');
    ep = (m && m.content) || '';
  }
  if (!ep && typeof location !== 'undefined' && /^https?:$/.test(location.protocol)) ep = '/api/agri-ai';
  return ep ? ep.replace(/\/+$/, '') : null;
}

/* Detección simple del idioma de la pregunta (es/en); null si es ambiguo */
function aiDetectLang(text){
  const s = ' ' + String(text || '').toLowerCase() + ' ';
  if (/[ñ¿¡áéíóú]/.test(s)) return 'es';
  const es = (s.match(/\s(qu[eé]|c[oó]mo|cu[aá]l|por|para|el|la|los|las|mi|mis|de|del|suelo|cultivo|agua|lluvia|es|y|con|puedo)\s/g) || []).length;
  const en = (s.match(/\s(what|how|which|why|the|my|of|is|are|soil|crop|water|rain|and|with|can|should|does)\s/g) || []).length;
  if (es > en) return 'es';
  if (en > es) return 'en';
  return null;
}

async function aiFetch(url, opts = {}, ms = 15000){
  const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), ms);
  try { return await fetch(url, { ...opts, signal: ctl.signal }); }
  finally { clearTimeout(to); }
}

/* Comprueba si el backend está disponible (no consume tokens del proveedor) */
async function aiCheckHealth(){
  AGRI_AI.endpoint = aiResolveEndpoint();
  if (!AGRI_AI.endpoint) { AGRI_AI.status = 'unconfigured'; return AGRI_AI.status; }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) { AGRI_AI.status = 'noconn'; return AGRI_AI.status; }
  AGRI_AI.status = 'checking';
  try {
    const r = await aiFetch(AGRI_AI.endpoint + '/health', { headers: { Accept: 'application/json' } }, 6000);
    const j = r.ok ? await r.json() : null;
    if (j && j.ok && j.configured) { AGRI_AI.status = 'online'; AGRI_AI.provider = j.provider || null; AGRI_AI.model = j.model || null; }
    else AGRI_AI.status = j && j.ok ? 'unconfigured' : 'offline';
  } catch (e) { AGRI_AI.status = 'offline'; }
  return AGRI_AI.status;
}

class AgriAIError extends Error { constructor(code, msg){ super(msg || code); this.code = code; } }

/* Envía la pregunta al backend con el historial reciente y el contexto actual de AGRI-ORBIT */
async function aiAsk(question){
  const q = String(question || '').trim().slice(0, AGRI_AI.MAX_CHARS);
  if (!q) throw new AgriAIError('empty');
  if (!AGRI_AI.endpoint) AGRI_AI.endpoint = aiResolveEndpoint();
  if (!AGRI_AI.endpoint) throw new AgriAIError('unconfigured');
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new AgriAIError('noconn');
  const hist = AGRI_AI.history.slice();
  const last = hist[hist.length - 1];
  if (last && last.role === 'user' && last.content === q) hist.pop();   // la pregunta pendiente ya va al final
  const past = hist.slice(-(AGRI_AI.MAX_TURNS * 2 - 1)).map(m => ({ role: m.role, content: m.content.slice(0, 4000) }));
  let size = past.reduce((n, m) => n + m.content.length, 0);
  while (past.length && size > AGRI_AI.MAX_HISTORY_CHARS) size -= past.shift().content.length;   // sin pasar los límites del backend
  const body = {
    messages: [...past, { role: 'user', content: q }],
    context: buildAIContext(q),
    lang: LANG,
    questionLang: aiDetectLang(q)
  };
  let r;
  try {
    r = await aiFetch(AGRI_AI.endpoint + '/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body)
    }, 45000);
  } catch (e) {
    throw new AgriAIError(e && e.name === 'AbortError' ? 'timeout' : 'network');
  }
  let j = null; try { j = await r.json(); } catch (e) {}
  if (!r.ok) {
    const code = r.status === 429 ? 'rate' : r.status === 503 ? 'unconfigured' : r.status === 504 ? 'timeout' : r.status === 400 || r.status === 413 ? 'invalid' : 'server';
    throw new AgriAIError(code, j && j.error);
  }
  if (!j || typeof j.reply !== 'string' || !j.reply.trim()) throw new AgriAIError('server');
  return j.reply;
}

/* Mensaje de error legible (bilingüe) */
function aiErrorText(code){
  const M = {
    unconfigured: ['The AGRI-AI service is not configured on this deployment. The rest of AGRI-ORBIT keeps working normally.', 'El servicio AGRI-AI no está configurado en este despliegue. El resto de AGRI-ORBIT sigue funcionando con normalidad.'],
    noconn:       ['AGRI-AI needs an internet connection to answer. The offline NASA snapshot keeps the rest of the app working.', 'AGRI-AI necesita conexión a internet para responder. La instantánea NASA sin conexión mantiene funcionando el resto de la aplicación.'],
    network:      ['Could not reach the AGRI-AI service. Check your connection and try again.', 'No se pudo contactar el servicio AGRI-AI. Revisa tu conexión e inténtalo de nuevo.'],
    offline:      ['The AGRI-AI service is not available right now. The rest of AGRI-ORBIT keeps working normally.', 'El servicio AGRI-AI no está disponible en este momento. El resto de AGRI-ORBIT sigue funcionando con normalidad.'],
    timeout:      ['The AI took too long to answer. Please try again.', 'La IA tardó demasiado en responder. Inténtalo de nuevo.'],
    rate:         ['Too many questions in a short time. Wait a minute and try again.', 'Demasiadas preguntas en poco tiempo. Espera un minuto e inténtalo de nuevo.'],
    invalid:      ['The question could not be processed (too long or invalid).', 'No se pudo procesar la pregunta (demasiado larga o no válida).'],
    server:       ['The AI service returned an error. Please try again later.', 'El servicio de IA devolvió un error. Inténtalo más tarde.']
  };
  const m = M[code] || M.server;
  return tr(m[0], m[1]);
}
