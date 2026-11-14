/* AGRI-ORBIT · js/views/dashboard.js
   Vistas: barra de estado, clima, KPIs, ranking y constructor de rotación. */

/* =========================================================
   RENDER
   ========================================================= */
function renderStrip(){
  const s=S.site, e=envFrom();
  $('#strip').innerHTML = `
    <span><span class="live ${LIVE.mode?'':'off'}"></span> Clima: <b>${dataLabel()}</b></span>
    <span>Sitio: <b>${s.name}</b></span>
    <span>Coordenadas: <b>${s.lat.toFixed(2)}, ${s.lon.toFixed(2)}</b></span>
    <span>Escenario: <b>${scen().lbl}</b></span>
    <span class="chip"><span class="k">T temporada</span> ${e.Tg.toFixed(1)} °C</span>
    <span class="chip"><span class="k">Lluvia</span> ${r0(e.P)} mm</span>
    <span class="chip"><span class="k">Humedad radicular</span> ${s.GWET.toFixed(2)}</span>`;
}

function renderClimate(){
  const s=S.site;
  $('#clim').innerHTML = [
    ['T temporada', s.Tg.toFixed(1)+' °C','T2M'],
    ['Máx. mes cálido', s.Tmax.toFixed(1)+' °C','T2M_MAX'],
    ['Lluvia anual', r0(s.P)+' mm','PRECTOTCORR'],
    ['Humedad radicular', s.GWET.toFixed(2),'GWETROOT'],
    ['Radiación', s.SW.toFixed(1)+' kWh/m²','ALLSKY_SFC_SW_DWN'],
    ['Variab. lluvia', pct(s.Pcv),'CV interanual']
  ].map(([k,v,src])=>`<div><div class="k">${k}</div><div class="v">${v}</div><div class="s">${src}</div></div>`).join('');
  $('#climNote').innerHTML = LIVE.mode==='live' ? `<span class="ok">● NASA POWER en vivo</span> para ${s.lat.toFixed(2)}, ${s.lon.toFixed(2)}.`
    : LIVE.mode==='snap' ? `<span class="ok">◆ Datos reales de NASA POWER</span> descargados el ${fmtFecha(SNAP.date)}${s.refKey?` para ${SITES[s.refKey].region} (a ${r0(s.refDist)} km de tu punto)`:''}. Publicada en la web, la página los actualiza en vivo.`
    : '<span class="warn">● Consultando a la NASA…</span>';
}

function renderKPIs(){
  const R=getSel(), B=S.base;
  const d=(a,b,inv)=>{const x=a-b; const good=inv? x<0 : x>0; return `<span class="${Math.abs(x)<1?'':good?'ok':'bad'}">${x>0?'+':''}${r0(x)} vs actual</span>`;};
  $('#kpis').innerHTML = `
    <div class="kpi"><div class="k">Riego necesario</div><div class="v" style="color:var(--cyan)">${r0(R.m.irrigation)} mm</div><div class="s">por ciclo · ${d(R.m.irrigation,B.m.irrigation,true)}</div></div>
    <div class="kpi"><div class="k">Suelo expuesto</div><div class="v" style="color:var(--amber)">${r0(R.m.bare)} %</div><div class="s">${d(R.m.bare,B.m.bare,true)}</div></div>
    <div class="kpi"><div class="k">N biológico</div><div class="v" style="color:var(--green)">${r0(R.m.nFix)} kg</div><div class="s">N/ha/ciclo fijado</div></div>
    <div class="kpi"><div class="k">Fertilizante N</div><div class="v">${r0(R.m.nFert)} kg</div><div class="s">N/ha/ciclo · ${d(R.m.nFert,B.m.nFert,true)}</div></div>`;
}

function rotRow(R, idx){
  const sel = (S.sel===idx);
  const bar=(lbl,v,col)=>`<span>${lbl}</span><span class="bar"><span style="width:${v}%;background:${col}"></span></span><span>${r0(v)}</span>`;
  return `<button class="rot ${sel?'sel':''} ${R.isBase?'base':''}" data-i="${idx}">
    <div class="n">${R.isBase?'HOY':R.isCustom?'★':(idx+1)}</div>
    <div>
      <div class="seq">${seqHTML(R.seq)}${idx===0?'<span class="topbadge">MEJOR AJUSTE</span>':''}</div>
      <div class="meta">${R.isBase?'Tu rotación actual · ':R.isCustom?'Tu rotación · ':''}Puntaje global <b style="color:var(--green)">${r0(R.m.overall)}</b> · ${R.m.cash} ciclos comerciales · diversidad ${pct(R.m.div)}</div>
    </div>
    <div class="bars">
      ${bar('Econ.',R.m.econ,'var(--amber)')}${bar('Agua',R.m.water,'var(--cyan)')}${bar('Suelo',R.m.soil,'var(--green)')}${bar('Estab.',R.m.resil,'var(--violet)')}
    </div></button>`;
}

function renderRanking(){
  $('#nEval').textContent = `${S.nEval.toLocaleString('es')} rotaciones evaluadas`;
  let h = S.results.map((r,i)=>rotRow(r,i)).join('');
  if (S.customRes) h += rotRow(S.customRes,'custom');
  h += rotRow(S.base,'base');
  $('#rank').innerHTML = h;
  $('#rank').querySelectorAll('.rot').forEach(b=>b.onclick=()=>{
    const i=b.dataset.i;
    if (i==='base'){ toast('Esa es tu rotación actual: sirve de base para comparar.'); S.cmp='base'; renderDependent(); return; }
    S.sel = i==='custom' ? 'custom' : +i; renderDependent();
  });
}

function renderBuilder(){
  const opts = Object.keys(CROPS).map(k=>`<option value="${k}">${CROPS[k].n}</option>`).join('');
  const cur = S.custom || getSel().seq;
  let h='';
  for (let i=0;i<S.L;i++){ h += `<select data-i="${i}" aria-label="Ciclo ${i+1}">${opts}</select>${i<S.L-1?'<span class="arrow">→</span>':''}`; }
  h += `<button class="btn solid" id="addCustom">Evaluar</button>`;
  if (S.custom) h += `<button class="btn" id="clrCustom">Quitar</button>`;
  $('#builder').innerHTML = h;
  $('#builder').querySelectorAll('select').forEach((s,i)=>s.value = cur[i] || 'maiz');
  $('#addCustom').onclick = ()=>{
    S.custom = [...$('#builder').querySelectorAll('select')].map(s=>s.value);
    runEngine(); S.sel='custom'; renderAll(); toast('Tu rotación se añadió al ranking');
  };
  if ($('#clrCustom')) $('#clrCustom').onclick=()=>{ S.custom=null; S.customRes=null; if(S.sel==='custom')S.sel=0; if(S.cmp==='custom')S.cmp='base'; renderAll(); };
}

function reasons(R){
  const e=S.ctx.env, H=S.ctx.H, B=S.base, out=[];
  const L=R.seq.length;
  for (let i=0;i<L;i++){
    const c=CROPS[R.seq[i]], p=CROPS[R.seq[(i-1+L)%L]], st=R.stages[i];
    if (p.nfix>=40 && c.ndem>=80) out.push(['g',`<b>${p.n}</b> fija nitrógeno (~${p.nfix} kg N/ha) que aprovecha el <b>${c.n}</b> siguiente: menos fertilizante y +10 % de rendimiento esperado.`]);
    if (p.fam===c.fam && p.id!==c.id && c.id!=='barbecho') out.push(['w',`<b>${p.n}</b> y <b>${c.n}</b> son de la misma familia (${c.fam}): comparten plagas; vigila el manejo sanitario.`]);
    if (c.cover) out.push([e.P<750?'w':'g', e.P<750 ? `<b>${c.n}</b> protege el suelo, pero en un sitio seco compite por agua con el cultivo siguiente: siémbrala solo si hubo buena lluvia.` : `<b>${c.n}</b> cubre el suelo (${pct(c.cov)} de protección) y aporta materia orgánica para el ciclo siguiente.`]);
    if (st.sc.deficitRain > 60 && c.need>0) out.push(['w',`<b>${c.n}</b> necesita ~${c.need} mm por ciclo y la lluvia aporta ~${r0(st.sc.W)} mm: déficit de ${r0(st.sc.deficitRain)} mm${S.irr==='none'?' (sin riego, el rendimiento se reduce)':' que cubre el riego'}.`]);
    if (H.heat.v > .35 && c.ht >= .7 && !c.cover) out.push(['g',`<b>${c.n}</b> tolera el calor: útil con máximas de ${e.Tmax.toFixed(1)} °C en el escenario elegido.`]);
    if (c.id==='barbecho') out.push(['w',`El barbecho deja el suelo expuesto${e.P<750?'; en secano seco ayuda a acumular humedad, pero aumenta la erosión':''}.`]);
  }
  const uniq=[]; const seen=new Set(); for (const r of out){ if(!seen.has(r[1])){seen.add(r[1]);uniq.push(r);} }
  if (!R.isBase){
    const dd=(k)=>r0(R.m[k]-B.m[k]);
    uniq.unshift(['',`Frente a tu rotación actual (${seqTxt(B.seq)}): agua ${dd('water')>=0?'+':''}${dd('water')}, suelo ${dd('soil')>=0?'+':''}${dd('soil')}, estabilidad ${dd('resil')>=0?'+':''}${dd('resil')} y economía ${dd('econ')>=0?'+':''}${dd('econ')} puntos.`]);
  }
  if (S.mc && !R.isBase) uniq.push(['',`En ${pct(S.mc.pWin)} de las 1 000 simulaciones climáticas termina con más ingreso acumulado que la rotación comparada.`]);
  return uniq.slice(0,8);
}

function renderWhy(){
  const R=getSel();
  $('#why').innerHTML = `<li><b>${R.name}:</b> ${seqTxt(R.seq)}</li>` + reasons(R).map(([c,t])=>`<li class="${c}">${t}</li>`).join('');
}
