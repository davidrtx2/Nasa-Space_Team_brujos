/* AGRI-ORBIT · js/models/nasa.js
   Modelo de datos NASA: GIBS, POWER en vivo, instantánea local y herramientas. */

/* =========================================================
   DATOS EN VIVO: NASA GIBS (imágenes) + NASA POWER (series diarias)
   Funciona en cualquier página web normal (GitHub Pages, servidor propio o archivo abierto en el navegador).
   La vista de artefactos de Claude bloquea conexiones externas: ahí se muestra un aviso.
   ========================================================= */
const LIVE = {blocked:null, token:0, cache:{}, daily:null, at:null, timer:null};
const GIBS = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi';
const isoDay = d => d.toISOString().slice(0,10);
const ymdC = d => isoDay(d).replace(/-/g,'');
const fmtDia = s => { const d=new Date(s+'T12:00:00Z'), m=MESL[d.getUTCMonth()].slice(0,3); return tr(m+' '+d.getUTCDate(), d.getUTCDate()+' '+m); };
const LIVE_LAYERS = [
  {id:'tc', t:'True color', tEs:'Color real', src:'VIIRS NOAA-20 · yesterday', srcEs:'VIIRS NOAA-20 · ayer', layer:'VIIRS_NOAA20_CorrectedReflectance_TrueColor', fmt:'image/jpeg', time:()=>isoDay(new Date(Date.now()-86400000)), solo:true,
   d:'Clouds, green fields and bare soil seen from space yesterday.', dEs:'Nubes, campos verdes y suelo desnudo vistos ayer desde el espacio.', wv:'VIIRS_NOAA20_CorrectedReflectance_TrueColor'},
  {id:'rain', t:'Rain now', tEs:'Lluvia ahora', src:'GPM IMERG · latest', srcEs:'GPM IMERG · más reciente', layer:'IMERG_Precipitation_Rate',
   d:'Rainfall from the latest available half hour.', dEs:'Lluvia de la última media hora disponible.', ramp:['rgba(0,0,0,0)','#a6e07a','#f4e842','#f2952b','#e0402a'], ends:['no rain','very heavy'], endsEs:['sin lluvia','muy intensa'], wv:'IMERG_Precipitation_Rate'},
  {id:'smap', t:'Soil moisture', tEs:'Humedad del suelo', src:'SMAP L4 · root zone', srcEs:'SMAP L4 · zona de raíces', layer:'SMAP_L4_Analyzed_Root_Zone_Soil_Moisture',
   d:'Water available to roots, analyzed from SMAP satellite data.', dEs:'Agua disponible para las raíces, analizada con datos del satélite SMAP.', ramp:['#f1e05a','#93cf55','#36c1b2','#2a72e0','#1a2fb5'], ends:['dry','wet'], endsEs:['seco','húmedo'], wv:'SMAP_L4_Analyzed_Root_Zone_Soil_Moisture'},
  {id:'ndvi', t:'Vegetation vigor (NDVI)', tEs:'Vigor vegetal (NDVI)', src:'MODIS Terra · 8 days', srcEs:'MODIS Terra · 8 días', layer:'MODIS_Terra_NDVI_8Day',
   d:'How green and active the plants have been over recent weeks.', dEs:'Qué tan verdes y activas están las plantas en las últimas semanas.', ramp:['#cdb894','#dfe6a6','#7dba55','#2b7a2f','#0f4d1c'], ends:['low / bare','high'], endsEs:['poco / suelo','mucho'], wv:'MODIS_Terra_NDVI_8Day'}
];
function gibsURL(L, lat, lon, w=420){
  const lh=.7, ah=lh*Math.cos(lat*Math.PI/180);
  const bbox=[lon-lh,lat-ah,lon+lh,lat+ah].map(v=>v.toFixed(4)).join(',');
  const fmt=L.fmt||'image/png', t=L.time?L.time():'';
  return `${GIBS}?SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1&LAYERS=${L.layer}&SRS=EPSG:4326&BBOX=${bbox}&WIDTH=${w}&HEIGHT=${w}&FORMAT=${encodeURIComponent(fmt)}${fmt==='image/png'?'&TRANSPARENT=true':''}${t?'&TIME='+t:''}`;
}

async function fetchDaily(lat, lon){
  const end=new Date(Date.now()-86400000), start=new Date(Date.now()-90*86400000);
  const url=`https://power.larc.nasa.gov/api/temporal/daily/point?parameters=PRECTOTCORR,T2M_MAX,GWETROOT&community=AG&longitude=${lon.toFixed(4)}&latitude=${lat.toFixed(4)}&start=${ymdC(start)}&end=${ymdC(end)}&format=JSON`;
  const ctl=new AbortController(), to=setTimeout(()=>ctl.abort(),15000);
  try{
    const r=await fetch(url,{signal:ctl.signal}); if(!r.ok) throw new Error('HTTP '+r.status);
    const j=await r.json(), p=j.properties.parameter, fill=(j.header&&j.header.fill_value)||-999;
    const days=Object.keys(p.PRECTOTCORR).map(k=>({d:`${k.slice(0,4)}-${k.slice(4,6)}-${k.slice(6,8)}`, P:p.PRECTOTCORR[k], Tx:p.T2M_MAX[k], G:p.GWETROOT[k]}))
      .map(x=>({...x, ok: x.P!==fill && x.Tx!==fill && x.G!==fill}));
    return days;
  } finally { clearTimeout(to); }
}

function scheduleLive(){ clearTimeout(LIVE.timer); LIVE.timer=setTimeout(loadLive, 450); }

function liveStats(){
  const s=S.site, ds=(LIVE.daily||[]).filter(x=>x.ok);
  if (!ds.length) return null;
  const last=ds[ds.length-1], last30=ds.slice(-30);
  const rain30=last30.reduce((a,x)=>a+x.P,0);
  let norm30=0; if (s.mP) last30.forEach(x=>{ const m=+x.d.slice(5,7)-1; norm30+=s.mP[m]/DIAS[m]; });
  const hot=last30.filter(x=>x.Tx>=34).length, m=+last.d.slice(5,7)-1;
  const gNorm = s.mG ? s.mG[m] : null;
  return {last, rain30, norm30, pct: norm30>0 ? rain30/norm30 : null, hot, g:last.G, gNorm, gAnom: gNorm!=null ? last.G-gNorm : null, n30:last30.length};
}

/* =========================================================
   INSTANTÁNEA LOCAL DE LA NASA (carpeta snap/) + HERRAMIENTAS INTEGRADAS
   - Sin conexión se usan datos e imágenes reales de NASA POWER y NASA GIBS descargados en snap/.
   - Con conexión, la página consulta a la NASA en vivo.
   ========================================================= */
const SNAP = {data:null, ready:false, date:null};
const SNAP_DIR = 'snap/';
const LA_BOX = {w:-118, e:-32, s:-56, n:34, W:1032, H:1080, ppd:12};
const fmtFecha = iso => { if(!iso) return ''; const d=new Date(iso+'T12:00:00Z'), m=MESL[d.getUTCMonth()].slice(0,3); return tr(`${m} ${d.getUTCDate()}, ${d.getUTCFullYear()}`, `${d.getUTCDate()} ${m} ${d.getUTCFullYear()}`); };

// POWER climatología → parámetros del modelo (T2M_MAX/T2M_MIN de la climatología son extremos del mes: se estiman las medias diarias)
function powerToSite(c){
  const T=c.T, X=c.X.map((x,i)=>T[i]+.55*(x-T[i])), N=c.N.map((n,i)=>T[i]-.55*(T[i]-n));
  const mP=c.P.map((v,i)=>v*DIAS[i]), srt=[...T].sort((a,b)=>b-a), tmin=Math.min(...N);
  return {Tg:srt.slice(0,6).reduce((a,b)=>a+b,0)/6, Tmax:Math.max(...X), P:mP.reduce((a,b)=>a+b,0),
    GWET:c.G.reduce((a,b)=>a+b,0)/12, SW:c.S/3.6, wind:clamp((c.W-1.5)/4), heavy:clamp(Math.max(...c.P)/12),
    frost: tmin<=5 ? clamp((6-tmin)/8) : 0, Pcv:clamp(.12+.12*c.P.filter(x=>x<1).length/6,.12,.4),
    mT:T, mTx:X, mTn:N, mG:c.G, mP, elev:c.e};
}
function snapDaily(c){
  if (!c || !c.d0) return null;
  const P=c.dp.split(' ').map(Number), X=c.dx.split(' ').map(Number), Gd=c.dg.split(' ').map(v=>+v/100);
  const t0=Date.parse(`${c.d0.slice(0,4)}-${c.d0.slice(4,6)}-${c.d0.slice(6,8)}T12:00:00Z`);
  return P.map((p,i)=>({d:isoDay(new Date(t0+i*86400000)), P:p, Tx:X[i], G:Gd[i], ok:true}));
}
async function loadSnap(){
  try{ const r=await fetch(SNAP_DIR+'power.json'); if(!r.ok) return; SNAP.data=await r.json(); SNAP.date=SNAP.data.date; SNAP.ready=true; }catch(e){}
}
function dataLabel(){
  if (LIVE.mode==='live') return tr('NASA POWER live','NASA POWER en vivo');
  if (LIVE.mode==='snap') return S.site.refKey ? tr(`NASA POWER · reference region (${fmtFecha(SNAP.date)})`,`NASA POWER · región de referencia (${fmtFecha(SNAP.date)})`) : tr(`NASA POWER · data from ${fmtFecha(SNAP.date)}`,`NASA POWER · datos del ${fmtFecha(SNAP.date)}`);
  return tr('reference values','valores de referencia');
}

/* ---------- POWER en vivo (usa la misma conversión) ---------- */
async function fetchPower(lat, lon){
  const url=`https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,GWETROOT,ALLSKY_SFC_SW_DWN,WS2M&community=AG&longitude=${lon}&latitude=${lat}&format=JSON`;
  const ctl=new AbortController(), to=setTimeout(()=>ctl.abort(),12000);
  try{
    const r=await fetch(url,{signal:ctl.signal}); if(!r.ok) throw new Error('HTTP '+r.status);
    const j=await r.json(), p=j.properties.parameter, M=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    return powerToSite({T:M.map(m=>p.T2M[m]), X:M.map(m=>p.T2M_MAX[m]), N:M.map(m=>p.T2M_MIN[m]), P:M.map(m=>p.PRECTOTCORR[m]), G:M.map(m=>p.GWETROOT[m]),
      S:p.ALLSKY_SFC_SW_DWN.ANN, W:p.WS2M.ANN, e:(j.geometry&&j.geometry.coordinates&&j.geometry.coordinates[2]) || S.site.elev});
  } finally { clearTimeout(to); }
}

async function loadLive(force=false){
  const s=S.site, key=s.lat.toFixed(3)+','+s.lon.toFixed(3), tk=++LIVE.token;
  if (LIVE.blocked){ useSnapshot(tk); return; }
  renderLive('loading');
  try{
    let c=!force && LIVE.cache[key];
    if (!c){ const [clim,daily]=await Promise.all([fetchPower(s.lat,s.lon), fetchDaily(s.lat,s.lon)]); c={clim,daily,at:new Date()}; LIVE.cache[key]=c; }
    if (tk!==LIVE.token) return;
    LIVE.blocked=false; LIVE.mode='live'; LIVE.daily=c.daily; LIVE.at=c.at;
    Object.assign(S.site, c.clim, {pending:false}); S.live=true;
    recompute(); renderLive('ok');
  }catch(e){
    if (tk!==LIVE.token) return;
    if (e && e.name==='TypeError'){ LIVE.blocked=true; useSnapshot(tk); }
    else renderLive('error', String(e && e.message || e));
  }
}
async function useSnapshot(tk){
  if (!SNAP.ready) await loadSnap();
  if (tk!==LIVE.token) return;
  const key=S.site.refKey || S.site.key, c=SNAP.ready && SNAP.data.sites[key];
  if (!c){ LIVE.mode=null; renderLive('blocked'); renderClimate(); renderPlace(); return; }
  Object.assign(S.site, powerToSite(c), {pending:false});
  S.live = !S.site.refKey;            // datos reales de NASA POWER para el punto exacto de la región
  LIVE.mode='snap'; LIVE.daily=snapDaily(c); LIVE.at=null;
  recompute(); renderLive('ok');
}

/* ---------- Herramientas NASA integradas ---------- */
const TOOLS = [
  {id:'tc', t:'Satellite image', tEs:'Imagen satelital', sat:'NOAA-20 · VIIRS', when:'Nov 13, 2026', whenEs:'13 nov 2026', kind:'site', d:'True color seen from space: clouds, fields and bare soil.', dEs:'Color real visto desde el espacio: nubes, campos y suelo desnudo.',
   live:(la,lo)=>gibsURL({layer:'VIIRS_NOAA20_CorrectedReflectance_TrueColor',fmt:'image/jpeg',time:()=>isoDay(new Date(Date.now()-86400000))},la,lo)},
  {id:'ndvi', t:'Vegetation vigor (NDVI)', tEs:'Vigor vegetal (NDVI)', sat:'Terra · MODIS', when:'8-day composite', whenEs:'compuesto de 8 días', kind:'site', d:'Deep green = vigorous plants; pale = bare soil or stressed crop.', dEs:'Verde intenso = plantas vigorosas; claro = suelo desnudo o cultivo estresado.',
   ramp:['#cdb894','#dfe6a6','#7dba55','#2b7a2f','#0f4d1c'], ends:['bare / low','high'], endsEs:['suelo / poco','mucho'],
   live:(la,lo)=>gibsURL({layer:'MODIS_Terra_NDVI_8Day'},la,lo), base:true},
  {id:'relief', t:'Relief and slope', tEs:'Relieve y pendiente', sat:'SRTM + ASTER GDEM', when:'elevation model', whenEs:'modelo de elevación', kind:'site', d:'Where the terrain is flat or steep: slopes lose more soil to rain.', dEs:'Dónde el terreno es plano o inclinado: las laderas pierden más suelo con la lluvia.',
   ramp:['#2c7a3a','#a7d36b','#f1e08a','#c98a45','#efe7e2'], ends:['low','high'], endsEs:['bajo','alto'],
   live:(la,lo)=>gibsURL({layer:'SRTM_Color_Index'},la,lo), relief:true},
  {id:'rain', t:'Rainfall', tEs:'Lluvia', sat:'GPM · IMERG', when:'Nov 13, 2026', whenEs:'13 nov 2026', kind:'region', half:4, tex:'latam_rain', d:'Where it rained and with what intensity in the region.', dEs:'Dónde llovió y con qué intensidad en la región.',
   ramp:['rgba(0,0,0,0)','#a6e07a','#f4e842','#f2952b','#e0402a'], ends:['no rain','heavy'], endsEs:['sin lluvia','intensa'], layer:'IMERG_Precipitation_Rate', ltime:()=>isoDay(new Date(Date.now()-86400000))},
  {id:'smap', t:'Root-zone moisture', tEs:'Humedad de raíces', sat:'SMAP L4', when:'latest analysis', whenEs:'análisis más reciente', kind:'region', half:4, tex:'latam_smap', d:'Water available to roots in the area.', dEs:'Agua disponible para las raíces en la zona.',
   ramp:['#f1e05a','#93cf55','#36c1b2','#2a72e0','#1a2fb5'], ends:['dry','wet'], endsEs:['seco','húmedo'], layer:'SMAP_L4_Analyzed_Root_Zone_Soil_Moisture'},
  {id:'grace', t:'Groundwater', tEs:'Agua subterránea', sat:'GRACE-FO', when:'monthly anomaly', whenEs:'anomalía mensual', kind:'region', half:12, tex:'latam_grace', d:'Change in water stored underground vs. the historical average.', dEs:'Cambio del agua almacenada bajo tierra respecto al promedio histórico.',
   ramp:['#d7301f','#fc9272','#f7f7f7','#9ecae1','#2166ac'], ends:['less water','more water'], endsEs:['menos agua','más agua'], layer:'GRACE_Tellus_Liquid_Water_Equivalent_Thickness_Mascon_CRI', opaque:true}
];
function regionBox(lat,lon,half){ return [lon-half,lat-half,lon+half,lat+half].map(v=>v.toFixed(3)).join(','); }
function wmsBox(layer,bb,fmt='image/png',time=''){ return `${GIBS}?SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1&LAYERS=${layer}&SRS=EPSG:4326&BBOX=${bb}&WIDTH=420&HEIGHT=420&FORMAT=${encodeURIComponent(fmt)}${fmt==='image/png'?'&TRANSPARENT=true':''}${time?'&TIME='+time:''}`; }
