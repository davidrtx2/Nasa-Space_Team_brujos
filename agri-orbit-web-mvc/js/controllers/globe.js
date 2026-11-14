/* AGRI-ORBIT · js/controllers/globe.js
   Controlador del globo: interacción, selección de sitio y búsqueda. */

function eventLonLat(ev){
  const rect=$('#globe').getBoundingClientRect(), x=ev.clientX-rect.left, y=ev.clientY-rect.top;
  const r=G.r0*G.k; if (Math.hypot(x-G.w/2,y-G.h/2) > r) return null;
  const ll=G.proj.invert([x,y]); return ll && isFinite(ll[0]) ? {ll,x,y} : null;
}
function countryAt(lon,lat){
  for (const f of G.countries){
    const b=f.bounds; const inLon = b[0][0]<=b[1][0] ? (lon>=b[0][0]&&lon<=b[1][0]) : (lon>=b[0][0]||lon<=b[1][0]);
    if (!inLon || lat<b[0][1] || lat>b[1][1]) continue;
    if (d3.geoContains(f,[lon,lat])) return f;
  }
  return null;
}
function siteAtPixel(x,y){
  for (const k in SITES){ const s=SITES[k]; if(!inView(s.lon,s.lat)) continue; const p=G.proj([s.lon,s.lat]); if (Math.hypot(p[0]-x,p[1]-y) < 9) return k; }
  return null;
}

function flyTo(lon,lat,k){
  const r0=G.rot.slice(), k0=G.k, r1=[-lon,-lat,0], k1=k||Math.max(G.k,2.4);
  if (r1[0]-r0[0] > 180) r1[0]-=360; if (r0[0]-r1[0] > 180) r1[0]+=360;
  const ir=d3.interpolate(r0,r1), t0=performance.now(), dur=1100;
  G.anim={tick:now=>{ const t=d3.easeCubicInOut(clamp((now-t0)/dur)); G.rot=ir(t); G.k=k0+(k1-k0)*t; return t<1; }};
}

function selectSite(key, fly=true){
  S.siteKey=key; S.site={...SITES[key]}; S.live=false; S.custom=null; S.current=null; S.sel=0; S.cmp='base';
  $('#site').value=key; G.sel={country: G.countries.find(f=>f.latam && d3.geoContains(f,[S.site.lon,S.site.lat]))||null};
  if (fly) flyTo(S.site.lon,S.site.lat);
  recompute(); renderPlace(); scheduleLive();
}

function pickPoint(lon,lat,country){
  const near=nearestSite(lon,lat), ref=SITES[near.key];
  S.siteKey='globe';
  S.site={...ref, key:'globe', lat, lon, refKey:near.key, refDist:near.d, pending:true,
    region:'Selected point', regionEn:'Selected point', regionEs:'Punto seleccionado', country: country ? (country.properties.name||'') : ref.country,
    nameEn:`Point ${lat.toFixed(2)}, ${lon.toFixed(2)} · ${country?country.properties.name:siteCountry(ref)}`,
    nameEs:`Punto ${lat.toFixed(2)}, ${lon.toFixed(2)} · ${country?country.properties.name:siteCountry(ref)}`};
  S.live=false; S.custom=null; S.current=null; S.sel=0; S.cmp='base';
  G.sel={country};
  $('#site').value='globe'; $('#lat').value=lat.toFixed(3); $('#lon').value=lon.toFixed(3);
  recompute(); renderPlace(); scheduleLive();
}

function fillSearch(){
  const items=new Set();
  Object.values(SITES).forEach(s=>items.add(siteName(s)));
  G.countries.filter(f=>f.latam && f.properties.name).forEach(f=>items.add(f.properties.name));
  $('#gsearchList').innerHTML=[...items].sort((a,b)=>a.localeCompare(b,LANG==='es'?'es':'en')).map(n=>`<option value="${n}">`).join('');
}

function initGlobe(){
  if (!window.d3){ $('#globeMsg').textContent=tr('Could not load D3 (offline).','No se pudo cargar D3 (sin conexión).'); return; }
  G.proj=d3.geoOrthographic().clipAngle(90).precision(.4);
  G.grat=d3.geoGraticule10();
  sizeGlobe(); renderLegend();
  window.addEventListener('resize',sizeGlobe);
  const c=$('#globe'); let drag=null;
  c.addEventListener('pointerdown',e=>{ drag={x:e.clientX,y:e.clientY,r:G.rot.slice(),moved:false}; G.anim=null; G.spin=false; c.setPointerCapture(e.pointerId); });
  c.addEventListener('pointermove',e=>{
    if (drag){
      const dx=e.clientX-drag.x, dy=e.clientY-drag.y; if (Math.hypot(dx,dy)>3){ drag.moved=true; c.classList.add('dragging'); }
      G.dragging=true; G.lastMove=performance.now(); const sens=.28/G.k; G.rot=[drag.r[0]+dx*sens, clamp(drag.r[1]-dy*sens,-85,85), 0]; return;
    }
    const hit=eventLonLat(e), tip=$('#tip');
    if (!hit){ G.hover=null; tip.style.display='none'; return; }
    const sk=siteAtPixel(hit.x,hit.y), f=G.ready?countryAt(...hit.ll):null; G.hover=f;
    if (sk||f){ tip.style.display='block'; tip.style.left=(e.clientX+12)+'px'; tip.style.top=(e.clientY+12)+'px';
      tip.innerHTML = sk ? `<b>${siteRegion(SITES[sk])}</b><br>${siteCountry(SITES[sk])} · ${LAYERS[G.layer].fmt(SITES[sk][G.layer])}` : `${f.properties.name||''}<br>${hit.ll[1].toFixed(2)}, ${hit.ll[0].toFixed(2)}`; }
    else tip.style.display='none';
  });
  c.addEventListener('pointerup',e=>{
    c.classList.remove('dragging'); G.dragging=false; G.lastMove=performance.now();
    if (drag && !drag.moved){
      const hit=eventLonLat(e);
      if (hit){
        const sk=siteAtPixel(hit.x,hit.y);
        if (sk) selectSite(sk,false);
        else {
          const f=G.ready?countryAt(...hit.ll):null;
          if (G.ready && !f) toast(tr('That is ocean: pick a point on land','Eso es océano: elige un punto en tierra'));
          else pickPoint(hit.ll[0],hit.ll[1],f);
        }
      }
    }
    drag=null;
  });
  c.addEventListener('pointerleave',()=>{ G.hover=null; $('#tip').style.display='none'; });
  c.addEventListener('wheel',e=>{ e.preventDefault(); G.anim=null; G.lastMove=performance.now(); G.k=clamp(G.k*Math.exp(-e.deltaY*.0015),.8,14); },{passive:false});
  $('#gzin').onclick=()=>{ G.k=clamp(G.k*1.5,.8,14); };
  $('#gzout').onclick=()=>{ G.k=clamp(G.k/1.5,.8,14); };
  $('#ghome').onclick=()=>flyTo(-75,-10,1);
  $('#gspin').onclick=()=>{ G.spin=!G.spin; G.anim=null; };
  $('#glayer').querySelectorAll('button').forEach(b=>b.onclick=()=>{ $('#glayer').querySelectorAll('button').forEach(x=>x.classList.remove('on')); b.classList.add('on'); G.tlayer=b.dataset.v; G.texKey=null; renderLegend(); });
  $('#gsearch').onchange=e=>{
    const q=e.target.value.trim().toLowerCase(); if(!q) return;
    const sk=Object.keys(SITES).find(k=>siteName(SITES[k]).toLowerCase()===q) || Object.keys(SITES).find(k=>siteName(SITES[k]).toLowerCase().includes(q));
    const f=G.countries.find(f=>(f.properties.name||'').toLowerCase()===q);
    if (f && !(sk && siteName(SITES[sk]).toLowerCase()===q)){ flyTo(f.centroid[0],f.centroid[1],3); G.sel={country:f}; const s2=nearestSite(...f.centroid); toast(`${f.properties.name}: ${tr('click the map to pick a point','haz clic en el mapa para elegir un punto')}`); }
    else if (sk) selectSite(sk);
    else toast(tr('I could not find that place','No encontré ese lugar'));
    e.target.value='';
  };
  (function loop(){
    if (G.anim && !G.anim.tick(performance.now())) G.anim=null;
    if (G.spin) G.rot=[G.rot[0]+.15,G.rot[1],0];
    drawGlobe(); requestAnimationFrame(loop);
  })();
  loadWorld();
  flyTo(S.site.lon, S.site.lat, 1.6);
}
