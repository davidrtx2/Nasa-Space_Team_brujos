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
function initControls(){
  buildSiteSelect();
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
Scores — economics ${r0(R.m.econ)}, water ${r0(R.m.water)}, soil ${r0(R.m.soil)}, stability ${r0(R.m.resil)}
Irrigation needed: ${r0(R.m.irrigation)} mm/cycle · N fertilizer: ${r0(R.m.nFert)} kg/ha/cycle

Why:
`,
`PLAN DE ROTACIÓN — AGRI-ORBIT
Sitio: ${siteName(s)} (${s.lat.toFixed(2)}, ${s.lon.toFixed(2)})
Clima: ${S.live?'NASA POWER':'valores de referencia'} · Escenario: ${scen().lbl}
Suelo: ${texLbl(S.texture)}, M.O. ${S.om} %, pH ${S.ph}, pendiente ${S.slope} %, riego: ${irrLbl(S.irr)}
Prioridades: ganancia ${S.prio.econ}, suelo ${S.prio.soil}, agua ${S.prio.water}, estabilidad ${S.prio.risk}

Rotación elegida: ${seqTxt(R.seq)}
Puntajes — economía ${r0(R.m.econ)}, agua ${r0(R.m.water)}, suelo ${r0(R.m.soil)}, estabilidad ${r0(R.m.resil)}
Riego necesario: ${r0(R.m.irrigation)} mm/ciclo · Fertilizante N: ${r0(R.m.nFert)} kg/ha/ciclo

Por qué:
`) + reasons(R).map(r=>'- '+r[1].replace(/<[^>]+>/g,'')).join('\n');
  };
  const copy=async(text)=>{
    try{ await navigator.clipboard.writeText(text); toast(tr('Copied to clipboard','Copiado al portapapeles')); $('#exportBox').style.display='none'; }
    catch(e){ const box=$('#exportBox'); box.style.display='block'; box.value=text; box.focus(); box.select(); toast(tr('Select and copy the text','Selecciona y copia el texto')); }
  };
  $('#copyTxt').onclick=()=>copy(exportTxt());
  $('#copyJson').onclick=()=>{ const R=getSel(); copy(JSON.stringify({site:{name:siteName(S.site),lat:S.site.lat,lon:S.site.lon,live:S.live},scenario:S.scen,soil:{texture:S.texture,om:S.om,ph:S.ph,slope:S.slope,irrigation:S.irr},priorities:S.prio,rotation:R.seq,metrics:Object.fromEntries(Object.entries(R.m).map(([k,v])=>[k,typeof v==='number'?+v.toFixed(1):v])),parcels:PARCELS.map(p=>({id:'P-'+String(p.k+1).padStart(2,'0'),plan:Array.from({length:2*R.seq.length},(_,t)=>parcelCrop(R,p.k,t))}))},null,2)); };
  window.addEventListener('resize',()=>renderTrade());
}
