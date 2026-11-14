/* AGRI-ORBIT · js/controllers/app.js
   Controlador principal: orquesta el motor, las vistas y el arranque. */

function renderDependent(){
  renderRanking(); renderKPIs(); renderCmpSelect(); renderTrade(); renderRisk(); renderFan(); renderCompare(); renderCalendar(); renderMap(); renderBuilder();
}
function renderAll(){
  renderStrip(); renderClimate(); renderDependent(); renderFoot();
  $('#v-econ').textContent=S.prio.econ; $('#v-soil').textContent=S.prio.soil; $('#v-water').textContent=S.prio.water; $('#v-risk').textContent=S.prio.risk; $('#v-forage').textContent=S.prio.forage; renderCurrent(); renderMkt();
  $('#v-dT').textContent=(S.dT>0?'+':'')+S.dT+' °C'; $('#v-dP').textContent=(S.dP>0?'+':'')+S.dP+' %';
  $('#srcPower').textContent = LIVE.mode==='live' ? 'en vivo' : 'integrado';
}
let tmr; function recompute(){ clearTimeout(tmr); tmr=setTimeout(()=>{ runEngine(); renderAll(); if (G.proj) renderPlace(); },90); }

buildParcels();
initChrome();
initControls();
runEngine();
renderAll();
renderPlace();
initGlobe();
loadTextures(); initConstellation(); decorateSections();
scheduleLive();
