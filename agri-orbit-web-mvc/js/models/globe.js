/* AGRI-ORBIT · js/models/globe.js
   Modelo del globo: países, capas, geometría y carga del mapa mundial. */

/* =========================================================
   GLOBO INTERACTIVO (D3 + límites de países world-atlas)
   ========================================================= */
const LATAM = new Set(['032','068','076','152','170','188','192','214','218','222','320','328','332','340','388','484','558','591','600','604','630','740','780','858','862','084','044','254','052','028','212','308','662','670','533','531','535','238','659','660','092','850','796','136']);
const G = {k:1, rot:[78,10,0], layer:'P', countries:[], ready:false, spin:false, hover:null, sel:null, anim:null};
const LAYERS = {
  P:{lbl:'Lluvia anual (mm) · ref. GPM IMERG / POWER', dom:[0,2500], fmt:v=>r0(v)+' mm', ip:()=>d3.interpolateYlGnBu},
  Tg:{lbl:'Temperatura de temporada (°C) · POWER T2M', dom:[5,30], fmt:v=>v.toFixed(0)+' °C', ip:()=>t=>d3.interpolateRdYlBu(1-t)},
  GWET:{lbl:'Humedad zona radicular (0–1) · SMAP L4', dom:[.1,.75], fmt:v=>v.toFixed(2), ip:()=>d3.interpolateViridis},
  elev:{lbl:'Elevación (m) · SRTM', dom:[0,4000], fmt:v=>r0(v)+' m', ip:()=>d3.interpolateCividis}
};
const layerColor = (key,v) => { const L=LAYERS[key]; return L.ip()(clamp((v-L.dom[0])/(L.dom[1]-L.dom[0]))); };

function haversine(a,b){ const R=6371, toR=Math.PI/180, dLat=(b[1]-a[1])*toR, dLon=(b[0]-a[0])*toR;
  const h=Math.sin(dLat/2)**2+Math.cos(a[1]*toR)*Math.cos(b[1]*toR)*Math.sin(dLon/2)**2; return 2*R*Math.asin(Math.sqrt(h)); }
function nearestSite(lon,lat){ let best=null; for (const k in SITES){ const d=haversine([lon,lat],[SITES[k].lon,SITES[k].lat]); if(!best||d<best.d) best={key:k,d}; } return best; }

// Decodificador mínimo de TopoJSON (evita depender de otra librería)
function topoFeatures(topo, name){
  const tf=topo.transform;
  const arcs=topo.arcs.map(arc=>{ let x=0,y=0; return arc.map(p=>{ if(tf){ x+=p[0]; y+=p[1]; return [x*tf.scale[0]+tf.translate[0], y*tf.scale[1]+tf.translate[1]]; } return p.slice(); }); });
  const arc=i=> i<0 ? arcs[~i].slice().reverse() : arcs[i];
  const ring=ids=>{ const pts=[]; ids.forEach((i,k)=>{ const a=arc(i); pts.push(...(k?a.slice(1):a)); }); return pts; };
  const geom=g=> g.type==='Polygon' ? {type:'Polygon',coordinates:g.arcs.map(ring)} : g.type==='MultiPolygon' ? {type:'MultiPolygon',coordinates:g.arcs.map(p=>p.map(ring))} : null;
  return topo.objects[name].geometries.map(g=>({type:'Feature',id:g.id,properties:g.properties||{},geometry:geom(g)})).filter(f=>f.geometry);
}

async function loadWorld(){
  const urls=['https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json/+esm','https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json/+esm'];
  for (const u of urls){
    try{
      const m = await import(u); const topo = m.default || m;
      G.countries = topoFeatures(topo,'countries').map(f=>{ f.bounds=d3.geoBounds(f); f.latam=LATAM.has(String(f.id).padStart(3,'0')); f.centroid=d3.geoCentroid(f); return f; });
      G.ready=true; $('#globeMsg').textContent=''; fillSearch(); drawGlobe(); return;
    }catch(e){ /* intenta la siguiente resolución */ }
  }
  $('#globeMsg').textContent='Sin mapa base de países (sin conexión): se muestran solo los sitios.';
}
