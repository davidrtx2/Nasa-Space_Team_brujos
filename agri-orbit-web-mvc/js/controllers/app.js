/* AGRI-ORBIT · js/controllers/app.js
   Controlador principal: orquesta el motor, las vistas y el arranque. */

function renderDependent(){
  renderRanking(); renderKPIs(); renderCmpSelect(); renderTrade(); renderRisk(); renderFan(); renderCompare(); renderCalendar(); renderMap(); renderBuilder();
  if (typeof renderCase==='function') renderCase();
}
function renderAll(){
  renderStrip(); renderClimate(); renderDependent(); renderFoot();
  $('#v-econ').textContent=S.prio.econ; $('#v-soil').textContent=S.prio.soil; $('#v-water').textContent=S.prio.water; $('#v-risk').textContent=S.prio.risk; $('#v-forage').textContent=S.prio.forage; renderCurrent(); renderMkt();
  $('#v-dT').textContent=(S.dT>0?'+':'')+S.dT+' °C'; $('#v-dP').textContent=(S.dP>0?'+':'')+S.dP+' %';
  $('#srcPower').textContent = LIVE.mode==='live' ? tr('live','en vivo') : tr('built-in','integrado');
  if (typeof renderAgriAI==='function') renderAgriAI();
  if (typeof renderCadastre==='function') renderCadastre();
}
let tmr; function recompute(){ clearTimeout(tmr); tmr=setTimeout(()=>{ runEngine(); renderAll(); if (G.proj) renderPlace(); },90); }

initLang();
buildParcels();
initChrome();
initControls();
if (matchMedia('(prefers-reduced-motion: reduce)').matches){
  const cv=document.getElementById('constel'); if (cv && cv.pauseAnimations) cv.pauseAnimations();
}
runEngine();
renderAll();
renderPlace();
initGlobe();
loadTextures(); initConstellation(); decorateSections();
scheduleLive();
if (typeof initAgriAI==='function') initAgriAI();
if (typeof initCadastre==='function') initCadastre();
