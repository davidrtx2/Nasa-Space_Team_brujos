/* AGRI-ORBIT · js/views/dashboard.js
   Vistas: barra de estado, clima, KPIs, ranking y constructor de rotación. */

/* =========================================================
   RENDER
   ========================================================= */
function renderStrip(){
  const s=S.site, e=envFrom();
  $('#strip').innerHTML = `
    <span><span class="live ${LIVE.mode?'':'off'}"></span> ${tr('Climate:','Clima:')} <b>${dataLabel()}</b></span>
    <span>${tr('Site:','Sitio:')} <b>${siteName(s)}</b></span>
    <span>${tr('Coordinates:','Coordenadas:')} <b>${s.lat.toFixed(2)}, ${s.lon.toFixed(2)}</b></span>
    <span>${tr('Scenario:','Escenario:')} <b>${scen().lbl}</b></span>
    <span class="chip"><span class="k">${tr('Season T','T temporada')}</span> ${e.Tg.toFixed(1)} °C</span>
    <span class="chip"><span class="k">${tr('Rainfall','Lluvia')}</span> ${r0(e.P)} mm</span>
    <span class="chip"><span class="k">${tr('Root moisture','Humedad radicular')}</span> ${s.GWET.toFixed(2)}</span>`;
}

function renderClimate(){
  const s=S.site;
  $('#clim').innerHTML = [
    [tr('Season T','T temporada'), s.Tg.toFixed(1)+' °C','T2M'],
    [tr('Warmest-month max','Máx. mes cálido'), s.Tmax.toFixed(1)+' °C','T2M_MAX'],
    [tr('Annual rainfall','Lluvia anual'), r0(s.P)+' mm','PRECTOTCORR'],
    [tr('Root moisture','Humedad radicular'), s.GWET.toFixed(2),'GWETROOT'],
    [tr('Radiation','Radiación'), s.SW.toFixed(1)+' kWh/m²','ALLSKY_SFC_SW_DWN'],
    [tr('Rain variability','Variab. lluvia'), pct(s.Pcv),'CV interanual']
  ].map(([k,v,src])=>`<div><div class="k">${k}</div><div class="v">${v}</div><div class="s">${src}</div></div>`).join('');
  $('#climNote').innerHTML = LIVE.mode==='live' ? `<span class="ok">● ${tr('NASA POWER live','NASA POWER en vivo')}</span> ${tr('for','para')} ${s.lat.toFixed(2)}, ${s.lon.toFixed(2)}.`
    : LIVE.mode==='snap' ? `<span class="ok">◆ ${tr('Real NASA POWER data','Datos reales de NASA POWER')}</span> ${tr('downloaded on','descargados el')} ${fmtFecha(SNAP.date)}${s.refKey?` ${tr('for','para')} ${siteRegion(SITES[s.refKey])} (${r0(s.refDist)} km ${tr('from your point','de tu punto')})`:''}. ${tr('Published on the web, the page refreshes them live.','Publicada en la web, la página los actualiza en vivo.')}`
    : `<span class="warn">● ${tr('Querying NASA…','Consultando a la NASA…')}</span>`;
}

function renderKPIs(){
  const R=getSel(), B=S.base;
  const d=(a,b,inv)=>{const x=a-b; const good=inv? x<0 : x>0; return `<span class="${Math.abs(x)<1?'':good?'ok':'bad'}">${x>0?'+':''}${r0(x)} ${tr('vs current','vs actual')}</span>`;};
  $('#kpis').innerHTML = `
    <div class="kpi"><div class="k">${tr('Irrigation needed','Riego necesario')}</div><div class="v" style="color:var(--cyan)">${r0(R.m.irrigation)} mm</div><div class="s">${tr('per cycle','por ciclo')} · ${d(R.m.irrigation,B.m.irrigation,true)}</div></div>
    <div class="kpi"><div class="k">${tr('Exposed soil','Suelo expuesto')}</div><div class="v" style="color:var(--amber)">${r0(R.m.bare)} %</div><div class="s">${d(R.m.bare,B.m.bare,true)}</div></div>
    <div class="kpi"><div class="k">${tr('Biological N','N biológico')}</div><div class="v" style="color:var(--green)">${r0(R.m.nFix)} kg</div><div class="s">${tr('N/ha/cycle fixed','N/ha/ciclo fijado')}</div></div>
    <div class="kpi"><div class="k">${tr('N fertilizer','Fertilizante N')}</div><div class="v">${r0(R.m.nFert)} kg</div><div class="s">${tr('N/ha/cycle','N/ha/ciclo')} · ${d(R.m.nFert,B.m.nFert,true)}</div></div>`;
}

function rotRow(R, idx){
  const sel = (S.sel===idx);
  const bar=(lbl,v,col)=>`<span>${lbl}</span><span class="bar"><span style="width:${v}%;background:${col}"></span></span><span>${r0(v)}</span>`;
  return `<button class="rot ${sel?'sel':''} ${R.isBase?'base':''}" data-i="${idx}">
    <div class="n">${R.isBase?tr('NOW','HOY'):R.isCustom?'★':(idx+1)}</div>
    <div>
      <div class="seq">${seqHTML(R.seq)}${idx===0?`<span class="topbadge">${tr('BEST FIT','MEJOR AJUSTE')}</span>`:''}</div>
      <div class="meta">${R.isBase?tr('Your current rotation · ','Tu rotación actual · '):R.isCustom?tr('Your rotation · ','Tu rotación · '):''}${tr('Overall score','Puntaje global')} <b style="color:var(--green)">${r0(R.m.overall)}</b> · ${R.m.cash} ${tr('cash cycles','ciclos comerciales')} · ${tr('diversity','diversidad')} ${pct(R.m.div)}</div>
    </div>
    <div class="bars">
      ${bar(tr('Econ.','Econ.'),R.m.econ,'var(--amber)')}${bar(tr('Water','Agua'),R.m.water,'var(--cyan)')}${bar(tr('Soil','Suelo'),R.m.soil,'var(--green)')}${bar(tr('Stab.','Estab.'),R.m.resil,'var(--violet)')}
    </div></button>`;
}

function renderRanking(){
  $('#nEval').textContent = `${S.nEval.toLocaleString(LANG)} ${tr('rotations evaluated','rotaciones evaluadas')}`;
  let h = S.results.map((r,i)=>rotRow(r,i)).join('');
  if (S.customRes) h += rotRow(S.customRes,'custom');
  h += rotRow(S.base,'base');
  $('#rank').innerHTML = h;
  $('#rank').querySelectorAll('.rot').forEach(b=>b.onclick=()=>{
    const i=b.dataset.i;
    if (i==='base'){ toast(tr('That is your current rotation: it is the baseline for comparison.','Esa es tu rotación actual: sirve de base para comparar.')); S.cmp='base'; renderDependent(); return; }
    S.sel = i==='custom' ? 'custom' : +i; renderDependent();
  });
}

function renderBuilder(){
  const opts = Object.keys(CROPS).map(k=>`<option value="${k}">${cn(CROPS[k])}</option>`).join('');
  const cur = S.custom || getSel().seq;
  let h='';
  for (let i=0;i<S.L;i++){ h += `<select data-i="${i}" aria-label="${tr('Cycle','Ciclo')} ${i+1}">${opts}</select>${i<S.L-1?'<span class="arrow">→</span>':''}`; }
  h += `<button class="btn solid" id="addCustom">${tr('Evaluate','Evaluar')}</button>`;
  if (S.custom) h += `<button class="btn" id="clrCustom">${tr('Remove','Quitar')}</button>`;
  $('#builder').innerHTML = h;
  $('#builder').querySelectorAll('select').forEach((s,i)=>s.value = cur[i] || 'maiz');
  $('#addCustom').onclick = ()=>{
    S.custom = [...$('#builder').querySelectorAll('select')].map(s=>s.value);
    runEngine(); S.sel='custom'; renderAll(); toast(tr('Your rotation was added to the ranking','Tu rotación se añadió al ranking'));
  };
  if ($('#clrCustom')) $('#clrCustom').onclick=()=>{ S.custom=null; S.customRes=null; if(S.sel==='custom')S.sel=0; if(S.cmp==='custom')S.cmp='base'; renderAll(); };
}

function reasons(R){
  const e=S.ctx.env, H=S.ctx.H, B=S.base, out=[];
  const L=R.seq.length;
  for (let i=0;i<L;i++){
    const c=CROPS[R.seq[i]], p=CROPS[R.seq[(i-1+L)%L]], st=R.stages[i];
    if (p.nfix>=40 && c.ndem>=80) out.push(['g',tr(`<b>${cn(p)}</b> fixes nitrogen (~${p.nfix} kg N/ha) that the next <b>${cn(c)}</b> uses: less fertilizer and +10% expected yield.`,`<b>${cn(p)}</b> fija nitrógeno (~${p.nfix} kg N/ha) que aprovecha el <b>${cn(c)}</b> siguiente: menos fertilizante y +10 % de rendimiento esperado.`)]);
    if (p.fam===c.fam && p.id!==c.id && c.id!=='barbecho') out.push(['w',tr(`<b>${cn(p)}</b> and <b>${cn(c)}</b> are the same family (${cfam(c)}): they share pests; watch the pest management.`,`<b>${cn(p)}</b> y <b>${cn(c)}</b> son de la misma familia (${cfam(c)}): comparten plagas; vigila el manejo sanitario.`)]);
    if (c.cover) out.push([e.P<750?'w':'g', e.P<750 ? tr(`<b>${cn(c)}</b> protects the soil, but on a dry site it competes for water with the next crop: sow it only after good rain.`,`<b>${cn(c)}</b> protege el suelo, pero en un sitio seco compite por agua con el cultivo siguiente: siémbrala solo si hubo buena lluvia.`) : tr(`<b>${cn(c)}</b> covers the soil (${pct(c.cov)} protection) and adds organic matter for the next cycle.`,`<b>${cn(c)}</b> cubre el suelo (${pct(c.cov)} de protección) y aporta materia orgánica para el ciclo siguiente.`)]);
    if (st.sc.deficitRain > 60 && c.need>0) out.push(['w',tr(`<b>${cn(c)}</b> needs ~${c.need} mm per cycle and rain provides ~${r0(st.sc.W)} mm: a ${r0(st.sc.deficitRain)} mm deficit${S.irr==='none'?' (rainfed, so yield drops)':' covered by irrigation'}.`,`<b>${cn(c)}</b> necesita ~${c.need} mm por ciclo y la lluvia aporta ~${r0(st.sc.W)} mm: déficit de ${r0(st.sc.deficitRain)} mm${S.irr==='none'?' (sin riego, el rendimiento se reduce)':' que cubre el riego'}.`)]);
    if (H.heat.v > .35 && c.ht >= .7 && !c.cover) out.push(['g',tr(`<b>${cn(c)}</b> tolerates heat: useful with highs of ${e.Tmax.toFixed(1)} °C in the chosen scenario.`,`<b>${cn(c)}</b> tolera el calor: útil con máximas de ${e.Tmax.toFixed(1)} °C en el escenario elegido.`)]);
    if (c.id==='barbecho') out.push(['w',tr(`Fallow leaves the soil exposed${e.P<750?'; on dry rainfed land it helps store moisture, but increases erosion':''}.`,`El barbecho deja el suelo expuesto${e.P<750?'; en secano seco ayuda a acumular humedad, pero aumenta la erosión':''}.`)]);
  }
  const uniq=[]; const seen=new Set(); for (const r of out){ if(!seen.has(r[1])){seen.add(r[1]);uniq.push(r);} }
  if (!R.isBase){
    const dd=(k)=>r0(R.m[k]-B.m[k]);
    uniq.unshift(['',tr(`Versus your current rotation (${seqTxt(B.seq)}): water ${dd('water')>=0?'+':''}${dd('water')}, soil ${dd('soil')>=0?'+':''}${dd('soil')}, stability ${dd('resil')>=0?'+':''}${dd('resil')} and economics ${dd('econ')>=0?'+':''}${dd('econ')} points.`,`Frente a tu rotación actual (${seqTxt(B.seq)}): agua ${dd('water')>=0?'+':''}${dd('water')}, suelo ${dd('soil')>=0?'+':''}${dd('soil')}, estabilidad ${dd('resil')>=0?'+':''}${dd('resil')} y economía ${dd('econ')>=0?'+':''}${dd('econ')} puntos.`)]);
  }
  if (S.mc && !R.isBase) uniq.push(['',tr(`In ${pct(S.mc.pWin)} of the 1,000 climate simulations it ends with more cumulative income than the compared rotation.`,`En ${pct(S.mc.pWin)} de las 1 000 simulaciones climáticas termina con más ingreso acumulado que la rotación comparada.`)]);
  return uniq.slice(0,8);
}

function renderWhy(){
  const R=getSel(), el=$('#why');
  if (el) el.innerHTML = `<li><b>${R.name}:</b> ${seqTxt(R.seq)}</li>` + reasons(R).map(([c,t])=>`<li class="${c}">${t}</li>`).join('');
}
