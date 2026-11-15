/* AGRI-ORBIT · js/views/case.js
   Vista del caso de demostración: Corredor Seco de Chiquimula, Guatemala.
   Compara la rotación base editable con dos alternativas bajo el mismo
   escenario, y permite alternar entre dos prioridades del agricultor. */

function caseBaseEditor(){
  const cur=curRot(), opts=Object.keys(CROPS).map(k=>`<option value="${k}">${cn(CROPS[k])}</option>`).join('');
  return `<div class="casebase">
    <div>
      <b>${tr('Base rotation (editable)','Rotación base (editable)')}</b>
      <span class="case-ref">${tr('prototype reference','referencia del prototipo')}</span>
      <div class="sub">${tr(CASE.base.noteEn, CASE.base.note)}</div>
    </div>
    <div class="currot" id="caseCur">${cur.map((id,i)=>`<select data-i="${i}" aria-label="${tr('Cycle','Ciclo')} ${i+1} ${tr('of the base rotation','de la rotación base')}">${opts}</select>${i<cur.length-1?'<span class="arrow">→</span>':''}`).join('')}</div>
  </div>`;
}

function caseTable(){
  const c=S.caseRes, cols=[{R:c.base,hdr:tr('Base','Base'),sub:tr('maize 1st + 2nd season','maíz primera y postrera')},
    ...c.alts.map((a,i)=>({R:a.R,hdr:tr(a.titleEn,a.title),sub:tr('alternative','alternativa')+' '+(i+1)}))];
  const best=(k,inv)=>{ const v=cols.map(x=>x.R.m[k]); return inv?Math.min(...v):Math.max(...v); };
  const match = CASE_PRIO[S.casePrio] && ['econ','soil','water','risk','forage'].every(k=>S.prio[k]===CASE_PRIO[S.casePrio].prio[k]);
  const prioLbl = match ? tr(CASE_PRIO[S.casePrio].lblEn,CASE_PRIO[S.casePrio].lbl) : tr('Custom','Personalizada');
  const rows=[
    [`${tr('Score with priority','Puntaje con prioridad')} “${prioLbl}” ${srcChip('model')}`, 'overall', false, v=>r0(v)],
    [`${tr('Remaining water deficit (mm/cycle)','Déficit de agua restante (mm/ciclo)')} ${srcChip('model')}`, 'deficitRem', true, v=>r0(v), 'key'],
    [`${tr('Bare-soil months (per year)','Meses de suelo descubierto (por año)')} ${srcChip('model')}`, 'bareMonths', true, v=>v.toFixed(1), 'key'],
    [`${tr('Simulated stability (index 0–100)','Estabilidad simulada (índice 0–100)')} ${srcChip('model')}`, 'resil', false, v=>r0(v), 'key'],
    [`${tr('Estimated water deficit (mm/cycle)','Déficit de agua estimado (mm/ciclo)')} ${srcChip('model')}`, 'deficit', true, v=>r0(v), 'sub'],
    [`${tr('Irrigation applied in scenario (mm/cycle)','Riego aplicado en el escenario (mm/ciclo)')} ${srcChip('model')}`, 'irrigation', false, v=>r0(v), 'sub'],
    [`${tr('N fertilizer (kg/ha/cycle)','Fertilizante N (kg/ha/ciclo)')} ${srcChip('model')}`, 'nFert', true, v=>r0(v), 'sub']
  ];
  return `<div style="overflow-x:auto"><table class="cmpt caset"><thead><tr><th></th>${cols.map(x=>`<th>${x.hdr}<div class="seqmini">${x.R.seq.map(id=>`<i style="background:${CROPS[id].c}" title="${cn(CROPS[id])}"></i>`).join('')}</div><div class="thsub">${x.sub}</div></th>`).join('')}</tr></thead>
    <tbody>${rows.map(([l,k,inv,f,cls])=>{ const b=best(k,inv); return `<tr class="${cls||'score'}"><th scope="row">${l}</th>${cols.map(x=>{ const isB=Math.abs(x.R.m[k]-b)<.05; return `<td class="${isB?'best':''}">${f(x.R.m[k])}${isB?`<span class="bestmark" aria-label="${tr('best value','mejor valor')}">✓</span>`:''}</td>`; }).join('')}</tr>`; }).join('')}</tbody></table></div>`;
}

function caseAlts(){
  const c=S.caseRes, B=c.base;
  const dd=(R,k)=>r0(R.m[k]-B.m[k]);
  return c.alts.map((a,i)=>{
    const R=a.R;
    return `<div class="casealt">
      <div class="cah"><b>${tr('Alternative','Alternativa')} ${i+1} · ${tr(a.titleEn,a.title)}</b><div class="seq">${seqHTML(a.seq)}</div></div>
      <div class="cag ben"><h5>${tr('Main advantage','Principal ventaja')}</h5><p>${tr(a.benefitEn,a.benefit)} <span class="mono">(${tr('vs base','vs base')}: ${tr('soil','suelo')} ${dd(R,'soil')>=0?'+':''}${dd(R,'soil')}, ${tr('stab.','estab.')} ${dd(R,'resil')>=0?'+':''}${dd(R,'resil')})</span></p></div>
      <div class="cag sac"><h5>${tr('Cost or trade-off','Costo o sacrificio')}</h5><p>${tr(a.sacrificeEn,a.sacrifice)} <span class="mono">(${tr('income idx','índ. ingreso')} ${dd(R,'econ')>=0?'+':''}${dd(R,'econ')})</span></p></div>
      <details class="cadet" ${keepOpen('caseAlt'+i)}><summary>${tr('Assumptions and data to validate','Supuestos y datos por validar')}</summary>
        <div class="cag"><h5>${tr('Assumptions','Supuestos')}</h5><p>${tr(a.assumeEn,a.assume)}</p></div>
        <div class="cag mis"><h5>${tr('Data still to validate','Dato que falta validar')}</h5><p>${tr(a.missingEn,a.missing)}</p></div>
      </details>
    </div>`;
  }).join('');
}

function casePrioCtl(){
  const match = k => S.casePrio===k && ['econ','soil','water','risk','forage'].every(q=>S.prio[q]===CASE_PRIO[k].prio[q]);
  const opts=Object.keys(CASE_PRIO).map(k=>`<button type="button" data-k="${k}" class="${match(k)?'on':''}" aria-pressed="${match(k)}">${tr(CASE_PRIO[k].lblEn,CASE_PRIO[k].lbl)}</button>`).join('');
  // puntajes bajo cada prioridad, para explicar el cambio aunque el orden se mantenga
  const rots=[{R:S.caseRes.base,lbl:tr('Base','Base')},...S.caseRes.alts.map((a,i)=>({R:a.R,lbl:tr('Alt. ','Alt. ')+(i+1)}))];
  const sets=Object.keys(CASE_PRIO).map(k=>({lbl:tr(CASE_PRIO[k].lblEn,CASE_PRIO[k].lbl),vals:rots.map(x=>r0(overallWith(x.R.m,CASE_PRIO[k].prio)))}));
  const active=Object.keys(CASE_PRIO).find(match);
  const grid=`<table class="prioscores"><thead><tr><th scope="col">${tr('Priority','Prioridad')}</th>${rots.map(x=>`<th scope="col">${x.lbl}</th>`).join('')}</tr></thead><tbody>${Object.keys(CASE_PRIO).map((k,i)=>`<tr class="${k===active?'on':''}"><th scope="row">${sets[i].lbl}${k===active?` <span class="activetag">${tr('active','activa')}</span>`:''}</th>${sets[i].vals.map(v=>`<td>${v}</td>`).join('')}</tr>`).join('')}${active?'':`<tr class="on"><th scope="row">${tr('Current weights','Pesos actuales')} <span class="activetag">${tr('active','activa')}</span></th>${rots.map(x=>`<td>${r0(overallWith(x.R.m,S.prio))}</td>`).join('')}</tr>`}</tbody></table>`;
  return `<div class="caseprio">
    <div class="cp-hd"><div><b>${tr('Farmer priority','Prioridad del agricultor')}</b><div class="sub">${tr('Same rotations and scenario; only the score weights change.','Mismas rotaciones y escenario; solo cambian los pesos del puntaje.')}</div></div>
    <div class="seg" id="casePrio" role="group" aria-label="${tr('Farmer priority','Prioridad del agricultor')}">${opts}</div></div>
    ${grid}
    <div class="note">${tr('The order can hold while the gap between options changes.','El orden puede mantenerse aunque cambie la distancia entre opciones.')}</div>
  </div>`;
}

function caseImerg(){
  const im=LIVE.imerg;
  if (im) return `<div class="caseimerg">${srcChip('api',im.src)}
    <b>${tr('Sowing-window check','Chequeo de la ventana de siembra')}:</b>
    ${tr(`in ${im.window} (${im.slot}) IMERG daily rainfall accumulated`,`en ${im.window} (${im.slot}) la lluvia diaria IMERG acumuló`)} <b>${r0(im.mm)} mm</b>${im.pct!=null?` = <b>${r0(im.pct*100)} %</b> ${tr('of the same climatological window','de la misma ventana climatológica')} (${r0(im.norm)} mm)`:''}.
    <span class="sub">${tr(`UTC · ${im.days} days · ${im.miss} missing days (fill values, not zeros) · last data ${im.last||'—'}`,`UTC · ${im.days} días · ${im.miss} días faltantes (relleno, no ceros) · último dato ${im.last||'—'}`)}</span></div>`;
  const w = (()=>{ try{ return imergWindowMonths(); }catch(e){ return null; } })();
  return `<div class="caseimerg dim">${srcChip('ref')}
    <b>${tr('Sowing-window check','Chequeo de la ventana de siembra')}:</b>
    ${LIVE.mode==='snap'||LIVE.blocked
      ? tr('the saved snapshot does not include IMERG daily; with a live connection AGRI-ORBIT queries GPM IMERG daily (IMERG_PRECTOT) for the window and compares it with the same historical window.',
           'la instantánea guardada no incluye IMERG diario; con conexión, AGRI-ORBIT consulta GPM IMERG diario (IMERG_PRECTOT) de la ventana y lo compara con la misma ventana histórica.')
      : tr('querying GPM IMERG daily (IMERG_PRECTOT) via NASA POWER…','consultando GPM IMERG diario (IMERG_PRECTOT) vía NASA POWER…')}${w?` ${tr('Window:','Ventana:')} ${w.lbl}.`:''}</div>`;
}

function renderCase(){
  const el=$('#caseBody'); if (!el) return;
  if (!S.caseRes){ el.innerHTML=`<div class="note">${tr('Computing…','Calculando…')}</div>`; return; }
  const s=S.site, offCase = s.key!==CASE.siteKey && s.refKey!==CASE.siteKey;
  $('#caseTag').textContent = `${siteName(s)} · ${scen().lbl}`;
  el.innerHTML = `
    ${offCase?`<div class="note warn" style="margin-top:0">⚠ ${tr('You are viewing another site. The case is meant for Chiquimula:','Estás viendo otro sitio. El caso está pensado para Chiquimula:')} <a href="#s-caso" id="caseReload">${tr('load the case','cargar el caso')}</a>.</div>`:''}
    ${caseBaseEditor()}
    ${casePrioCtl()}
    ${caseTable()}
    <div class="casealts">${caseAlts()}</div>
    ${caseImerg()}
    <div class="note">${tr('All figures are model estimates under the same scenario; indices are relative (0–100), not yield forecasts. “Irrigation applied” is capped by the irrigation you marked as available — it is 0 mm in rainfed even when a deficit remains.','Todas las cifras son estimaciones del modelo bajo el mismo escenario; los índices son relativos (0–100), no pronósticos de rendimiento. «Riego aplicado» se limita al riego que marcaste como disponible: en secano es 0 mm aunque quede déficit.')}</div>`;
  // base editable
  $('#caseCur').querySelectorAll('select').forEach((el,i)=>{ el.value=curRot()[i]; el.onchange=()=>{ S.current=[...$('#caseCur').querySelectorAll('select')].map(x=>x.value); recompute(); }; });
  // prioridad del caso
  $('#casePrio').querySelectorAll('button').forEach(b=>b.onclick=()=>{
    S.casePrio=b.dataset.k; S.prio={...CASE_PRIO[S.casePrio].prio};
    ['econ','soil','water','risk','forage'].forEach(k=>{ const s2=$('#p-'+k); if(s2) s2.value=S.prio[k]; const v=$('#v-'+k); if(v) v.textContent=S.prio[k]; });
    recompute();
  });
  const rl=$('#caseReload'); if (rl) rl.onclick=e=>{ e.preventDefault(); runChiquimula(); };
}
