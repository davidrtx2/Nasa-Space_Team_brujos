/* AGRI-ORBIT · js/views/analysis.js
   Vistas: trade-offs, riesgo e incertidumbre (abanico Monte Carlo). */

/* ---------- Trade-offs ---------- */
function renderCmpSelect(){
  const sel=$('#cmp');
  let o=`<option value="base">${tr('vs. your current rotation','vs. tu rotación actual')}</option>`;
  S.results.forEach((r,i)=>{ if(S.sel!==i) o+=`<option value="${i}">${tr('vs. Option','vs. Opción')} ${i+1}</option>`; });
  if (S.customRes && S.sel!=='custom') o+=`<option value="custom">${tr('vs. My rotation','vs. Mi rotación')}</option>`;
  sel.innerHTML=o;
  if ([...sel.options].some(x=>x.value===String(S.cmp))) sel.value=String(S.cmp); else { S.cmp='base'; sel.value='base'; }
}
function renderTrade(){
  const A=getSel(), B=getCmp();
  const axes=[['econ',tr('Economics','Economía')],['water',tr('Water','Agua')],['soil',tr('Soil','Suelo')],['resil',tr('Stability','Estabilidad')],['nAuto',tr('Own N','N propio')]];
  const cx=120, cy=118, R=82, n=axes.length;
  const pt=(i,v)=>{const a=-Math.PI/2+i*2*Math.PI/n; return [cx+Math.cos(a)*R*v/100, cy+Math.sin(a)*R*v/100];};
  let h='';
  [25,50,75,100].forEach(l=>{ h+=`<polygon points="${axes.map((_,i)=>pt(i,l).join(',')).join(' ')}" fill="none" stroke="#1f2a3d" stroke-width="${l===100?1:.6}"/>`; });
  axes.forEach((ax,i)=>{ const [x,y]=pt(i,100), [lx,ly]=pt(i,122); h+=`<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#1f2a3d"/>`; h+=`<text x="${lx}" y="${ly+3}" text-anchor="middle" font-size="9.5" fill="#94a3b8">${ax[1]}</text>`; });
  h+=`<polygon points="${axes.map((ax,i)=>pt(i,B.m[ax[0]]).join(',')).join(' ')}" fill="rgba(248,113,113,.15)" stroke="#f87171" stroke-width="1.5" stroke-dasharray="4 3"/>`;
  h+=`<polygon points="${axes.map((ax,i)=>pt(i,A.m[ax[0]]).join(',')).join(' ')}" fill="rgba(124,197,118,.22)" stroke="#7cc576" stroke-width="2"/>`;
  $('#radar').innerHTML=h;
  const rows=[['econ',tr('Expected profit (index)','Ganancia esperada (índice)')],['water',tr('Fit to rainfall (less irrigation)','Ajuste a la lluvia (menos riego)')],['soil',tr('Soil health','Salud del suelo')],['resil',tr('Stability under extremes','Estabilidad ante extremos')],['nAuto',tr('Nitrogen self-sufficiency','Autonomía de nitrógeno')]];
  $('#tbars').innerHTML = `<div class="mono" style="display:flex;gap:12px;font-size:10px;margin-bottom:6px"><span style="color:var(--cyan)">━ ${A.name}</span><span style="color:var(--red)">┅ ${B.name}</span></div>` +
    rows.map(([k,l])=>{const a=A.m[k], b=B.m[k], d=a-b;
      return `<div style="margin-bottom:8px"><div class="mono" style="display:flex;justify-content:space-between;font-size:10.5px;color:var(--muted)"><span>${l}</span><span class="${Math.abs(d)<2?'':d>0?'ok':'bad'}">${r0(a)} vs ${r0(b)} (${d>0?'+':''}${r0(d)})</span></div>
      <div class="bar" style="height:6px;margin-top:3px"><span style="width:${a}%"></span></div>
      <div class="bar" style="height:3px;margin-top:2px"><span style="width:${b}%;background:var(--red);opacity:.7"></span></div></div>`;}).join('');
  const de=A.m.econ-B.m.econ, ds=A.m.soil-B.m.soil;
  $('#tradeNote').innerHTML = de<-3 && ds>3
    ? tr(`<b>Trade-off:</b> ${A.name} sacrifices ${r0(-de)} points of immediate profit in exchange for +${r0(ds)} in soil health. Move the “Profit per cycle” control to see how the recommendation changes.`,`<b>Compromiso:</b> ${A.name} sacrifica ${r0(-de)} puntos de ganancia inmediata a cambio de +${r0(ds)} en salud del suelo. Mueve el control “Ganancia del ciclo” para ver cómo cambia la recomendación.`)
    : de>=-3 && ds>3 ? tr(`<b>Wins on both fronts:</b> ${A.name} keeps the profit and improves the soil versus ${B.name}.`,`<b>Gana en ambos frentes:</b> ${A.name} mantiene la ganancia y mejora el suelo frente a ${B.name}.`)
    : tr(`Adjust your priorities to explore other combinations.`,`Ajusta tus prioridades para explorar otras combinaciones.`);
  $('#tradeGrid').style.gridTemplateColumns = window.innerWidth<700 ? '1fr' : '220px 1fr';
}

/* ---------- Riesgo ---------- */
function renderRisk(){
  const A=getSel(), B=getCmp(), H=S.ctx.H;
  $('#riskTag').textContent = scen().lbl;
  $('#hzCmpLbl').textContent = B.isBase?tr('Current','Actual'):B.name;
  $('#hz').innerHTML = Object.keys(H).map(k=>{
    const h=H[k], a=A.risk[k], b=B.risk[k];
    const cls=v=> v>.45?'bad':v>.22?'warn':'ok';
    return `<div class="hz"><div><div class="t">${h.n}</div><div class="d">${h.d}</div>
      <div class="lvl"><span style="width:${h.v*100}%;background:${colorScale(h.v)}"></span></div></div>
      <div class="c ${cls(a)}"><b>${pct(a)}</b>residual</div><div class="c ${cls(b)}"><b>${pct(b)}</b>residual</div></div>`;
  }).join('');
}

/* ---------- Incertidumbre ---------- */
function renderFan(){
  const A=getSel(), B=getCmp();
  const mc=monteCarlo(A,B); S.mc=mc;
  const W=720,Hh=260,ml=48,mr=16,mt=30,mb=34, H=mc.H;
  const max=Math.max(...mc.stats[0].map(s=>s.p90),...mc.stats[1].map(s=>s.p90),1)*1.05;
  const X=t=>ml+t*(W-ml-mr)/H, Y=v=>mt+(1-v/max)*(Hh-mt-mb);
  const band=(st,lo,hi)=>st.map((s,t)=>`${X(t)},${Y(s[hi])}`).join(' ')+' '+st.slice().reverse().map((s,i)=>`${X(H-i)},${Y(s[lo])}`).join(' ');
  const line=(st,k)=>st.map((s,t)=>`${X(t)},${Y(s[k])}`).join(' ');
  let h='';
  for (let i=0;i<=4;i++){ const v=max*i/4; h+=`<line x1="${ml}" x2="${W-mr}" y1="${Y(v)}" y2="${Y(v)}" stroke="#1f2a3d" stroke-dasharray="2 3"/><text x="${ml-6}" y="${Y(v)+3}" text-anchor="end" font-size="9" fill="#64748b">${r0(v)}</text>`; }
  for (let t=0;t<=H;t++){ h+=`<text x="${X(t)}" y="${Hh-mb+14}" text-anchor="middle" font-size="9" fill="#64748b">${t}</text>`; }
  h+=`<text x="${(W)/2}" y="${Hh-4}" text-anchor="middle" font-size="9.5" fill="#94a3b8">${tr('crop cycles','ciclos de cultivo')}</text>`;
  h+=`<text x="12" y="${Hh/2}" transform="rotate(-90 12 ${Hh/2})" text-anchor="middle" font-size="9.5" fill="#94a3b8">${tr('cumulative income (index)','ingreso acumulado (índice)')}</text>`;
  h+=`<polygon points="${band(mc.stats[1],'p10','p90')}" fill="rgba(248,113,113,.08)"/>`;
  h+=`<polyline points="${line(mc.stats[1],'p50')}" fill="none" stroke="#f87171" stroke-width="1.6" stroke-dasharray="5 3"/>`;
  h+=`<polygon points="${band(mc.stats[0],'p10','p90')}" fill="rgba(251,191,36,.16)"/>`;
  h+=`<polygon points="${band(mc.stats[0],'p25','p75')}" fill="rgba(45,212,191,.28)"/>`;
  h+=`<polyline points="${line(mc.stats[0],'p50')}" fill="none" stroke="#7cc576" stroke-width="2.2"/>`;
  const last=mc.stats[0][H];
  h+=`<text x="${X(H)-4}" y="${Y(last.p50)-6}" text-anchor="end" font-size="10" fill="#7cc576">${A.name}</text>`;
  h+=`<text x="${X(H)-4}" y="${Y(mc.stats[1][H].p50)+12}" text-anchor="end" font-size="10" fill="#f87171">${B.name}</text>`;
  h+=`<g font-size="9.5" fill="#94a3b8"><rect x="${ml+8}" y="6" width="10" height="6" fill="rgba(45,212,191,.4)"/><text x="${ml+22}" y="12">${tr('central 50 %','50 % central')}</text>
      <rect x="${ml+100}" y="6" width="10" height="6" fill="rgba(251,191,36,.35)"/><text x="${ml+114}" y="12">${tr('80 % of cases','80 % de los casos')}</text></g>`;
  $('#fan').innerHTML=h;
  const spread = (last.p90-last.p10)/Math.max(1,last.p50);
  $('#mcStats').innerHTML = `
    <div class="kpi"><div class="k">${tr('Outperforms','Supera a')} ${B.isBase?tr('your current rotation','tu rotación actual'):B.name}</div><div class="v ${mc.pWin>.6?'ok':mc.pWin<.4?'bad':'warn'}">${pct(mc.pWin)}</div><div class="s">${tr('of simulations, at the end of the horizon','de las simulaciones, al final del horizonte')}</div></div>
    <div class="kpi"><div class="k">${tr('Cycles with severe loss','Ciclos con pérdida severa')}</div><div class="v">${pct(mc.loss[0])} <span style="font-size:12px;color:var(--red)">vs ${pct(mc.loss[1])}</span></div><div class="s">${tr('yields < 50 % of expected','rinde &lt; 50 % de lo esperado')}</div></div>
    <div class="kpi"><div class="k">${tr('Outcome spread','Dispersión del resultado')}</div><div class="v">±${r0(spread*50)} %</div><div class="s">${tr('80 % range around the median','rango 80 % alrededor de la mediana')}</div></div>`;
}
