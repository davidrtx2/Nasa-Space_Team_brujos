/* AGRI-ORBIT · tests/cadastre.test.js
   Tarjeta del catastro CNR (frontend) y estado "pendiente" del backend.
   Uso: node tests/cadastre.test.js */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
const root = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };

const files = ['js/i18n.js','js/utils.js','js/models/data.js','js/models/state.js','js/models/nasa.js','js/models/cadastre.js','js/views/cadastre.js'];
const dom = `
const _els={};
function mkEl(){ return {innerHTML:'',textContent:'',dataset:{},style:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){},querySelectorAll:()=>[],getBoundingClientRect:()=>({left:0,top:0,width:640,height:400}),closest:()=>null}; }
const document={documentElement:{lang:'en'},title:'',querySelector:s=>(_els[s]=_els[s]||mkEl()),querySelectorAll:()=>[],getElementById:id=>document.querySelector('#'+id)};
const localStorage={getItem:()=>null,setItem(){}}; const window={}; const matchMedia=()=>({matches:false});
`;
const code = files.map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
const T = eval(dom + code + `;(function(){
  setLang('es', false);
  const out = {};
  S.site = {...SITES.sanmiguel};
  CAD.state = 'pending'; CAD.status = {connected:false, missing:['CNR_CADASTRE_URL','CNR_CADASTRE_AGREEMENT'], attribution:'CNR'};
  renderCadastre(true); out.pending = _els['#cadBody'].innerHTML;
  CAD.state = 'nobackend'; renderCadastre(true); out.nob = _els['#cadBody'].innerHTML;
  CAD.state = 'ready'; CAD.base = 'http://localhost:8787/api/cadastre'; CAD.status = {connected:true, attribution:'CNR <b>', maxSpanDeg:0.05};
  renderCadastre(true); out.ready = _els['#cadBody'].innerHTML; out.view = CAD.view;
  CAD.infoState = 'found'; CAD.info = {coverage:'unconfirmed', features:[{key:'X1', keyField:'clave_catastral', attributes:[['uso','<img src=x onerror=alert(1)>']], withheld:['propietario']}]};
  out.info = cadInfoHTML();
  CAD.infoState = 'none_returned'; out.none = cadInfoHTML();
  S.site = {...SITES.corredor}; renderCadastre(true); out.outside = _els['#cadBody'].innerHTML;
  out.inSV = [cadInSV(-88.18,13.48), cadInSV(-89.54,14.80)];
  return out;
})()`);
ok(T.pending.includes('pendiente de conexión') && T.pending.includes('CNR_CADASTRE_URL') && T.pending.includes('CNR_CADASTRE_AGREEMENT'), 'pendiente lista variables faltantes');
ok(T.nob.includes('no disponible'), 'sin backend lo indica');
ok(T.ready.includes('/api/cadastre/map?bbox=') && T.ready.includes('&amp;w=640&amp;h=400'), 'pide la imagen al backend');
ok(!T.ready.includes('CNR <b>') && T.ready.includes('CNR &lt;b&gt;'), 'atribución escapada');
ok(Math.abs((T.view.bbox[2]-T.view.bbox[0]) - 0.02) < 1e-6, 'vista dentro del ancho máximo');
ok(!T.info.includes('<img') && T.info.includes('&lt;img') && T.info.includes('X1') && T.info.includes('1 campos'), 'atributos escapados y campos personales ocultos');
ok(T.none.includes('no significa que no exista'), 'respuesta vacía no se presenta como "sin parcela"');
ok(T.outside.includes('solo cubre El Salvador') && T.outside.includes('cadGoSV'), 'fuera de El Salvador ofrece ir a un sitio salvadoreño');
ok(T.inSV[0] === true && T.inSV[1] === false, 'extensión de El Salvador');

const { createServer } = require('../server/index.js');
const { getConfig } = require('../server/lib/config.js');
const { getCadastreConfig } = require('../server/lib/cadastre.js');
const srv = createServer({ ...getConfig({}), serveStatic: false, cadastre: getCadastreConfig({}) }, { log: () => {} });
const get = (p, h = {}) => new Promise(res => http.get({ port: srv.address().port, path: p, headers: h }, r => { let t = ''; r.on('data', d => t += d); r.on('end', () => res({ status: r.statusCode, t, h: r.headers })); }));
srv.listen(0, async () => {
  const s = await get('/api/cadastre/status');
  const j = JSON.parse(s.t);
  ok(s.status === 200 && j.state === 'pending' && j.missing.includes('CNR_CADASTRE_URL'), 'backend: estado pendiente sin configuración');
  const m = await get('/api/cadastre/map?bbox=-88.19,13.47,-88.17,13.49&w=640&h=400');
  ok(m.status === 503, 'backend: /map responde 503 mientras está pendiente');
  const c = await get('/api/cadastre/status', { Origin: 'http://127.0.0.1:5501', Host: 'localhost:8787' });
  ok(c.h['access-control-allow-origin'] === 'http://127.0.0.1:5501', 'backend: Live Server local puede consultar el catastro');
  srv.close();
  console.log(`\n${pass} passed · ${fail} failed`);
  process.exit(fail ? 1 : 0);
});
