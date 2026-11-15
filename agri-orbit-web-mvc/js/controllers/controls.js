/* AGRI-ORBIT · js/controllers/controls.js
   Controlador: formularios, deslizadores y botones del panel. */

/* =========================================================
   EVENTOS
   ========================================================= */
function buildSiteSelect(){
  const byC={}; Object.values(SITES).forEach(v=>(byC[siteCountry(v)]=byC[siteCountry(v)]||[]).push(v));
  $('#site').innerHTML = `<option value="globe" disabled>${tr('📍 Point picked on the globe','📍 Punto elegido en el globo')}</option>` + Object.keys(byC).map(c=>`<optgroup label="${c}">${byC[c].map(v=>`<option value="${v.key}">${siteRegion(v)}</option>`).join('')}</optgroup>`).join('');
  $('#site').value = S.siteKey;
}
/* Sincroniza los controles del panel con el estado S (tras cargar el caso) */
function setSeg(id,v){ $(id).querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.v==String(v))); }
function syncControlsUI(){
  setSeg('#texture',S.texture); setSeg('#irr',S.irr); setSeg('#len',S.L);
  $('#om').value=S.om; $('#ph').value=S.ph; $('#slope').value=S.slope;
  $('#scen').value=SCEN[S.scen]?S.scen:'custom'; $('#s-dT').value=S.dT; $('#s-dP').value=S.dP;
  ['econ','soil','water','risk','forage'].forEach(k=>{ $('#p-'+k).value=S.prio[k]; });
  $('#lat').value=S.site.lat.toFixed(2); $('#lon').value=S.site.lon.toFixed(2);
}
/* Caso de demostración: Corredor Seco de Chiquimula, Guatemala */
function runChiquimula(){
  const f=CASE.farm;
  Object.assign(S,{texture:f.texture,om:f.om,ph:f.ph,slope:f.slope,irr:f.irr,L:f.L,
    scen:f.scen,dT:SCEN[f.scen].dT,dP:SCEN[f.scen].dP,prio:{...CASE.prio},casePrio:'water',
    excluded:new Set(),custom:null,current:null,sel:0,cmp:'base'});
  if (S.siteKey!==CASE.siteKey) selectSite(CASE.siteKey,false);
  else recompute();
  if (G.proj) flyTo(S.site.lon,S.site.lat);
  syncControlsUI();
  const rm=matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.getElementById('s-caso').scrollIntoView({behavior:rm?'auto':'smooth'});
  toast(tr('Chiquimula case loaded: compare the base rotation with two alternatives','Caso Chiquimula cargado: compara la rotación base con dos alternativas'));
}

/* Panel de la finca: lateral en escritorio, cajón con «Editar finca» en pantallas angostas */
const farmDrawer = () => matchMedia('(max-width:1180px)').matches;
function setFarmOpen(open, focus=true){
  const a=$('#s-config'), b=$('#editFarm'), sc=$('#farmScrim'); if (!a) return;
  a.classList.toggle('open',open); if (b) b.setAttribute('aria-expanded',String(open));
  if (sc) sc.hidden=!open;
  document.body.classList.toggle('farm-open',open);
  if (!focus) return;
  if (open){ const c=$('#closeFarm'); if (c) c.focus(); } else if (b && farmDrawer()) b.focus();
}
function initFarmPanel(){
  const b=$('#editFarm'); if (!b) return;
  b.onclick=()=>setFarmOpen(true);
  $('#closeFarm').onclick=()=>setFarmOpen(false);
  $('#farmScrim').onclick=()=>setFarmOpen(false);
  document.addEventListener('keydown',e=>{ if (e.key==='Escape' && $('#s-config').classList.contains('open')) setFarmOpen(false); });
  document.querySelectorAll('a[href="#s-config"]').forEach(a=>a.addEventListener('click',e=>{ if (farmDrawer()){ e.preventDefault(); setFarmOpen(true); } }));
  matchMedia('(max-width:1180px)').addEventListener('change',m=>{ if (!m.matches) setFarmOpen(false,false); });
}

function initControls(){
  buildSiteSelect();
  initFarmPanel();
  const cb=$('#caseBtn'); if (cb) cb.onclick=runChiquimula;
  $('#site').onchange=e=>selectSite(e.target.value);
  $('#goCoord').onclick=()=>{ const lat=+$('#lat').value, lon=+$('#lon').value;
    if (!isFinite(lat)||!isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180){ toast(tr('Invalid coordinates','Coordenadas no válidas')); return; }
    const f = G.ready ? countryAt(lon,lat) : null; pickPoint(lon,lat,f); flyTo(lon,lat); };
  $('#scen').onchange=e=>{ S.scen=e.target.value; if (SCEN[S.scen]){ S.dT=SCEN[S.scen].dT; S.dP=SCEN[S.scen].dP; $('#s-dT').value=S.dT; $('#s-dP').value=S.dP; } recompute(); };
  ['dT','dP'].forEach(k=>$('#s-'+k).oninput=e=>{ S[k]=+e.target.value; const m=Object.keys(SCEN).find(q=>SCEN[q].dT===S.dT&&SCEN[q].dP===S.dP); S.scen=m||'custom'; $('#scen').value=S.scen; recompute(); });
  const seg=(id,key,num)=>$(id).querySelectorAll('button').forEach(b=>b.onclick=()=>{
    $(id).querySelectorAll('button').forEach(x=>x.classList.remove('on')); b.classList.add('on');
    S[key]= num ? +b.dataset.v : b.dataset.v;
    if (key==='L'){ S.custom = S.custom ? S.custom.slice(0,S.L).concat(Array(Math.max(0,S.L-S.custom.length)).fill('frijol')) : null; S.year=0; $('#year').value=0; }
    recompute();
  });
  seg('#texture','texture'); seg('#irr','irr'); seg('#len','L',true);
  $('#layer').querySelectorAll('button').forEach(b=>b.onclick=()=>{ $('#layer').querySelectorAll('button').forEach(x=>x.classList.remove('on')); b.classList.add('on'); S.layer=b.dataset.v; renderMap(); });
  ['om','ph','slope'].forEach(k=>$('#'+k).oninput=e=>{ const v=parseFloat(e.target.value); if(!isNaN(v)){S[k]=v; recompute();} });
  ['econ','soil','water','risk','forage'].forEach(k=>$('#p-'+k).oninput=e=>{ S.prio[k]=+e.target.value; $('#v-'+k).textContent=S.prio[k]; recompute(); });
  $('#cmp').onchange=e=>{ S.cmp = e.target.value==='base'||e.target.value==='custom' ? e.target.value : +e.target.value; renderTrade(); renderRisk(); renderFan(); renderWhy(); };
  $('#year').oninput=e=>{ S.year=+e.target.value; renderMap(); };
  let playing=null;
  $('#play').onclick=()=>{
    if (playing){ clearInterval(playing); playing=null; $('#play').textContent='▶'; return; }
    $('#play').textContent='❚❚';
    playing=setInterval(()=>{ const L=getSel().seq.length; S.year=(S.year+1)%(2*L); $('#year').value=S.year; renderMap(); },1100);
  };
  $('#fetchBtn').onclick=()=>loadLive(true);
  $('#liveRefresh').onclick=()=>loadLive(true);
  const exportTxt=()=>{
    const R=getSel(), s=S.site;
    return tr(
`ROTATION PLAN — AGRI-ORBIT
Site: ${siteName(s)} (${s.lat.toFixed(2)}, ${s.lon.toFixed(2)})
Climate: ${S.live?'NASA POWER':'reference values'} · Scenario: ${scen().lbl}
Soil: ${texLbl(S.texture)}, O.M. ${S.om} %, pH ${S.ph}, slope ${S.slope} %, irrigation: ${irrLbl(S.irr)}
Priorities: profit ${S.prio.econ}, soil ${S.prio.soil}, water ${S.prio.water}, stability ${S.prio.risk}

Chosen rotation: ${seqTxt(R.seq)}
Scores (relative indices 0–100) — economics ${r0(R.m.econ)}, water ${r0(R.m.water)}, soil ${r0(R.m.soil)}, stability ${r0(R.m.resil)}
Water deficit: ${r0(R.m.deficit)} mm/cycle estimated · irrigation applied ${r0(R.m.irrigation)} mm · remaining ${r0(R.m.deficitRem)} mm · N fertilizer: ${r0(R.m.nFert)} kg/ha/cycle

Why:
`,
`PLAN DE ROTACIÓN — AGRI-ORBIT
Sitio: ${siteName(s)} (${s.lat.toFixed(2)}, ${s.lon.toFixed(2)})
Clima: ${S.live?'NASA POWER':'valores de referencia'} · Escenario: ${scen().lbl}
Suelo: ${texLbl(S.texture)}, M.O. ${S.om} %, pH ${S.ph}, pendiente ${S.slope} %, riego: ${irrLbl(S.irr)}
Prioridades: ganancia ${S.prio.econ}, suelo ${S.prio.soil}, agua ${S.prio.water}, estabilidad ${S.prio.risk}

Rotación elegida: ${seqTxt(R.seq)}
Puntajes (índices relativos 0–100) — economía ${r0(R.m.econ)}, agua ${r0(R.m.water)}, suelo ${r0(R.m.soil)}, estabilidad ${r0(R.m.resil)}
Déficit de agua: ${r0(R.m.deficit)} mm/ciclo estimado · riego aplicado ${r0(R.m.irrigation)} mm · restante ${r0(R.m.deficitRem)} mm · Fertilizante N: ${r0(R.m.nFert)} kg/ha/ciclo

Por qué:
`) + reasons(R).map(r=>'- '+r[1].replace(/<[^>]+>/g,'')).join('\n');
  };
  const copy=async(text)=>{
    try{ await navigator.clipboard.writeText(text); toast(tr('Copied to clipboard','Copiado al portapapeles')); $('#exportBox').style.display='none'; }
    catch(e){ const box=$('#exportBox'); box.style.display='block'; box.value=text; box.focus(); box.select(); toast(tr('Select and copy the text','Selecciona y copia el texto')); }
  };
  $('#copyTxt').onclick=()=>copy(exportTxt());
  $('#copyJson').onclick=()=>copy(JSON.stringify(buildPlanJSON(),null,2));
  window.addEventListener('resize',()=>renderTrade());
}
