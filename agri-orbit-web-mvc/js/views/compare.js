/* AGRI-ORBIT · js/views/compare.js
   Vistas: fichas por estrategia, comparación, rotación actual y mercado. */

/* =========================================================
   FICHA POR ESTRATEGIA Y COMPARACIÓN DE AL MENOS TRES
   ========================================================= */
function strategyCard(R){
  const B=S.base, e=S.ctx.env, s=S.site, sc=scen(), uniq=[...new Set(R.seq)];
  const rs=reasons(R);
  const why=rs.filter(r=>r[0]!=='w').map(r=>r[1]);
  uniq.forEach(id=>{ const c=CROPS[id]; if (c.root==='profunda' && id!=='barbecho') why.push(`<b>${c.n}</b> tiene raíz profunda: afloja capas compactadas, mejora la infiltración y recupera nutrientes de abajo.`); });
  const ev=[
    `Lluvia ≈ <b>${r0(e.P)} mm/año</b>, con ${pct(s.Pcv*sc.cv)} de variación entre años <span class="src">${S.live?'NASA POWER · PRECTOTCORR':'referencia regional · contrastar con GPM IMERG / POWER'}</span>`,
    `Máxima del mes más cálido ≈ <b>${e.Tmax.toFixed(1)} °C</b> en el escenario elegido <span class="src">NASA POWER · T2M_MAX</span>`,
    `Humedad de la zona de raíces: <b>${s.GWET.toFixed(2)}</b> (0 = seco, 1 = saturado) <span class="src">SMAP L4 · GWETROOT</span>`,
    `<b>${S.cal.dryMonths} meses</b> en que la lluvia no alcanza la mitad de la evapotranspiración <span class="src">balance hídrico</span>`,
    `Agua subterránea: <b>${s.gw>=.5?'descenso marcado':s.gw>=.25?'descenso moderado':'sin descenso fuerte'}</b> <span class="src">GRACE / GRACE-FO · referencia regional</span>`,
    `Elevación ${r0(s.elev||0)} m; pendiente ${S.slope} % (dato tuyo) <span class="src">SRTM</span>`
  ];
  const lst = LIVE.daily ? liveStats() : null;
  if (lst) ev.unshift(`Últimos 30 días: <b>${r0(lst.rain30)} mm</b> de lluvia${lst.pct!=null?` (${r0(lst.pct*100)} % de lo normal)`:''} y humedad de raíces <b>${lst.g.toFixed(2)}</b> <span class="src">${LIVE.mode==='live'?'NASA POWER diario · en vivo':'NASA POWER diario · '+fmtFecha(SNAP.date)}</span>`);
  if (uniq.some(id=>CROPS[id].nfix>0)) ev.push(`Aporte de nitrógeno de las leguminosas según valores típicos publicados (40–150 kg N/ha, depende del manejo) <span class="src">literatura agronómica</span>`);
  const ben=[], dl=(k,lbl,inv,unit='')=>{ const x=R.m[k]-B.m[k]; if ((inv?-x:x)>2) ben.push(`${lbl}: ${inv?'':'+'}${r0(inv?x:x)}${unit} frente a tu rotación actual`); };
  if (!R.isBase){
    dl('water','Ajuste a la lluvia',false,' pts'); dl('soil','Salud del suelo',false,' pts'); dl('resil','Estabilidad ante extremos',false,' pts');
    dl('econ','Ingreso esperado (índice)',false,' pts'); dl('forage','Valor forrajero',false,' pts');
    if (B.m.nFert-R.m.nFert>5) ben.push(`Fertilizante nitrogenado: ${r0(R.m.nFert-B.m.nFert)} kg N/ha por ciclo`);
    if (B.m.irrigation-R.m.irrigation>10) ben.push(`Riego necesario: ${r0(R.m.irrigation-B.m.irrigation)} mm por ciclo`);
    if (B.m.bareMonths-R.m.bareMonths>.4) ben.push(`Suelo sin protección: ${(R.m.bareMonths-B.m.bareMonths).toFixed(1)} meses por año`);
    if (new Set(R.seq.map(x=>CROPS[x].fam)).size > new Set(B.seq.map(x=>CROPS[x].fam)).size) ben.push('Más familias de cultivos: interrumpe el ciclo de plagas y enfermedades');
  }
  if (!ben.length) ben.push(R.isBase?'Es la práctica que ya conoces: sin costos de aprendizaje ni de nuevos mercados.':'Mejora pequeña frente a tu rotación actual: revisa si compensa el cambio.');
  const gaps=[];
  if (!S.live) gaps.push('El clima viene de la región de referencia más cercana; publicada en la web, la página usa NASA POWER del punto exacto.');
  gaps.push('NASA POWER describe una celda de unos 50 km; tu parcela puede ser más seca o más húmeda que el promedio.');
  if (s.refKey && s.refDist>150) gaps.push(`Tu punto está a ${r0(s.refDist)} km de la región de referencia.`);
  gaps.push('Textura, pH y materia orgánica son los que ingresaste; un análisis de suelo de laboratorio los confirmaría.');
  gaps.push('Los coeficientes son genéricos por cultivo, no por variedad local ni fecha de siembra.');
  gaps.push('No se incluyen precios ni costos: confirma que hay comprador para cada cultivo nuevo.');
  gaps.push('Los escenarios a futuro son ilustrativos; falta integrar las proyecciones NEX-GDDP-CMIP6.');
  const risks=rs.filter(r=>r[0]==='w').map(r=>r[1]);
  uniq.filter(id=>!B.seq.includes(id)&&CROPS[id].risk).forEach(id=>risks.push(`<b>${CROPS[id].n}</b> es nuevo para ti: ${CROPS[id].risk}.`));
  if (R.cal && R.cal.vulnList.length){ const by={}; R.cal.vulnList.forEach(v=>{(by[v.id]=by[v.id]||new Set()).add(MESL[v.m]);}); Object.entries(by).slice(0,2).forEach(([id,ms])=>risks.push(`<b>${CROPS[id].n}</b> coincide con una época de riesgo en ${[...ms].slice(0,3).join(', ')}: ajusta la fecha de siembra o la variedad.`)); }
  if (lst && lst.pct!=null && lst.pct<.6) risks.push(`Las últimas semanas vienen secas (${r0(lst.pct*100)} % de la lluvia normal): revisa la fecha de siembra del próximo cultivo.`);
  if (s.gw>=.5 && S.irr!=='none') risks.push('El acuífero de la zona muestra descenso: el riego puede no ser sostenible a largo plazo.');
  const box=(cls,t,items)=>`<div class="fbox ${cls}"><h4>${t}</h4><ul>${items.map(x=>`<li>${x}</li>`).join('')}</ul></div>`;
  return `<div class="fichahd"><div><span style="color:var(--muted);font-size:12.5px;font-weight:500">${R.name}</span><div class="seq" style="margin-top:4px">${seqHTML(R.seq)}</div></div></div>
    <div class="fgrid">${box('why','¿Por qué se sugiere?',why.slice(0,5))}${box('ev','Evidencia y datos usados',ev)}${box('ben','Beneficios esperados',ben.slice(0,6))}${box('gap','Vacíos de información',gaps)}${box('risk','Riesgos para revisar con tu extensionista',risks.slice(0,6).length?risks.slice(0,6):['No se detectaron riesgos específicos; igual valídalo en campo.'])}</div>`;
}

function renderCompare(){
  const cols=[S.base, ...S.results.slice(0,3)];
  const best=(k,inv)=>{ const v=cols.map(c=>c.m[k]); return inv?Math.min(...v):Math.max(...v); };
  const rows=[
    ['Puntaje con tus prioridades','overall',false,v=>r0(v)],
    ['Ingreso esperado (índice)','econ',false,v=>r0(v)],
    ['Riego necesario (mm/ciclo)','irrigation',true,v=>r0(v)],
    ['Meses sin protección del suelo / año','bareMonths',true,v=>v.toFixed(1)],
    ['Meses en época vulnerable / año','vulnMonths',true,v=>v.toFixed(1)],
    ['Fertilizante N (kg/ha/ciclo)','nFert',true,v=>r0(v)],
    ['Salud del suelo','soil',false,v=>r0(v)],
    ['Estabilidad ante extremos','resil',false,v=>r0(v)],
    ['Valor forrajero','forage',false,v=>r0(v)]
  ];
  const selName=getSel().name;
  $('#cmpTable').innerHTML = `<table class="cmpt"><thead><tr><th></th>${cols.map((c,i)=>`<th class="${c.name===selName?'on':''}" data-i="${i?i-1:'base'}">${c.isBase?'Tu rotación actual':c.name}<div class="seqmini">${c.seq.map(id=>`<i style="background:${CROPS[id].c}" title="${CROPS[id].n}"></i>`).join('')}</div></th>`).join('')}</tr></thead>
    <tbody>${rows.map(([l,k,inv,f])=>{ const b=best(k,inv); return `<tr><td>${l}</td>${cols.map(c=>`<td class="${Math.abs(c.m[k]-b)<.05?'best':''}">${f(c.m[k])}</td>`).join('')}</tr>`; }).join('')}</tbody></table>`;
  $('#cmpTable').querySelectorAll('th[data-i]').forEach(th=>th.onclick=()=>{ const i=th.dataset.i; if(i==='base'){ toast('Esa es tu rotación actual: elige una opción para compararla'); return; } S.sel=+i; renderDependent(); });
  $('#ficha').innerHTML = strategyCard(getSel());
}

function renderCurrent(){
  const cur=curRot(), opts=Object.keys(CROPS).map(k=>`<option value="${k}">${CROPS[k].n}</option>`).join('');
  $('#currot').innerHTML = cur.map((id,i)=>`<select data-i="${i}" aria-label="Ciclo ${i+1} de tu rotación actual">${opts}</select>${i<cur.length-1?'<span class="arrow">→</span>':''}`).join('');
  $('#currot').querySelectorAll('select').forEach((el,i)=>{ el.value=cur[i]; el.onchange=()=>{ S.current=[...$('#currot').querySelectorAll('select')].map(x=>x.value); recompute(); }; });
}
function renderMkt(){
  $('#mkt').innerHTML = Object.keys(CROPS).filter(k=>k!=='barbecho').map(k=>`<button data-k="${k}" class="${S.excluded.has(k)?'':'on'}" aria-pressed="${!S.excluded.has(k)}"><i style="background:${CROPS[k].c}"></i>${CROPS[k].n.split(' (')[0]}</button>`).join('');
  $('#mkt').querySelectorAll('button').forEach(b=>b.onclick=()=>{ const k=b.dataset.k; S.excluded.has(k)?S.excluded.delete(k):S.excluded.add(k); recompute(); });
}
