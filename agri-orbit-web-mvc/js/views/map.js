/* AGRI-ORBIT · js/views/map.js
   Vista: mapa de parcelas. */

/* ---------- Mapa de parcelas ---------- */
let PARCELS=[];
function buildParcels(){
  const rand=rng(7), cols=4, rows=2, W=600, Hh=270, x0=30, y0=30, V=[];
  for (let j=0;j<=rows;j++){ V[j]=[]; for (let i=0;i<=cols;i++){
    const inner = i>0&&i<cols&&j>0&&j<rows, edgeX = (i>0&&i<cols), edgeY=(j>0&&j<rows);
    V[j][i]=[x0+i*W/cols+(edgeX?(rand()-.5)*50:0), y0+j*Hh/rows+(edgeY?(rand()-.5)*40:0)+(inner?0:0)];
  }}
  PARCELS=[]; let k=0;
  for (let j=0;j<rows;j++) for (let i=0;i<cols;i++){
    const pts=[V[j][i],V[j][i+1],V[j+1][i+1],V[j+1][i]];
    const cx=pts.reduce((a,p)=>a+p[0],0)/4, cy=pts.reduce((a,p)=>a+p[1],0)/4;
    PARCELS.push({k, pts, cx, cy, sf:.55+rand()*.9, mf:.85+rand()*.3}); k++;
  }
}
function parcelCrop(R, k, t){ return R.seq[(t + k) % R.seq.length]; }
function colorScale(v){ // 0 verde -> 1 rojo
  const a=[52,255,140], b=[255,185,95], c=[255,90,90];
  const mix=(x,y,f)=>x.map((xv,i)=>r0(xv+(y[i]-xv)*f));
  const col = v<.5 ? mix(a,b,v*2) : mix(b,c,(v-.5)*2);
  return `rgb(${col.join(',')})`;
}
function moistScale(v){ const f=clamp(v); const a=[107,88,68], b=[0,180,216]; return `rgb(${a.map((x,i)=>r0(x+(b[i]-x)*f)).join(',')})`; }

function renderMap(){
  const R=getSel(), t=S.year, H=S.ctx.H, s=S.site;
  const svg=$('#farm');
  let h = `<defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="rgba(0,0,0,.25)" stroke-width="2"/></pattern></defs>`;
  h += `<path d="M10 300 C 140 260, 230 320, 360 292 S 560 250, 650 300" fill="none" stroke="#00b4d8" stroke-width="5" opacity=".55"/>`;
  h += `<text x="560" y="318" fill="#00b4d8" font-size="10" opacity=".8">${tr('creek','quebrada')}</text>`;
  PARCELS.forEach(p=>{
    const id=parcelCrop(R,p.k,t), c=CROPS[id];
    const slope = S.slope*p.sf;
    let fill=c.c, val='';
    if (S.layer==='erosion'){ const v=clamp(H.erosion.v*(slope/Math.max(1,S.slope))*(1-c.cov)*(.6+.6*c.till)*1.6); fill=colorScale(v); val=pct(v); }
    if (S.layer==='frost'){ const v=clamp(s.frost*(.45+.75*(p.cy/300))*(1-.3*(slope/Math.max(1,S.slope*1.4))) * (1-c.ft*.6)); fill=colorScale(v); val=s.frost?pct(v):tr('no frost','sin helada'); }
    if (S.layer==='moist'){ const v=clamp(s.GWET*p.mf*(1+.25*(c.cov-.5)) - .004*slope); fill=moistScale(v); val=v.toFixed(2); }
    const pts=p.pts.map(q=>q.join(',')).join(' ');
    h += `<polygon class="parcel ${S.parcel===p.k?'sel':''}" data-k="${p.k}" points="${pts}" fill="${fill}" fill-opacity="${S.layer==='crop'?.78:.85}" stroke="#0a0f1a" stroke-width="2"/>`;
    if (id==='barbecho' && S.layer==='crop') h += `<polygon points="${pts}" fill="url(#hatch)" pointer-events="none"/>`;
    h += `<text x="${p.cx}" y="${p.cy-4}" text-anchor="middle" font-size="11" fill="#0a0f1a" font-weight="700" pointer-events="none">P-${String(p.k+1).padStart(2,'0')}</text>`;
    h += `<text x="${p.cx}" y="${p.cy+10}" text-anchor="middle" font-size="9.5" fill="#0a0f1a" pointer-events="none">${S.layer==='crop'?cn(c).split(' ')[0]:val}</text>`;
  });
  h += `<line x1="30" y1="22" x2="630" y2="22" stroke="#2dd4bf" stroke-dasharray="3 3" opacity=".5"/>`;
  h += `<text x="30" y="16" fill="#2dd4bf" font-size="9.5">${tr('Demo farm · 8 plots ·','Finca demo · 8 parcelas ·')} ${siteName(s)}</text>`;
  svg.innerHTML=h;
  svg.querySelectorAll('.parcel').forEach(el=>{
    el.onclick=()=>{S.parcel=+el.dataset.k; renderMap();};
    el.onmousemove=ev=>{const k=+el.dataset.k, id=parcelCrop(R,k,t); const tip=$('#tip'); tip.style.display='block'; tip.style.left=(ev.clientX+12)+'px'; tip.style.top=(ev.clientY+12)+'px'; tip.innerHTML=`P-${String(k+1).padStart(2,'0')} · ${cn(CROPS[id])}<br>${tr('Slope','Pendiente')} ≈ ${r0(S.slope*PARCELS[k].sf)} %`;};
    el.onmouseleave=()=>$('#tip').style.display='none';
  });
  const L=R.seq.length;
  $('#yearLbl').textContent = tr(`Cycle ${t+1} of ${2*L}`,`Ciclo ${t+1} de ${2*L}`);
  $('#year').max = 2*L-1;
  // leyenda
  if (S.layer==='crop'){
    $('#legend').innerHTML=[...new Set(R.seq)].map(pill).join('');
  } else if (S.layer==='erosion' || S.layer==='frost'){
    $('#legend').innerHTML=`<span class="pill"><i style="background:${colorScale(0)}"></i>${tr('low','bajo')}</span><span class="pill"><i style="background:${colorScale(.5)}"></i>${tr('medium','medio')}</span><span class="pill"><i style="background:${colorScale(1)}"></i>${tr('high','alto')}</span>`;
  } else {
    $('#legend').innerHTML=`<span class="pill"><i style="background:${moistScale(.2)}"></i>${tr('dry','seco')}</span><span class="pill"><i style="background:${moistScale(.5)}"></i>${tr('medium','medio')}</span><span class="pill"><i style="background:${moistScale(.85)}"></i>${tr('wet','húmedo')}</span>`;
  }
  // detalle
  const p=PARCELS[S.parcel];
  let tl='';
  for (let y=0;y<2*L;y++){ const id=parcelCrop(R,p.k,y); tl+=`<div class="${y===t?'now':''}"><span style="width:56px">${tr('Cycle','Ciclo')} ${y+1}</span>${pill(id)}</div>`; }
  const id=parcelCrop(R,p.k,t), st=R.stages[R.seq.indexOf(id)];
  $('#pdetail').innerHTML = `<h4>${tr('Plot','Parcela')} P-${String(p.k+1).padStart(2,'0')}</h4>
    <div class="mono" style="font-size:11px;color:var(--muted)">${tr('Slope','Pendiente')} ≈ ${r0(S.slope*p.sf)} % · ${tr('now','ahora')}: <b style="color:var(--txt)">${cn(CROPS[id])}</b></div>
    <div class="mono" style="font-size:11px;color:var(--muted)">${tr('Crop suitability','Aptitud del cultivo')}: <b style="color:var(--green)">${pct(st?st.y:0)}</b></div>
    <div class="tl">${tl}</div>`;
}
