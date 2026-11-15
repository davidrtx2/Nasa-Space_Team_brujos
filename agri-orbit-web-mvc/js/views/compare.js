/* AGRI-ORBIT · js/views/compare.js
   Vistas: fichas por estrategia, comparación, rotación actual y mercado. */

/* =========================================================
   FICHA POR ESTRATEGIA Y COMPARACIÓN DE AL MENOS TRES
   ========================================================= */
function strategyCard(R){
  const B=S.base, e=S.ctx.env, s=S.site, sc=scen(), uniq=[...new Set(R.seq)];
  const rs=reasons(R);
  const why=rs.filter(r=>r[0]!=='w').map(r=>r[1]);
  uniq.forEach(id=>{ const c=CROPS[id]; if (c.root==='profunda' && id!=='barbecho') why.push(tr(`<b>${cn(c)}</b> has deep roots: it loosens compacted layers, improves infiltration and recovers nutrients from below.`,`<b>${cn(c)}</b> tiene raíz profunda: afloja capas compactadas, mejora la infiltración y recupera nutrientes de abajo.`)); });
  const ev=[
    tr(`Rainfall ≈ <b>${r0(e.P)} mm/yr</b>, with ${pct(s.Pcv*sc.cv)} year-to-year variation ${srcChip(srcKind(),'NASA POWER · PRECTOTCORR · ~50 km · monthly climatology')}`,
       `Lluvia ≈ <b>${r0(e.P)} mm/año</b>, con ${pct(s.Pcv*sc.cv)} de variación entre años ${srcChip(srcKind(),'NASA POWER · PRECTOTCORR · ~50 km · climatología mensual')}`),
    tr(`Warmest-month high ≈ <b>${e.Tmax.toFixed(1)} °C</b> in the chosen scenario ${srcChip(srcKind(),'NASA POWER · T2M_MAX')}`,
       `Máxima del mes más cálido ≈ <b>${e.Tmax.toFixed(1)} °C</b> en el escenario elegido ${srcChip(srcKind(),'NASA POWER · T2M_MAX')}`),
    tr(`Root-zone moisture: <b>${s.GWET.toFixed(2)}</b> (0 = dry, 1 = saturated) ${srcChip(srcKind(),'NASA POWER · GWETROOT')}`,
       `Humedad de la zona de raíces: <b>${s.GWET.toFixed(2)}</b> (0 = seco, 1 = saturado) ${srcChip(srcKind(),'NASA POWER · GWETROOT')}`),
    tr(`<b>${S.cal.dryMonths} months</b> when rain does not reach half of evapotranspiration ${srcChip('model')}`,
       `<b>${S.cal.dryMonths} meses</b> en que la lluvia no alcanza la mitad de la evapotranspiración ${srcChip('model')}`),
    tr(`Total water storage anomaly: <b>${s.gw>=.5?'marked decline':s.gw>=.25?'moderate decline':'no strong decline'}</b> (regional, not plot-level) ${srcChip('ref','GRACE / GRACE-FO · monthly mascon anomaly')}`,
       `Anomalía del agua total almacenada: <b>${s.gw>=.5?'descenso marcado':s.gw>=.25?'descenso moderado':'sin descenso fuerte'}</b> (regional, no a nivel de parcela) ${srcChip('ref','GRACE / GRACE-FO · anomalía mensual mascon')}`),
    tr(`Elevation ${r0(s.elev||0)} m ${srcChip('ref','SRTM · regional reference')}; slope ${S.slope} % ${srcChip('input')}`,
       `Elevación ${r0(s.elev||0)} m ${srcChip('ref','SRTM · referencia regional')}; pendiente ${S.slope} % ${srcChip('input')}`)
  ];
  const lst = LIVE.daily ? liveStats() : null;
  if (lst) ev.unshift(tr(`Last 30 days: <b>${r0(lst.rain30)} mm</b> of rain${lst.pct!=null?` (${r0(lst.pct*100)} % of normal)`:''} and root moisture <b>${lst.g.toFixed(2)}</b> <span class="src">${LIVE.mode==='live'?'NASA POWER daily · live':'NASA POWER daily · '+fmtFecha(SNAP.date)}</span>`,
    `Últimos 30 días: <b>${r0(lst.rain30)} mm</b> de lluvia${lst.pct!=null?` (${r0(lst.pct*100)} % de lo normal)`:''} y humedad de raíces <b>${lst.g.toFixed(2)}</b> <span class="src">${LIVE.mode==='live'?'NASA POWER diario · en vivo':'NASA POWER diario · '+fmtFecha(SNAP.date)}</span>`));
  if (uniq.some(id=>CROPS[id].nfix>0)) ev.push(tr(`Nitrogen contributed by legumes per typical published values (40–150 kg N/ha, depends on management) <span class="src">agronomic literature</span>`,
    `Aporte de nitrógeno de las leguminosas según valores típicos publicados (40–150 kg N/ha, depende del manejo) <span class="src">literatura agronómica</span>`));
  const ben=[], dl=(k,lbl,lblEs,inv,unit='')=>{ const x=R.m[k]-B.m[k]; if ((inv?-x:x)>2) ben.push(`${tr(lbl,lblEs)}: ${inv?'':'+'}${r0(x)}${unit} ${tr('vs your current rotation','frente a tu rotación actual')}`); };
  if (!R.isBase){
    dl('water','Fit to rainfall','Ajuste a la lluvia',false,' pts'); dl('soil','Soil health','Salud del suelo',false,' pts'); dl('resil','Stability under extremes','Estabilidad ante extremos',false,' pts');
    dl('econ','Expected income (index)','Ingreso esperado (índice)',false,' pts'); dl('forage','Forage value','Valor forrajero',false,' pts');
    if (B.m.nFert-R.m.nFert>5) ben.push(tr(`Nitrogen fertilizer: ${r0(R.m.nFert-B.m.nFert)} kg N/ha per cycle`,`Fertilizante nitrogenado: ${r0(R.m.nFert-B.m.nFert)} kg N/ha por ciclo`));
    if (B.m.irrigation-R.m.irrigation>10) ben.push(tr(`Applied irrigation: ${r0(R.m.irrigation-B.m.irrigation)} mm per cycle`,`Riego aplicado: ${r0(R.m.irrigation-B.m.irrigation)} mm por ciclo`));
    else if (B.m.deficitRem-R.m.deficitRem>10) ben.push(tr(`Remaining water deficit: ${r0(R.m.deficitRem-B.m.deficitRem)} mm per cycle`,`Déficit de agua restante: ${r0(R.m.deficitRem-B.m.deficitRem)} mm por ciclo`));
    if (B.m.bareMonths-R.m.bareMonths>.4) ben.push(tr(`Unprotected soil: ${(R.m.bareMonths-B.m.bareMonths).toFixed(1)} months per year`,`Suelo sin protección: ${(R.m.bareMonths-B.m.bareMonths).toFixed(1)} meses por año`));
    if (new Set(R.seq.map(x=>CROPS[x].fam)).size > new Set(B.seq.map(x=>CROPS[x].fam)).size) ben.push(tr('More crop families: it breaks the pest and disease cycle','Más familias de cultivos: interrumpe el ciclo de plagas y enfermedades'));
  }
  if (!ben.length) ben.push(R.isBase?tr('It is the practice you already know: no learning costs or new markets.','Es la práctica que ya conoces: sin costos de aprendizaje ni de nuevos mercados.'):tr('Small improvement over your current rotation: check whether the change is worth it.','Mejora pequeña frente a tu rotación actual: revisa si compensa el cambio.'));
  const gaps=[];
  if (!S.live) gaps.push(tr('Climate comes from the nearest reference region; published on the web, the page uses NASA POWER for the exact point.','El clima viene de la región de referencia más cercana; publicada en la web, la página usa NASA POWER del punto exacto.'));
  gaps.push(tr('NASA POWER describes a ~50 km cell; your plot may be drier or wetter than the average.','NASA POWER describe una celda de unos 50 km; tu parcela puede ser más seca o más húmeda que el promedio.'));
  if (s.refKey && s.refDist>150) gaps.push(tr(`Your point is ${r0(s.refDist)} km from the reference region.`,`Tu punto está a ${r0(s.refDist)} km de la región de referencia.`));
  gaps.push(tr('Texture, pH and organic matter are what you entered; a lab soil test would confirm them.','Textura, pH y materia orgánica son los que ingresaste; un análisis de suelo de laboratorio los confirmaría.'));
  gaps.push(tr('Coefficients are generic per crop, not per local variety or sowing date.','Los coeficientes son genéricos por cultivo, no por variedad local ni fecha de siembra.'));
  gaps.push(tr('Prices and costs are not included: confirm there is a buyer for each new crop.','No se incluyen precios ni costos: confirma que hay comprador para cada cultivo nuevo.'));
  gaps.push(tr('Future scenarios are illustrative; NEX-GDDP-CMIP6 projections are not yet integrated.','Los escenarios a futuro son ilustrativos; falta integrar las proyecciones NEX-GDDP-CMIP6.'));
  const risks=rs.filter(r=>r[0]==='w').map(r=>r[1]);
  uniq.filter(id=>!B.seq.includes(id)&&CROPS[id].risk).forEach(id=>risks.push(tr(`<b>${cn(CROPS[id])}</b> is new to you: ${crisk(CROPS[id])}.`,`<b>${cn(CROPS[id])}</b> es nuevo para ti: ${CROPS[id].risk}.`)));
  if (R.cal && R.cal.vulnList.length){ const by={}; R.cal.vulnList.forEach(v=>{(by[v.id]=by[v.id]||new Set()).add(MESL[v.m]);}); Object.entries(by).slice(0,2).forEach(([id,ms])=>risks.push(tr(`<b>${cn(CROPS[id])}</b> falls in a risk period in ${[...ms].slice(0,3).join(', ')}: adjust the sowing date or variety.`,`<b>${cn(CROPS[id])}</b> coincide con una época de riesgo en ${[...ms].slice(0,3).join(', ')}: ajusta la fecha de siembra o la variedad.`))); }
  if (lst && lst.pct!=null && lst.pct<.6) risks.push(tr(`Recent weeks have been dry (${r0(lst.pct*100)} % of normal rain): check the sowing date of the next crop.`,`Las últimas semanas vienen secas (${r0(lst.pct*100)} % de la lluvia normal): revisa la fecha de siembra del próximo cultivo.`));
  if (s.gw>=.5 && S.irr!=='none') risks.push(tr('The local aquifer shows decline: irrigation may not be sustainable long term.','El acuífero de la zona muestra descenso: el riego puede no ser sostenible a largo plazo.'));
  const box=(cls,t,items)=>`<div class="fbox ${cls}"><h4>${t}</h4><ul>${items.map(x=>`<li>${x}</li>`).join('')}</ul></div>`;
  return `<div class="fichahd"><div><span style="color:var(--muted);font-size:12.5px;font-weight:500">${R.name}</span><div class="seq" style="margin-top:4px">${seqHTML(R.seq)}</div></div></div>
    <div class="fgrid">${box('why',tr('Why is it suggested?','¿Por qué se sugiere?'),why.slice(0,5))}${box('ben',tr('Expected benefits','Beneficios esperados'),ben.slice(0,6))}<details class="more fwide" ${keepOpen('fichaEv')}><summary>${tr('Evidence used and what is missing','Evidencia usada y lo que falta')}</summary><div class="fgrid">${box('ev',tr('Evidence and data used','Evidencia y datos usados'),ev)}${box('gap',tr('Information gaps','Vacíos de información'),gaps)}</div></details>${box('risk',tr('Risks to review with your extension agent','Riesgos para revisar con tu extensionista'),risks.slice(0,6).length?risks.slice(0,6):[tr('No specific risks detected; still validate in the field.','No se detectaron riesgos específicos; igual valídalo en campo.')])}</div>`;
}

function renderCompare(){
  const cols=[S.base, ...S.results.slice(0,3)];
  const best=(k,inv)=>{ const v=cols.map(c=>c.m[k]); return inv?Math.min(...v):Math.max(...v); };
  const rows=[
    [`${tr('Score with your priorities','Puntaje con tus prioridades')} ${srcChip('model')}`,'overall',false,v=>r0(v)],
    [`${tr('Remaining water deficit (mm/cycle)','Déficit de agua restante (mm/ciclo)')} ${srcChip('model')}`,'deficitRem',true,v=>r0(v)],
    [`${tr('Estimated water deficit (mm/cycle)','Déficit de agua estimado (mm/ciclo)')} ${srcChip('model')}`,'deficit',true,v=>r0(v)],
    [`${tr('Irrigation applied in scenario (mm/cycle)','Riego aplicado en el escenario (mm/ciclo)')} ${srcChip('model')}`,'irrigation',false,v=>r0(v)],
    [`${tr('Months without soil cover / yr','Meses sin protección del suelo / año')} ${srcChip('model')}`,'bareMonths',true,v=>v.toFixed(1)],
    [`${tr('Stability under extremes (relative index)','Estabilidad ante extremos (índice relativo)')} ${srcChip('model')}`,'resil',false,v=>r0(v)]
  ];
  const more=[
    [`${tr('Expected income (relative index 0–100)','Ingreso esperado (índice relativo 0–100)')} ${srcChip('model')}`,'econ',false,v=>r0(v)],
    [`${tr('Months in vulnerable period / yr','Meses en época vulnerable / año')} ${srcChip('model')}`,'vulnMonths',true,v=>v.toFixed(1)],
    [`${tr('N fertilizer (kg/ha/cycle)','Fertilizante N (kg/ha/ciclo)')} ${srcChip('model')}`,'nFert',true,v=>r0(v)],
    [`${tr('Soil health (relative index)','Salud del suelo (índice relativo)')} ${srcChip('model')}`,'soil',false,v=>r0(v)],
    [`${tr('Forage value (relative index)','Valor forrajero (índice relativo)')} ${srcChip('model')}`,'forage',false,v=>r0(v)]
  ];
  const selName=getSel().name;
  const head=`<thead><tr><th scope="col"><span class="sr">${tr('Metric','Métrica')}</span></th>${cols.map((c,i)=>`<th scope="col" class="${c.name===selName?'on':''}" data-i="${i?i-1:'base'}">${c.isBase?tr('Your current rotation','Tu rotación actual'):c.name}<div class="seqmini">${c.seq.map(id=>`<i style="background:${CROPS[id].c}" title="${cn(CROPS[id])}"></i>`).join('')}</div></th>`).join('')}</tr></thead>`;
  const body=rs=>`<tbody>${rs.map(([l,k,inv,f])=>{ const b=best(k,inv); return `<tr><th scope="row">${l}</th>${cols.map(c=>{ const isB=Math.abs(c.m[k]-b)<.05; return `<td class="${isB?'best':''}">${f(c.m[k])}${isB?`<span class="bestmark" aria-label="${tr('best value','mejor valor')}">✓</span>`:''}</td>`; }).join('')}</tr>`; }).join('')}</tbody>`;
  $('#cmpTable').innerHTML = `<div class="tscroll"><table class="cmpt">${head}${body(rows)}</table></div>
    <details class="more" ${keepOpen('cmpMore')}><summary>${tr('More metrics','Más métricas')}</summary><div class="tscroll"><table class="cmpt">${head.replace(/ data-i="[^"]*"/g,'')}${body(more)}</table></div></details>`;
  $('#cmpTable').querySelectorAll('th[data-i]').forEach(th=>{
    th.tabIndex=0; th.setAttribute('role','button');
    th.onkeydown=e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); th.click(); } };
    th.onclick=()=>{ const i=th.dataset.i; if(i==='base'){ toast(tr('That is your current rotation: pick an option to compare it','Esa es tu rotación actual: elige una opción para compararla')); return; } S.sel=+i; renderDependent(); }; });
  $('#ficha').innerHTML = strategyCard(getSel());
}

function renderCurrent(){
  const cur=curRot(), opts=Object.keys(CROPS).map(k=>`<option value="${k}">${cn(CROPS[k])}</option>`).join('');
  $('#currot').innerHTML = cur.map((id,i)=>`<select data-i="${i}" aria-label="${tr('Cycle','Ciclo')} ${i+1} ${tr('of your current rotation','de tu rotación actual')}">${opts}</select>${i<cur.length-1?'<span class="arrow">→</span>':''}`).join('');
  $('#currot').querySelectorAll('select').forEach((el,i)=>{ el.value=cur[i]; el.onchange=()=>{ S.current=[...$('#currot').querySelectorAll('select')].map(x=>x.value); recompute(); }; });
}
function renderMkt(){
  $('#mkt').innerHTML = Object.keys(CROPS).filter(k=>k!=='barbecho').map(k=>`<button data-k="${k}" class="${S.excluded.has(k)?'':'on'}" aria-pressed="${!S.excluded.has(k)}"><i style="background:${CROPS[k].c}"></i>${cn(CROPS[k]).split(' (')[0]}</button>`).join('');
  $('#mkt').querySelectorAll('button').forEach(b=>b.onclick=()=>{ const k=b.dataset.k; S.excluded.has(k)?S.excluded.delete(k):S.excluded.add(k); recompute(); });
}
