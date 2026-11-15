/* AGRI-ORBIT · js/views/chrome.js
   Vistas de página: pie, constelación de satélites, iconos de sección y portada. */

function renderFoot(){
  $('#foot').textContent = `${tr('Rules model','Modelo de reglas')} v0.3 · ${new Date().toLocaleDateString(LANG==='es'?'es':'en')} · ${tr('no personal data','sin datos personales')}`;
}

/* ---------- Constelación de satélites (portada) ---------- */
const SATS = {
  smap:{n:'SMAP', full:'Soil Moisture Active Passive', mide:'Soil moisture across the planet, every 2–3 days.', mideEs:'La humedad del suelo en todo el planeta, cada 2–3 días.', uso:'Root-zone moisture, flash-drought risk and the globe’s “Moisture” layer.', usoEs:'Humedad de raíces, riesgo de sequía relámpago y la capa “Humedad” del globo.', sec:'#livebox'},
  gpm:{n:'GPM', full:'Global Precipitation Measurement · IMERG', mide:'Rainfall across the planet every 30 minutes.', mideEs:'La lluvia en todo el planeta cada 30 minutos.', uso:'Recent rainfall, heavy rain and erosion.', usoEs:'Lluvia reciente, lluvias intensas y erosión.', sec:'#livebox'},
  terra:{n:'Terra · MODIS', full:'Moderate Resolution Imaging Spectroradiometer', mide:'Vegetation greenness (NDVI) every 8 days.', mideEs:'El verdor de la vegetación (NDVI) cada 8 días.', uso:'Vegetation vigor and months with bare soil.', usoEs:'Vigor vegetal y meses con suelo desnudo.', sec:'#livebox'},
  noaa20:{n:'NOAA-20 · VIIRS', full:'Visible Infrared Imaging Radiometer Suite', mide:'True-color images of the whole planet every day.', mideEs:'Imágenes a color real de todo el planeta cada día.', uso:'Yesterday’s clouds, fields and bare soil.', usoEs:'Nubes, campos y suelo desnudo de ayer.', sec:'#s-globo'},
  grace:{n:'GRACE-FO', full:'Gravity Recovery and Climate Experiment Follow-On', mide:'Anomaly of total water storage from Earth’s gravity.', mideEs:'Anomalía del agua total almacenada a partir de la gravedad terrestre.', uso:'Regional context for water depletion when irrigating.', usoEs:'Contexto regional del agotamiento del agua al regar.', sec:'#s-riesgo'},
  landsat:{n:'Landsat 9', full:'Landsat program · NASA / USGS', mide:'30 m imagery: each plot is visible.', mideEs:'Imágenes de 30 m: se distingue cada parcela.', uso:'Next step: NDVI and history of each plot.', usoEs:'Siguiente paso: NDVI e historia de cada parcela.', sec:'#s-mapa'},
  ecostress:{n:'ECOSTRESS', full:'On the International Space Station', mide:'Plant temperature and evapotranspiration.', mideEs:'Temperatura de las plantas y evapotranspiración.', uso:'Next step: calibrating the water each crop uses.', usoEs:'Siguiente paso: calibrar el agua que usa cada cultivo.', sec:'#s-cal'},
  power:{n:'NASA POWER', full:'Prediction Of Worldwide Energy Resources', mide:'Daily and climatology weather: temperature, rainfall, radiation, wind.', mideEs:'Clima diario y normal: temperatura, lluvia, radiación, viento.', uso:'Suitability of each crop, calendar and last 90 days.', usoEs:'Aptitud de cada cultivo, calendario y últimos 90 días.', sec:'#s-cal'}
};
let SATSEL='smap';
function showSat(k){
  SATSEL=k; const s=SATS[k], box=$('#satinfo'); if (!box) return;
  document.querySelectorAll('#constel .sat').forEach(g=>g.classList.toggle('on',g.dataset.s===k));
  box.innerHTML=`<div class="si-k">${tr('MISSION','MISIÓN')}</div><div class="si-n">${s.n}</div><div class="si-f">${s.full}</div><div class="si-r"><b>${tr('What it measures:','Qué mide:')}</b> ${lx(s,'mide')}</div><div class="si-r"><b>${tr('In AGRI-ORBIT:','En AGRI-ORBIT:')}</b> ${lx(s,'uso')}</div><a href="${s.sec}">${tr('See it in the tool ↓','Ver en la herramienta ↓')}</a>`;
}
const refreshSat = () => showSat(SATSEL);
function initConstellation(){
  const box=$('#satinfo'); if (!box) return;
  document.querySelectorAll('#constel .sat').forEach(g=>{ g.addEventListener('click',()=>showSat(g.dataset.s)); g.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); showSat(g.dataset.s);} }); });
  document.querySelectorAll('.satchips button').forEach(b=>b.onclick=()=>showSat(b.dataset.s));
  showSat(SATSEL);
}

/* ---------- Iconos de sección ---------- */
const SEC_ICONS = {
  's-globo':'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>',
  's-ranking':'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  's-why':'<path d="M4 6h16M4 12h10M4 18h7"/><circle cx="19" cy="16" r="3"/>',
  's-cal':'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  's-mapa':'<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>',
  's-tradeoff':'<path d="M12 3v18M5 7l-3 6h6zM19 7l-3 6h6zM5 7h14"/>',
  's-riesgo':'<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>',
  's-incert':'<path d="M3 17c4-1 6-10 9-10s5 9 9 10"/><path d="M3 21h18" />',
  's-fuentes':'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  's-glosario':'<path d="M4 4h12a4 4 0 014 4v12H8a4 4 0 01-4-4z"/><path d="M8 8h8M8 12h6"/>'
};
function decorateSections(){
  for (const id in SEC_ICONS){ const h=document.querySelector('#'+id+' .hd h2'); if (h && !h.querySelector('.sicon')) h.insertAdjacentHTML('afterbegin',`<svg class="sicon" viewBox="0 0 24 24" aria-hidden="true">${SEC_ICONS[id]}</svg>`); }
  const bar=document.getElementById('scrollbar');
  const top=document.getElementById('totop');
  if (top) top.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));
  window.addEventListener('scroll',()=>{ const d=document.documentElement; if (bar) bar.style.width=(100*d.scrollTop/Math.max(1,d.scrollHeight-d.clientHeight))+'%'; if (top) top.classList.toggle('show',d.scrollTop>900); },{passive:true});
}

function renderHeroStats(){
  if (!document.getElementById('heroStats')) return;
  const nCountries=new Set(Object.values(SITES).filter(s=>s.country!=='EE. UU.').map(s=>s.country)).size;
  const nCrops=Object.keys(CROPS).filter(k=>k!=='barbecho').length;
  $('#heroStats').innerHTML=[[Object.keys(SITES).length,tr('agricultural regions','regiones agrícolas')],[nCountries,tr('Latin American countries','países de Latinoamérica')],[nCrops,tr('crops and covers','cultivos y coberturas')],['1 000',tr('simulations per analysis','simulaciones por análisis')]]
    .map(([v,k])=>`<div class="stat"><div class="v">${v}</div><div class="k">${k}</div></div>`).join('');
}
function initChrome(){
  renderHeroStats();
  const links=[...document.querySelectorAll('nav.top a')];
  const secs=a=>(a.dataset.secs||a.getAttribute('href').slice(1)).split(' ');
  const mark=id=>links.forEach(a=>{ const on=secs(a).includes(id); a.classList.toggle('active',on); if (on) a.setAttribute('aria-current','location'); else a.removeAttribute('aria-current'); });
  if (typeof IntersectionObserver==='undefined') return;
  const io=new IntersectionObserver(es=>{ es.forEach(e=>{ if(e.isIntersecting) mark(e.target.id); }); },{rootMargin:'-45% 0px -50% 0px'});
  new Set(links.flatMap(secs)).forEach(id=>{ const t=document.getElementById(id); if(t) io.observe(t); });
}
