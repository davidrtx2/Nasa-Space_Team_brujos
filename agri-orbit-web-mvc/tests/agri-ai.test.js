/* AGRI-ORBIT · tests/agri-ai.test.js
   Pruebas del frontend de AGRI-AI (contexto, cliente, vista y controlador) con un DOM
   mínimo, más una prueba de integración real: navegador simulado → backend (server/)
   → proveedor compatible con OpenAI simulado por HTTP.
   Uso: node tests/agri-ai.test.js                                              */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), http = require('http');
const root = path.join(__dirname, '..');
const files = ['js/i18n.js','js/utils.js','js/models/data.js','js/models/calendar.js',
  'js/models/engine.js','js/models/nasa.js','js/models/state.js','js/views/map.js',
  'js/models/aiContext.js','js/models/aiClient.js','js/views/agriAI.js','js/controllers/agriAI.js'];

let passed = 0, failed = 0;
function ok(cond, msg){ if (cond) { passed++; console.log('  PASS', msg); } else { failed++; console.log('  FAIL', msg); } }

/* ---------- DOM mínimo ---------- */
const els = {};
function mkEl(id){
  const cls = new Set();
  return { id, innerHTML:'', textContent:'', value:'', hidden:true, disabled:false, dataset:{}, style:{}, attrs:{},
    scrollTop:0, scrollHeight:0, content:'',
    classList:{ add:c=>cls.add(c), remove:c=>cls.delete(c), toggle:(c,f)=>{ (f===undefined?!cls.has(c):f)?cls.add(c):cls.delete(c); }, contains:c=>cls.has(c) },
    setAttribute(k,v){ this.attrs[k]=String(v); }, getAttribute(k){ return this.attrs[k] ?? null; },
    focus(){}, querySelectorAll:()=>[], querySelector:()=>null, closest:()=>null };
}
const docListeners = {}, winListeners = {};
const document = { documentElement:{lang:'es'}, title:'',
  querySelector: s => { if (s === 'nav.top a.active' || s === 'meta[name="agri-ai-endpoint"]') return null; if (!els[s]) els[s] = mkEl(s); return els[s]; },
  querySelectorAll: () => [], createElement: () => mkEl(),
  getElementById: id => document.querySelector('#' + id),
  addEventListener: (t, f) => { docListeners[t] = f; } };
const fetchMock = { impl: null };
const sandbox = {
  console, document, setTimeout, clearTimeout, setInterval, clearInterval, AbortController, URL,
  localStorage: { getItem:()=>null, setItem(){}, removeItem(){} },
  navigator: { language:'es-GT', onLine:true },
  window: { addEventListener:(t,f)=>{ winListeners[t]=f; }, matchMedia:()=>({matches:false}), innerWidth:1200 },
  matchMedia: () => ({matches:false}),
  fetch: (...a) => fetchMock.impl ? fetchMock.impl(...a) : fetch(...a)
};
vm.createContext(sandbox);
for (const f of files) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), sandbox, { filename: f });
const run = code => vm.runInContext(code, sandbox);

run(`buildParcels();
S.siteKey='corredor'; S.site={...SITES.corredor}; S.current=null;
Object.assign(S,{texture:'franco',om:2.5,ph:6.2,slope:8,irr:'none',L:4,scen:'moderado',dT:1,dP:-5,prio:{...CASE_PRIO.water.prio},casePrio:'water'});
setLang('es',false); runEngine();`);

const jsonRes = (status, obj) => Promise.resolve({ ok: status >= 200 && status < 300, status, json: async () => obj });

/* Saneador real del backend: el contexto del frontend debe pasar sin perder campos */
const { sanitizeContext, LIMITS } = require('../server/lib/validate');
const sameShape = (a, b) => JSON.stringify(a) === JSON.stringify(b);

(async () => {
  console.log('AGRI-AI · contexto');
  const snap = run(`JSON.stringify({site:S.site,ph:S.ph,om:S.om,irr:S.irr,prio:S.prio,results:S.results.map(r=>r.seq),sel:S.sel,cmp:S.cmp,lang:LANG})`);
  const all = run(`buildAIContext('Analiza mi terreno, el clima, los datos de NASA, el calendario, las prioridades y compara las rotaciones')`);
  ok(run(`JSON.stringify({site:S.site,ph:S.ph,om:S.om,irr:S.irr,prio:S.prio,results:S.results.map(r=>r.seq),sel:S.sel,cmp:S.cmp,lang:LANG})`) === snap, 'buildAIContext no modifica el estado S');
  ok(all.site && all.site.lat === 14.8 && all.site.country, 'incluye región, país y coordenadas');
  ok(all.soilFarmerInput.pH === 6.2 && all.soilFarmerInput.organicMatterPct === 2.5 && all.soilFarmerInput.slopePct === 8, 'incluye pH, materia orgánica y pendiente del agricultor');
  ok(all.climate && typeof all.climate.annualRainfallMm === 'number' && /reference|POWER/.test(all.climate.source), 'clima con procedencia explícita');
  ok(all.results && all.results.topOptions.length >= 1 && typeof all.results.topOptions[0].scores.overall === 'number', 'resultados de rotación del motor (no inventados)');
  ok(all.results.currentRotation && 'remainingDeficit' in all.results.currentRotation.waterMmPerCycle, 'separa déficit, riego aplicado y déficit restante');
  ok(all.chiquimulaCase && all.chiquimulaCase.alternatives.length === 2, 'incluye el caso Chiquimula con sus 2 alternativas');
  ok(all.priorities && all.priorities.weightsPct, 'incluye prioridades');
  const sz = JSON.stringify(all).length;
  ok(sz < LIMITS.ctxBytes, `contexto completo cabe en el límite del backend (${sz} < ${LIMITS.ctxBytes} bytes)`);
  ok(sameShape(sanitizeContext(all), JSON.parse(JSON.stringify(all))), 'el saneador del backend no elimina campos del contexto real');
  ok(!/email|password|apikey|token/i.test(JSON.stringify(all)), 'sin datos personales ni credenciales en el contexto');

  const nasa = run(`buildAIContext('Explícame los datos de NASA')`);
  ok(nasa.includedSections.includes('nasa') && nasa.climate && nasa.recent && !nasa.chiquimulaCase, 'pregunta NASA → solo secciones relevantes');
  const soil = run(`buildAIContext('¿Cómo puedo mejorar la salud del suelo?')`);
  ok(soil.includedSections.includes('terrain') && soil.results.topOptions, 'pregunta de suelo → terreno + resultados');

  const before = run(`buildAIContext('compara rotaciones').results.topOptions[0].scores`);
  run(`S.ph=4.8; S.irr='limited'; runEngine();`);
  const after = run(`buildAIContext('compara rotaciones')`);
  ok(after.soilFarmerInput.pH === 4.8 && after.soilFarmerInput.irrigationCapMmPerCycle === 150, 'cambiar pH/riego actualiza el contexto');
  ok(JSON.stringify(after.results.topOptions[0].scores) !== JSON.stringify(before), 'resultados del contexto se recalculan con los parámetros');
  run(`S.ph=6.2; S.irr='none'; S.prio={...CASE_PRIO.soil.prio}; S.casePrio='soil'; runEngine();`);
  ok(/suelo|soil/i.test(run(`aiContextSummary()`)), 'cambiar prioridades actualiza el resumen del contexto');
  run(`S.prio={...CASE_PRIO.water.prio}; S.casePrio='water'; runEngine();`);
  run(`setLang('en',false)`);
  ok(run(`buildAIContext('x').app.uiLanguage`) === 'en', 'el contexto informa el idioma de la interfaz');
  run(`setLang('es',false)`);

  console.log('AGRI-AI · idioma');
  ok(run(`aiDetectLang('¿Cómo puedo ahorrar agua?')`) === 'es', 'detecta español');
  ok(run(`aiDetectLang('How can I improve the soil?')`) === 'en', 'detecta inglés');

  console.log('AGRI-AI · vista y controlador');
  run(`initAgriAI()`);
  ok(run(`AGRI_AI.endpoint`) === null && run(`AGRI_AI.status`) === 'unconfigured', 'sin endpoint → estado "no configurado"');
  await new Promise(r => setTimeout(r, 5));
  ok(/No configurado/.test(els['#aiStatus'].innerHTML), 'muestra el estado en español');
  ok(/AGRI-AI/.test(els['#aiMsgs'].innerHTML) && (els['#aiMsgs'].innerHTML.match(/data-q=/g) || []).length === 5, 'bienvenida + 5 preguntas rápidas');
  run(`openAgriAI()`);
  ok(els['#aiPanel'].hidden === false && els['#aiFab'].attrs['aria-expanded'] === 'true', 'abre el panel');
  docListeners.keydown({ key: 'Escape' });
  ok(els['#aiPanel'].hidden === true && run(`AGRI_AI.open`) === false, 'Escape cierra el panel');
  run(`toggleAgriAI()`); ok(run(`AGRI_AI.open`) === true, 'el botón flotante alterna apertura'); run(`toggleAgriAI()`);
  run(`setLang('en',false); renderAgriAI();`);
  ok(/Hi! I&#39;m AGRI-AI/.test(els['#aiMsgs'].innerHTML) && /Compare my rotation strategies/.test(els['#aiMsgs'].innerHTML), 'interfaz en inglés al cambiar idioma');
  run(`setLang('es',false); renderAgriAI();`);

  console.log('AGRI-AI · cliente y errores');
  run(`AGRI_AI.endpoint='https://ai.example/api/agri-ai'`);
  let sent = null;
  fetchMock.impl = (url, opts) => { sent = { url, body: JSON.parse(opts.body) }; return jsonRes(200, { reply: '**Hola** <script>x</script>\n- punto' }); };
  await run(`sendAgriAI('¿Cómo puedo ahorrar agua?')`);
  ok(sent.url === 'https://ai.example/api/agri-ai/chat', 'POST al endpoint /chat');
  ok(sent.body.lang === 'es' && sent.body.questionLang === 'es' && sent.body.context.site && sent.body.messages.at(-1).content === '¿Cómo puedo ahorrar agua?', 'envía pregunta, idioma y contexto');
  ok(!('apiKey' in sent.body) && !/sk-/.test(JSON.stringify(sent.body)), 'no envía claves desde el navegador');
  ok(run(`AGRI_AI.history.length`) === 2 && run(`AGRI_AI.status`) === 'online', 'recibe y guarda la respuesta');
  ok(/<b>Hola<\/b>/.test(els['#aiMsgs'].innerHTML) && !/<script>/.test(els['#aiMsgs'].innerHTML) && /<li>punto<\/li>/.test(els['#aiMsgs'].innerHTML), 'formatea Markdown y escapa HTML de la respuesta');

  fetchMock.impl = (url, opts) => { sent = JSON.parse(opts.body); return jsonRes(200, { reply: 'Sure.' }); };
  await run(`sendAgriAI('Compare my rotation strategies.')`);
  ok(sent.messages.length === 3 && sent.messages.filter(m=>m.content==='Compare my rotation strategies.').length === 1 && sent.messages[0].role === 'user' && sent.messages[1].role === 'assistant', 'mantiene historial de la conversación');
  ok(sent.questionLang === 'en' && sent.context.results.topOptions, 'pregunta en inglés + contexto de rotaciones');

  const fails = [
    [() => jsonRes(429, { error: 'x' }), 'rate'],
    [() => jsonRes(503, { error: 'x' }), 'unconfigured'],
    [() => jsonRes(504, { error: 'x' }), 'timeout'],
    [() => jsonRes(500, { error: 'x' }), 'server'],
    [() => jsonRes(200, { nope: 1 }), 'server'],
    [() => Promise.reject(new TypeError('fetch failed')), 'network'],
    [() => Promise.reject(Object.assign(new Error('aborted'), { name: 'AbortError' })), 'timeout']
  ];
  for (const [impl, code] of fails) {
    fetchMock.impl = impl;
    const n = run(`AGRI_AI.history.length`);
    els['#aiInput'].value = '';
    await run(`sendAgriAI('¿Qué cultivo conviene?')`);
    ok(run(`AGRI_AI.error`) === code && run(`AGRI_AI.history.length`) === n && els['#aiInput'].value === '¿Qué cultivo conviene?' && els['#aiMsgs'].innerHTML.includes('aierr'),
      `error "${code}": aviso visible, sin respuesta inventada y la pregunta vuelve al campo`);
  }
  run(`AGRI_AI.status='online'`); sandbox.navigator.onLine = false;
  await run(`sendAgriAI('hola')`);
  ok(run(`AGRI_AI.error`) === 'noconn' && run(`AGRI_AI.status`) === 'noconn', 'sin internet → "necesita conexión"');
  sandbox.navigator.onLine = true;
  ok(run(`aiErrorText('noconn')`).length > 10, 'mensajes de error bilingües');
  ok(run(`typeof runEngine==='function' && S.results.length>0`), 'el motor agronómico sigue funcionando sin IA');

  console.log('AGRI-AI · integración (frontend → backend → proveedor simulado)');
  let upstreamBody = null;
  const upstream = http.createServer((req, res) => {
    let b = ''; req.on('data', c => b += c); req.on('end', () => {
      upstreamBody = { auth: req.headers.authorization, ...JSON.parse(b) };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ choices: [{ message: { content: 'Respuesta del proveedor real (simulado).' } }] }));
    });
  });
  await new Promise(r => upstream.listen(0, '127.0.0.1', r));
  const { createServer } = require('../server/index.js');
  const { getConfig } = require('../server/lib/config');
  const backend = createServer({ ...getConfig({}), apiKey: 'test-key', baseUrl: `http://127.0.0.1:${upstream.address().port}`, model: 'test-model' }, { log: () => {} });
  await new Promise(r => backend.listen(0, '127.0.0.1', r));
  fetchMock.impl = null;
  sandbox.window.AGRI_AI_ENDPOINT = `http://127.0.0.1:${backend.address().port}/api/agri-ai/`;
  run(`AGRI_AI.history=[]; AGRI_AI.error=null;`);
  ok(await run(`aiCheckHealth()`) === 'online', 'health check del backend → en línea');
  await run(`sendAgriAI('Analiza las condiciones de mi terreno.')`);
  ok(run(`AGRI_AI.history.at(-1).content`) === 'Respuesta del proveedor real (simulado).', 'respuesta del proveedor llega a la interfaz');
  ok(upstreamBody.auth === 'Bearer test-key' && upstreamBody.model === 'test-model', 'la clave solo existe en el backend (cabecera al proveedor)');
  ok(upstreamBody.messages[0].role === 'system' && /AGRI-AI/.test(upstreamBody.messages[0].content) && /Answer in Spanish/.test(upstreamBody.messages[0].content), 'prompt del sistema + instrucción de idioma');
  ok(/AGRI-ORBIT CONTEXT/.test(upstreamBody.messages[1].content) && /"pH":6\.2/.test(upstreamBody.messages[1].content), 'el contexto real de AGRI-ORBIT llega al proveedor');
  backend.close(); upstream.close();

  console.log(`\n${passed} passed · ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.log('FAIL (exception):', e.stack); process.exit(1); });
