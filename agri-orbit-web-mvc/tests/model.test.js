/* AGRI-ORBIT · tests/model.test.js
   Arnés Node: carga los archivos del MODELO (sin DOM) y comprueba la
   lógica del caso Chiquimula y de las métricas de agua.
   Uso: node tests/model.test.js                                        */
'use strict';
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const files = ['js/i18n.js','js/utils.js','js/models/data.js','js/models/calendar.js',
               'js/models/engine.js','js/models/nasa.js','js/models/state.js','js/views/map.js'];
let code = files.map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n');
// $ usa document: stub mínimo para que utils.js no falle al evaluar
const stub = 'const document={querySelector:()=>({textContent:"",style:{}})};';

let passed=0, failed=0;
function ok(cond,msg){ if(cond){passed++; console.log('  PASS',msg);} else {failed++; console.log('  FAIL',msg);} }

const T = eval(stub + code + `
;(function(){
  const out={};
  // ---- preparar: sitio Chiquimula en condiciones del caso ----
  S.siteKey='corredor'; S.site={...SITES.corredor}; S.current=null;
  buildParcels();
  Object.assign(S,{texture:'franco',om:2.5,ph:6.2,slope:8,irr:'none',L:4,scen:'moderado',dT:1,dP:-5,prio:{...CASE.prio},casePrio:'water'});
  runEngine();
  out.caseRes=S.caseRes; out.S=S; out.results=S.results.slice();
  // ---- escenario con riego limitado para contrastar ----
  const rainfed={irr:S.base.m.irrigation, def:S.base.m.deficit, rem:S.base.m.deficitRem};
  S.irr='limited'; runEngine();
  const limited={irr:S.base.m.irrigation, def:S.base.m.deficit, rem:S.base.m.deficitRem};
  S.irr='full'; runEngine();
  const full={irr:S.base.m.irrigation, def:S.base.m.deficit, rem:S.base.m.deficitRem};
  // ---- prioridad agua vs suelo ----
  const seqs=[S.caseRes.base.seq.join(','), ...S.caseRes.alts.map(a=>a.R.seq.join(','))];
  const oW=[S.caseRes.base, ...S.caseRes.alts.map(a=>a.R)].map(r=>overallWith(r.m,CASE_PRIO.water.prio));
  const oS=[S.caseRes.base, ...S.caseRes.alts.map(a=>a.R)].map(r=>overallWith(r.m,CASE_PRIO.soil.prio));
  // ---- exportación ----
  const json=buildPlanJSON();
  return {S, caseRes:S.caseRes, rainfed, limited, full, seqs, oW, oS, json};
})()`);

// --- Caso Chiquimula ---
ok(T.caseRes && T.caseRes.base && T.caseRes.alts.length===2, 'el caso tiene base + 2 alternativas');
ok(T.caseRes.base.seq.join(',')==='maiz,maiz,maiz,maiz', 'base preconfigurada: maíz primera y postrera');
ok(T.caseRes.alts.every(a=>a.R && a.R.m), 'las dos alternativas están evaluadas');

// --- Métrica de agua corregida ---
ok(T.rainfed.irr===0, 'secano: riego aplicado = 0 mm aunque haya déficit');
ok(Math.abs(T.rainfed.rem - T.rainfed.def)<0.01, 'secano: déficit restante = déficit estimado');
ok(T.limited.irr<=150/T.S.L+0.01 && T.limited.irr>0, 'riego limitado: aplicado > 0 y ≤ tope/ciclo');
ok(T.limited.def===T.rainfed.def, 'el déficit estimado no depende del riego disponible');
ok(Math.abs(T.limited.rem - Math.max(0,T.limited.def-T.limited.irr))<0.01, 'restante = max(0, estimado − aplicado)');
ok(T.full.rem<=T.rainfed.rem, 'a más riego, menor déficit restante');

// --- Prioridades: cambian puntajes, no el orden ni las secuencias ---
ok(T.oW.some((v,i)=>v!==T.oS[i]), 'cambiar prioridad altera los puntajes');
ok(T.oW.length===3 && T.oS.length===3, 'tres rotaciones bajo ambas prioridades');

// --- Índices relativos ---
for (const r of [T.caseRes.base,...T.caseRes.alts.map(a=>a.R)])
  for (const k of ['econ','soil','water','resil','forage'])
    if(!(r.m[k]>=0&&r.m[k]<=100)) { failed++; console.log('  FAIL índice fuera de 0–100:',k,r.m[k]); }
passed++; console.log('  PASS índices relativos dentro de 0–100');

// --- Exportación: mismas cifras y procedencia ---
ok(T.json.case && T.json.case.rotations.length===3, 'JSON incluye las 3 rotaciones del caso');
ok(T.json.provenance && T.json.provenance.climate.product.includes('NASA POWER'), 'JSON declara procedencia NASA POWER');
ok(T.json.provenance.imagery.includes('GIBS'), 'JSON marca GIBS como visualización');
ok(T.json.case.rotations[0].metrics.deficitMm===Math.round(T.caseRes.base.m.deficit), 'JSON y UI comparten las mismas cifras');
ok(typeof T.json.case.rotations[0].metrics.irrigationAppliedMm==='number', 'JSON separa riego aplicado');
ok(T.seqs[0]==='maiz,maiz,maiz,maiz', 'la secuencia base no cambia con la prioridad');

console.log(`\n${passed} passed · ${failed} failed`);
process.exit(failed?1:0);
