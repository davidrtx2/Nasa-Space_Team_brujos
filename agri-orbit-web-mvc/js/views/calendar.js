/* AGRI-ORBIT · js/views/calendar.js
   Vista: calendario de cultivos. */

function renderCalendar(){
  const {mo,gs}=S.cal, A=getSel(), B=S.base;
  const W=760,H=150,ml=40,mr=10,mt=14,mb=34, cw=(W-ml-mr)/12;
  const maxV=Math.max(...mo.map(x=>Math.max(x.P,x.ET)),50)*1.1, Y=v=>mt+(1-v/maxV)*(H-mt-mb);
  const FLAG_LBL = {heat:tr('heat','calor'),dry:tr('water stress','falta de agua'),frost:tr('frost','helada'),wet:tr('excess rain','exceso de lluvia')};
  let h='';
  for (let i=0;i<=3;i++){ const v=maxV*i/3; h+=`<line x1="${ml}" x2="${W-mr}" y1="${Y(v)}" y2="${Y(v)}" stroke="#1f2a3d" stroke-dasharray="2 3"/><text x="${ml-5}" y="${Y(v)+3}" text-anchor="end" font-size="9" fill="#64748b">${r0(v)}</text>`; }
  gs.slots.forEach(sl=>{ for(let k=0;k<sl.len;k++){ const m=(sl.start+k)%12; h+=`<rect x="${ml+m*cw}" y="${mt}" width="${cw}" height="${H-mt-mb}" fill="rgba(74,222,128,.05)"/>`; } });
  mo.forEach((x,i)=>{ const x0=ml+i*cw;
    h+=`<rect x="${x0+cw*.2}" y="${Y(x.P)}" width="${cw*.6}" height="${Y(0)-Y(x.P)}" fill="${x.dry?'rgba(251,191,36,.55)':'rgba(45,212,191,.55)'}"><title>${MESL[i]}: ${tr('rain','lluvia')} ${r0(x.P)} mm · ET ${r0(x.ET)} mm</title></rect>`;
    h+=`<text x="${x0+cw/2}" y="${H-mb+12}" text-anchor="middle" font-size="10" fill="#94a3b8">${MES[i]}</text>`;
    const ic=[]; if(x.heat) ic.push(['#f87171',FLAG_LBL.heat]); if(x.frost) ic.push(['#7dd3fc',FLAG_LBL.frost]); if(x.canicula) ic.push(['#fbbf24',tr('dry spell','canícula')]); if(x.wetX) ic.push(['#a78bfa',tr('heavy rain','lluvia intensa')]);
    ic.forEach((c,k)=>{ h+=`<circle cx="${x0+cw/2-((ic.length-1)*5)+k*10}" cy="${H-mb+24}" r="3.5" fill="${c[0]}"><title>${MESL[i]}: ${c[1]}</title></circle>`; });
  });
  h+=`<polyline points="${mo.map((x,i)=>`${ml+i*cw+cw/2},${Y(x.ET)}`).join(' ')}" fill="none" stroke="#fbbf24" stroke-width="2" stroke-dasharray="5 3"/>`;
  h+=`<text x="${ml}" y="9" font-size="9.5" fill="#94a3b8">${tr('mm/month · bars: rain (amber = less than half of ET) · line: evapotranspiration · green band: planting months','mm/mes · barras: lluvia (ámbar = menos de la mitad de la ET) · línea: evapotranspiración · franja verde: meses de siembra')}</text>`;
  $('#climChart').innerHTML=h;
  const row=(lbl,cells,sub)=>`<div class="calrow"><div class="callbl">${lbl}<span>${sub||''}</span></div>${cells.map((c,m)=>{
      const base=`<div class="cell ${c.kind}${c.first?' first':''}"`;
      if (c.kind==='crop'){ const cr=CROPS[c.id]; return `${base} style="background:${cr.c}" title="${MESL[m]}: ${cn(cr)} (${c.slot})${c.flags.length?` · ${tr('vulnerable','vulnerable')}: `+c.flags.map(f=>FLAG_LBL[f]).join(', '):''}">${c.first?`<b>${cn(cr).split(' ')[0]}</b>`:''}${c.flags.length?`<i class="vf ${c.flags[0]}"></i>`:''}</div>`; }
      if (c.kind==='residue') return `${base} title="${MESL[m]}: ${tr('residue of','rastrojo de')} ${cn(CROPS[c.id])} ${tr('(partial protection)','(protección parcial)')}"></div>`;
      if (c.kind==='fallow') return `${base} title="${MESL[m]}: ${tr('fallow (bare soil)','barbecho (suelo desnudo)')}"></div>`;
      return `${base} title="${MESL[m]}: ${tr('unprotected soil','suelo sin protección')}${c.empty?` ${tr('(no suitable crop for this season)','(no hay cultivo adecuado para esta temporada)')}`:''}"></div>`; }).join('')}</div>`;
  const block=(R,title)=>R.cal.rows.map((cells,y)=>row(y===0?title:'',cells,`${tr('Year','Año')} ${y+1}`)).join('');
  $('#calRows').innerHTML = `<div class="calrow head"><div class="callbl"></div>${MES.map(m=>`<div class="mh">${m}</div>`).join('')}</div>`
    + block(B,tr('Your current rotation','Tu rotación actual')) + `<div class="calsep"></div>` + block(A, A.name);
  const d=(a,b)=>{ const x=a-b; return x<-.4?`<span class="ok">${x.toFixed(1)}</span>`:x>.4?`<span class="bad">+${x.toFixed(1)}</span>`:tr('≈ same','≈ igual'); };
  $('#calStats').innerHTML = `
    <div class="kpi"><div class="k">${tr('Months without soil cover','Meses sin protección del suelo')}</div><div class="v">${A.m.bareMonths.toFixed(1)} <span style="font-size:12px;color:var(--muted)">vs ${B.m.bareMonths.toFixed(1)}</span></div><div class="s">${tr('per year','por año')} · ${d(A.m.bareMonths,B.m.bareMonths)} ${tr('vs your rotation','frente a tu rotación')}</div></div>
    <div class="kpi"><div class="k">${tr('Crop months in a vulnerable period','Meses de cultivo en época vulnerable')}</div><div class="v">${A.m.vulnMonths.toFixed(1)} <span style="font-size:12px;color:var(--muted)">vs ${B.m.vulnMonths.toFixed(1)}</span></div><div class="s">${tr('per year · heat, water stress, frost or excess rain','por año · calor, falta de agua, helada o exceso de lluvia')}</div></div>
    <div class="kpi"><div class="k">${tr('Planting seasons','Temporadas de siembra')}</div><div class="v">${gs.slots.length}</div><div class="s">${gs.slots.map(s=>`${s.lbl}: ${MESL[s.start].slice(0,3)}–${MESL[(s.start+s.len-1)%12].slice(0,3)}`).join(' · ')}</div></div>`;
  $('#calTag').textContent = S.site.mT ? tr('real months · NASA POWER','meses reales · NASA POWER') : tr('typical monthly pattern (approx.)','patrón mensual típico (aprox.)');
  const vs=A.cal.vulnList.slice(0,1)[0];
  $('#calNote').innerHTML = (gs.short?`<span class="warn">${tr('The wet season is very short: without irrigation, any rotation is risky. ','La temporada húmeda es muy corta: sin riego, cualquier rotación es arriesgada. ')}</span>`:'')
    + (vs?tr(`Example: ${cn(CROPS[vs.id])} is exposed in ${MESL[vs.m]} (${vs.flags.map(f=>FLAG_LBL[f]).join(', ')}). `,`Ejemplo: ${cn(CROPS[vs.id])} queda expuesto en ${MESL[vs.m]} (${vs.flags.map(f=>FLAG_LBL[f]).join(', ')}). `):tr('No crop in the chosen option falls in a flagged risk period. ','Ningún cultivo de la opción elegida cae en una época de riesgo marcada. '))
    + tr('Months without a crop after maize, sorghum or cover crops count as residue (partial protection) if the stubble is not burned or fully grazed.','Los meses sin cultivo después de maíz, sorgo o coberturas cuentan como rastrojo (protección parcial) si no se quema ni se pastorea por completo.');
}
