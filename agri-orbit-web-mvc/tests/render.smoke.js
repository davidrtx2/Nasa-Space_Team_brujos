/* AGRI-ORBIT · tests/render.smoke.js
   Ejecuta el flujo de renderizado del caso con un DOM mínimo:
   detecta ReferenceError/TypeError en las vistas nuevas/modificadas.
   Uso: node tests/render.smoke.js                                     */
'use strict';
const fs=require('fs'), path=require('path');
const root=path.join(__dirname,'..');
const files=['js/i18n.js','js/utils.js','js/models/data.js','js/models/calendar.js',
  'js/models/engine.js','js/models/nasa.js','js/models/state.js',
  'js/views/map.js','js/views/dashboard.js','js/views/analysis.js',
  'js/views/calendar.js','js/views/compare.js','js/views/case.js','js/views/live.js'];
const code=files.map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n');

const dom=`
const _els={};
function mkEl(){ const el={innerHTML:'',textContent:'',value:'',tabIndex:0,dataset:{},style:{},
  className:'', classList:{add(){},remove(){},toggle(){},contains:()=>false},
  setAttribute(){}, insertAdjacentHTML(){}, appendChild(){}, scrollIntoView(){},
  querySelectorAll:()=>[], querySelector:()=>mkEl(), getContext:()=>null,
  onclick:null,onchange:null,oninput:null,onkeydown:null,remove(){},cloneNode:()=>mkEl(),closest:()=>null,insertBefore(){},replaceChild(){},children:[],firstChild:null}; return el; }
const document={ documentElement:{lang:'en'}, title:'',
  querySelector:s=>{ if(!_els[s])_els[s]=mkEl(); return _els[s]; },
  querySelectorAll:()=>[], createElement:()=>mkEl(),
  getElementById:id=>document.querySelector('#'+id) };
const localStorage={getItem:()=>null,setItem(){},removeItem(){}};
const matchMedia=()=>({matches:false});
const navigator={language:'es-GT'};
const window={matchMedia,addEventListener(){},innerWidth:1200};
const d3={};  // no se usa en estas vistas
`;

const run=`
buildParcels();
S.siteKey='corredor'; S.site={...SITES.corredor}; S.current=null;
Object.assign(S,{texture:'franco',om:2.5,ph:6.2,slope:8,irr:'none',L:4,scen:'moderado',dT:1,dP:-5,prio:{...CASE_PRIO.water.prio},casePrio:'water'});
setLang('es',false);
runEngine();
// vistas que usa el flujo del caso (sin globo)
renderClimate(); renderKPIs(); renderCompare(); renderCase(); renderCalendar(); renderMap();
renderLive('ok');
// ambas prioridades del caso
S.casePrio='soil'; S.prio={...CASE_PRIO.soil.prio}; runEngine(); renderCase();
// ambos idiomas
setLang('en',false); renderCase(); renderLive('ok');
setLang('es',false);
// punto del globo (fuera del caso) → aviso, sin error
S.site={...SITES.corredor,key:'globe',refKey:'oriente'}; S.siteKey='globe'; runEngine(); renderCase();
// modo instantánea sin IMERG
LIVE.mode='snap'; renderCase();
return 'RENDER_OK';
`;

try{
  const out=eval(dom+code+';(function(){'+run+'})()');
  console.log(out);
}catch(e){
  console.log('RENDER_FAIL:',e.stack.split('\n').slice(0,4).join('\n'));
  process.exit(1);
}
