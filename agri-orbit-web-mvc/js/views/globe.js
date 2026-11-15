/* AGRI-ORBIT · js/views/globe.js
   Vista: dibujo del globo con texturas satelitales y leyenda. */

function sizeGlobe(){
  const box=$('#globebox'), c=$('#globe'), dpr=window.devicePixelRatio||1;
  G.w=box.clientWidth; G.h=box.clientHeight;
  c.width=G.w*dpr; c.height=G.h*dpr; G.ctx=c.getContext('2d'); G.ctx.setTransform(dpr,0,0,dpr,0,0);
  G.r0=Math.min(G.w,G.h)*.44;
  drawGlobe();
}

function inView(lon,lat){ return d3.geoDistance([lon,lat],[-G.rot[0],-G.rot[1]]) < Math.PI/2 - .01; }

/* ---------- Globo con imágenes satelitales reales ---------- */
const TEX = {list:{}, ready:false};
const GLAYERS = {
  bm:{lbl:'Earth · Blue Marble (NASA)', lblEs:'Tierra · Blue Marble (NASA)', ramp:null},
  tc:{lbl:'Clouds & true color · VIIRS, Nov 13, 2026', lblEs:'Nubes y color real · VIIRS, 13 nov 2026', ramp:null},
  rain:{lbl:'Rainfall · GPM IMERG, Nov 13, 2026', lblEs:'Lluvia · GPM IMERG, 13 nov 2026', ramp:['#a6e07a','#f4e842','#f2952b','#e0402a'], ends:['light','heavy'], endsEs:['ligera','intensa']},
  smap:{lbl:'Root-zone moisture · SMAP L4', lblEs:'Humedad de raíces · SMAP L4', ramp:['#f1e05a','#93cf55','#36c1b2','#2a72e0','#1a2fb5'], ends:['dry','wet'], endsEs:['seco','húmedo']},
  ndvi:{lbl:'Vegetation vigor · MODIS NDVI 8-day', lblEs:'Vigor vegetal · MODIS NDVI 8 días', ramp:['#cdb894','#dfe6a6','#7dba55','#2b7a2f','#0f4d1c'], ends:['low','high'], endsEs:['poco','mucho']},
  grace:{lbl:'Total water storage anomaly · GRACE-FO (regional)', lblEs:'Anomalía del agua total almacenada · GRACE-FO (regional)', ramp:['#d7301f','#fc9272','#f7f7f7','#9ecae1','#2166ac'], ends:['less','more'], endsEs:['menos','más']}
};
G.tlayer='bm';
async function loadTextures(){
  const load=n=>new Promise(res=>{ const im=new Image(); im.onload=()=>{ try{ const c=document.createElement('canvas'); c.width=im.naturalWidth; c.height=im.naturalHeight; const x=c.getContext('2d',{willReadFrequently:true}); x.drawImage(im,0,0); const d=x.getImageData(0,0,c.width,c.height); res([n,{w:c.width,h:c.height,px:new Uint32Array(d.data.buffer)}]); }catch(e){ res([n,null]); } }; im.onerror=()=>res([n,null]); im.src=SNAP_DIR+n+'.webp'; });
  const first=await Promise.all(['world_bm','latam_bm'].map(load)); first.forEach(([n,v])=>{ if(v) TEX.list[n]=v; });
  TEX.ready=!!TEX.list.world_bm; G.texKey=null;
  if (TEX.ready){ $('#globeMsg').textContent=''; document.getElementById('globebox').classList.add('textured'); }
  const rest=await Promise.all(['latam_tc','latam_rain','latam_smap','latam_ndvi','latam_grace'].map(load)); rest.forEach(([n,v])=>{ if(v) TEX.list[n]=v; });
  G.texKey=null;
}
function renderTexture(q){
  const w=Math.max(2,Math.round(G.w*q)), h=Math.max(2,Math.round(G.h*q));
  if (!G.tcv || G.tcv.width!==w || G.tcv.height!==h){ G.tcv=document.createElement('canvas'); G.tcv.width=w; G.tcv.height=h; G.tcx=G.tcv.getContext('2d'); G.timg=G.tcx.createImageData(w,h); G.tbuf=new Uint32Array(G.timg.data.buffer); }
  const buf=G.tbuf; buf.fill(0);
  const r=G.r0*G.k*q, cx=w/2, cy=h/2, D=Math.PI/180, lc=-G.rot[0]*D, pc=-G.rot[1]*D, sp=Math.sin(pc), cp=Math.cos(pc);
  const W=TEX.list.world_bm, LB=TEX.list.latam_bm, lay=G.tlayer, OV=lay==='bm'?null:TEX.list['latam_'+lay];
  const opaque = lay==='tc', alphaK = lay==='grace' ? .72 : .9;
  const y0=Math.max(0,Math.floor(cy-r)), y1=Math.min(h,Math.ceil(cy+r)), Ww=W.w, Wh=W.h;
  for (let py=y0; py<y1; py++){
    const yv=(cy-py-.5)/r, yy=yv*yv; if (yy>=1) continue;
    const xr=Math.sqrt(1-yy)*r, x0=Math.max(0,Math.floor(cx-xr)), x1=Math.min(w,Math.ceil(cx+xr)), row=py*w;
    for (let px=x0; px<x1; px++){
      const xv=(px+.5-cx)/r, rr=xv*xv+yy; if (rr>=1) continue;
      const cosc=Math.sqrt(1-rr);
      const latd=Math.asin(cosc*sp+yv*cp)/D; let lond=(lc+Math.atan2(xv,cosc*cp-yv*sp))/D; lond=((lond%360)+540)%360-180;
      let col;
      if (LB && lond>-118 && lond<-32 && latd>-56 && latd<34){
        const idx=(((34-latd)*12)|0)*1032+(((lond+118)*12)|0);
        col=LB.px[idx];
        if (OV){ const o=OV.px[idx];
          if (opaque){ if (((o&255)+((o>>8)&255)+((o>>16)&255))>40) col=o; }
          else { let a=((o>>>24)&255)/255; if (lay==='grace') a=1; a*=alphaK; if (a>.03){ const ir=1-a; col=(255<<24)|((((col>>16)&255)*ir+((o>>16)&255)*a)<<16)|((((col>>8)&255)*ir+((o>>8)&255)*a)<<8)|(((col&255)*ir+(o&255)*a)|0); } }
        }
      } else col=W.px[(((90-latd)*Wh/180)|0)*Ww+(((lond+180)*Ww/360)|0)];
      const sh=.38+.62*Math.pow(cosc,.6);
      buf[row+px]=(255<<24)|((((col>>16)&255)*sh)<<16)|((((col>>8)&255)*sh)<<8)|(((col&255)*sh)|0);
    }
  }
  G.tcx.putImageData(G.timg,0,0);
}
function drawGlobe(){
  if (!G.ctx || !window.d3) return;
  const {ctx,w,h}=G, r=G.r0*G.k;
  const proj=G.proj.scale(r).translate([w/2,h/2]).rotate(G.rot), path=d3.geoPath(proj,ctx);
  ctx.clearRect(0,0,w,h);
  const glow=ctx.createRadialGradient(w/2,h/2,r*.96,w/2,h/2,r*1.16);
  glow.addColorStop(0,'rgba(120,200,255,.42)'); glow.addColorStop(.35,'rgba(0,150,255,.14)'); glow.addColorStop(1,'rgba(0,120,255,0)');
  ctx.fillStyle=glow; ctx.beginPath(); ctx.arc(w/2,h/2,r*1.16,0,2*Math.PI); ctx.fill();
  if (TEX.ready){
    const moving = G.anim || G.spin || G.dragging || (performance.now()-(G.lastMove||0) < 160);
    const q = moving ? .5 : Math.min(1.5, window.devicePixelRatio||1);
    const key=[G.rot[0].toFixed(2),G.rot[1].toFixed(2),G.k.toFixed(3),G.tlayer,w,h,q,Object.keys(TEX.list).length].join('|');
    if (key!==G.texKey){ renderTexture(q); G.texKey=key; }
    ctx.drawImage(G.tcv,0,0,w,h);
    ctx.beginPath(); path(G.grat); ctx.strokeStyle='rgba(255,255,255,.07)'; ctx.lineWidth=.5; ctx.stroke();
    for (const f of G.countries){
      if (!f.latam && f!==G.hover) continue;
      ctx.beginPath(); path(f);
      if (f===G.hover || (G.sel && G.sel.country===f)){ ctx.fillStyle='rgba(74,222,128,.12)'; ctx.fill(); }
      ctx.strokeStyle = (G.sel && G.sel.country===f) ? 'rgba(74,222,128,.9)' : 'rgba(255,255,255,.45)'; ctx.lineWidth = (G.sel && G.sel.country===f) ? 1.4 : .6; ctx.stroke();
    }
  } else {
    const oc=ctx.createRadialGradient(w/2-r*.35,h/2-r*.35,r*.1,w/2,h/2,r); oc.addColorStop(0,'#123456'); oc.addColorStop(1,'#071427');
    ctx.beginPath(); path({type:'Sphere'}); ctx.fillStyle=oc; ctx.fill();
    ctx.beginPath(); path(G.grat); ctx.strokeStyle='rgba(45,212,191,.09)'; ctx.lineWidth=.6; ctx.stroke();
    for (const f of G.countries){ ctx.beginPath(); path(f); ctx.fillStyle = f===G.hover ? (f.latam?'#2f6b62':'#26324a') : f.latam ? '#1f4a47' : '#18233a'; if (G.sel && G.sel.country===f) ctx.fillStyle='#2a7a6e'; ctx.fill(); ctx.strokeStyle = f.latam ? 'rgba(125,240,255,.45)' : 'rgba(125,160,200,.18)'; ctx.lineWidth = f.latam ? .7 : .4; ctx.stroke(); }
  }
  ctx.beginPath(); path({type:'Sphere'}); ctx.strokeStyle='rgba(150,220,255,.55)'; ctx.lineWidth=1; ctx.stroke();
  const pr=3+Math.min(3.5,G.k*.7), labels=[];
  for (const k in SITES){
    const s=SITES[k]; if (!inView(s.lon,s.lat)) continue;
    const [x,y]=proj([s.lon,s.lat]), on=k===S.siteKey || k===S.site.refKey;
    ctx.beginPath(); ctx.arc(x,y,pr+1.5,0,2*Math.PI); ctx.fillStyle='rgba(10,15,26,.75)'; ctx.fill();
    ctx.beginPath(); ctx.arc(x,y,pr,0,2*Math.PI); ctx.fillStyle= on ? '#4ade80' : '#99f6e4'; ctx.fill();
    if (G.k>=2.4){ const lbl=siteRegion(s).split(' · ')[0]; ctx.font='600 10.5px Inter, sans-serif'; const tw=ctx.measureText(lbl).width, rc=[x+pr+4,y-8,tw+6,14];
      if (!labels.some(o=>rc[0]<o[0]+o[2]&&rc[0]+rc[2]>o[0]&&rc[1]<o[1]+o[3]&&rc[1]+rc[3]>o[1])){ labels.push(rc); ctx.fillStyle='rgba(10,15,26,.72)'; ctx.fillRect(rc[0]-3,rc[1],rc[2],rc[3]); ctx.fillStyle='#e8f4ff'; ctx.fillText(lbl,x+pr+4,y+3); } }
  }
  const sp=[S.site.lon,S.site.lat];
  if (inView(...sp)){
    const [x,y]=proj(sp), t=(performance.now()/900)%1;
    ctx.beginPath(); ctx.arc(x,y,7+t*16,0,2*Math.PI); ctx.strokeStyle=`rgba(74,222,128,${1-t})`; ctx.lineWidth=2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x-11,y); ctx.lineTo(x-4,y); ctx.moveTo(x+4,y); ctx.lineTo(x+11,y); ctx.moveTo(x,y-11); ctx.lineTo(x,y-4); ctx.moveTo(x,y+4); ctx.lineTo(x,y+11); ctx.strokeStyle='#4ade80'; ctx.lineWidth=1.6; ctx.stroke();
    ctx.beginPath(); ctx.arc(x,y,3,0,2*Math.PI); ctx.fillStyle='#fff'; ctx.fill();
  }
}
function renderLegend(){
  const L=GLAYERS[G.tlayer], ends=lx(L,'ends');
  $('#glegend').innerHTML = `<div class="lg-t">${lx(L,'lbl')}</div>${L.ramp?`<div class="ramp" style="background:linear-gradient(90deg,${L.ramp.join(',')})"></div><div class="ends"><span>${ends[0]}</span><span>${ends[1]}</span></div>`:''}<div class="lg-s">${srcChip('gibs')} ${tr('NASA GIBS · local snapshot · visualization only','NASA GIBS · instantánea local · solo visualización')}</div><div class="lg-s"><i></i> ${Object.keys(SITES).length} ${tr('reference regions','regiones de referencia')}</div>`;
}
