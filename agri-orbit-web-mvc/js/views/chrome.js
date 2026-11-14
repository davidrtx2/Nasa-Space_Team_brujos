/* AGRI-ORBIT · js/views/chrome.js
   Vistas de página: pie, constelación de satélites, iconos de sección y portada. */

function renderFoot(){
  $('#foot').textContent = `Modelo de reglas v0.3 · ${new Date().toLocaleDateString('es')} · sin datos personales`;
}

/* ---------- Constelación de satélites (portada) ---------- */
const SATS = {
  smap:{n:'SMAP', full:'Soil Moisture Active Passive', mide:'La humedad del suelo en todo el planeta, cada 2–3 días.', uso:'Humedad de raíces, riesgo de sequía relámpago y la capa “Humedad” del globo.', sec:'#livebox'},
  gpm:{n:'GPM', full:'Global Precipitation Measurement · IMERG', mide:'La lluvia en todo el planeta cada 30 minutos.', uso:'Lluvia reciente, lluvias intensas y erosión.', sec:'#livebox'},
  terra:{n:'Terra · MODIS', full:'Moderate Resolution Imaging Spectroradiometer', mide:'El verdor de la vegetación (NDVI) cada 8 días.', uso:'Vigor vegetal y meses con suelo desnudo.', sec:'#livebox'},
  noaa20:{n:'NOAA-20 · VIIRS', full:'Visible Infrared Imaging Radiometer Suite', mide:'Imágenes a color real de todo el planeta cada día.', uso:'Nubes, campos y suelo desnudo de ayer.', sec:'#s-globo'},
  grace:{n:'GRACE-FO', full:'Gravity Recovery and Climate Experiment Follow-On', mide:'Cambios del agua subterránea a partir de la gravedad terrestre.', uso:'Riesgo de agotar el acuífero si se riega.', sec:'#s-riesgo'},
  landsat:{n:'Landsat 9', full:'Programa Landsat · NASA / USGS', mide:'Imágenes de 30 m: se distingue cada parcela.', uso:'Siguiente paso: NDVI e historia de cada parcela.', sec:'#s-mapa'},
  ecostress:{n:'ECOSTRESS', full:'En la Estación Espacial Internacional', mide:'Temperatura de las plantas y evapotranspiración.', uso:'Siguiente paso: calibrar el agua que usa cada cultivo.', sec:'#s-cal'},
  power:{n:'NASA POWER', full:'Prediction Of Worldwide Energy Resources', mide:'Clima diario y normal: temperatura, lluvia, radiación, viento.', uso:'Aptitud de cada cultivo, calendario y últimos 90 días.', sec:'#s-cal'}
};
function initConstellation(){
  const box=$('#satinfo'); if (!box) return;
  const show=k=>{ const s=SATS[k]; document.querySelectorAll('#constel .sat').forEach(g=>g.classList.toggle('on',g.dataset.s===k));
    box.innerHTML=`<div class="si-k">MISIÓN</div><div class="si-n">${s.n}</div><div class="si-f">${s.full}</div><div class="si-r"><b>Qué mide:</b> ${s.mide}</div><div class="si-r"><b>En AGRI-ORBIT:</b> ${s.uso}</div><a href="${s.sec}">Ver en la herramienta ↓</a>`; };
  document.querySelectorAll('#constel .sat').forEach(g=>{ g.addEventListener('click',()=>show(g.dataset.s)); g.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); show(g.dataset.s);} }); });
  document.querySelectorAll('.satchips button').forEach(b=>b.onclick=()=>show(b.dataset.s));
  show('smap');
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

function initChrome(){
  const nCountries=new Set(Object.values(SITES).filter(s=>s.country!=='EE. UU.').map(s=>s.country)).size;
  const nCrops=Object.keys(CROPS).filter(k=>k!=='barbecho').length;
  $('#heroStats').innerHTML=[[Object.keys(SITES).length,'regiones agrícolas'],[nCountries,'países de Latinoamérica'],[nCrops,'cultivos y coberturas'],['1 000','simulaciones por análisis']]
    .map(([v,k])=>`<div class="stat"><div class="v">${v}</div><div class="k">${k}</div></div>`).join('');
  const links=[...document.querySelectorAll('nav.top a')];
  const io=new IntersectionObserver(es=>{ es.forEach(e=>{ if(e.isIntersecting){ links.forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+e.target.id)); } }); },{rootMargin:'-45% 0px -50% 0px'});
  links.forEach(a=>{ const t=document.querySelector(a.getAttribute('href')); if(t) io.observe(t); });
}
