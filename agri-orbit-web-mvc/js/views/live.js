/* AGRI-ORBIT · js/views/live.js
   Vistas: series diarias, imágenes NASA y ficha del lugar. */

function renderSeries(){
  const ds=LIVE.daily||[]; if (!ds.length){ $('#series').innerHTML=''; return; }
  const W=760, rowH=56, gap=16, ml=118, mr=48, top=8, n=ds.length, cw=(W-ml-mr)/n, X=i=>ml+i*cw;
  const s=S.site, okd=ds.filter(x=>x.ok);
  const maxP=Math.max(10,...okd.map(x=>x.P))*1.1, minT=Math.min(...okd.map(x=>x.Tx))-2, maxT=Math.max(36,...okd.map(x=>x.Tx))+1;
  const rows=[{y:top},{y:top+rowH+gap},{y:top+2*(rowH+gap)}], H=top+3*(rowH+gap)+8;
  let h='';
  const lbl=(r,t,sub,val,col)=>`<text x="0" y="${r.y+18}" font-size="11" fill="${col}" font-weight="700">${t}</text><text x="0" y="${r.y+32}" font-size="9" fill="#64748b">${sub}</text><text x="${W-mr+6}" y="${r.y+rowH/2+4}" font-size="11" fill="${col}" font-weight="700">${val}</text>`;
  rows.forEach(r=>{ h+=`<rect x="${ml}" y="${r.y}" width="${W-ml-mr}" height="${rowH}" fill="rgba(255,255,255,.02)" stroke="#1f2a3d"/>`; });
  // lluvia
  const r1=rows[0];
  ds.forEach((x,i)=>{ if(!x.ok){ h+=`<rect x="${X(i)}" y="${r1.y}" width="${cw}" height="${rowH*3+gap*2}" fill="rgba(107,122,144,.12)"/>`; return; } const bh=(x.P/maxP)*rowH; h+=`<rect x="${X(i)+cw*.15}" y="${r1.y+rowH-bh}" width="${cw*.7}" height="${bh}" fill="#2dd4bf"><title>${fmtDia(x.d)}: ${x.P.toFixed(1)} mm</title></rect>`; });
  const last=okd[okd.length-1];
  h+=lbl(r1,tr('Daily rain','Lluvia diaria'),'mm · NASA POWER',`${last.P.toFixed(1)}`,'#2dd4bf');
  // temperatura
  const r2=rows[1], YT=v=>r2.y+rowH-(v-minT)/(maxT-minT)*rowH;
  if (34>minT && 34<maxT) h+=`<line x1="${ml}" x2="${W-mr}" y1="${YT(34)}" y2="${YT(34)}" stroke="#f87171" stroke-dasharray="3 3" opacity=".7"/><text x="${ml+4}" y="${YT(34)-3}" font-size="8.5" fill="#f87171">${tr('34 °C heat stress','34 °C estrés por calor')}</text>`;
  h+=`<polyline points="${ds.map((x,i)=>x.ok?`${X(i)+cw/2},${YT(x.Tx)}`:'').filter(Boolean).join(' ')}" fill="none" stroke="#fbbf24" stroke-width="1.8"/>`;
  h+=lbl(r2,tr('Daily high','Máxima diaria'),'°C · NASA POWER',`${last.Tx.toFixed(1)}°`,'#fbbf24');
  // humedad raíz
  const r3=rows[2], YG=v=>r3.y+rowH-v*rowH;
  if (s.mG){ const pts=ds.map((x,i)=>{ const m=+x.d.slice(5,7)-1; return `${X(i)+cw/2},${YG(s.mG[m])}`; }); h+=`<polyline points="${pts.join(' ')}" fill="none" stroke="#94a3b8" stroke-dasharray="4 3" stroke-width="1.2"/><text x="${ml+4}" y="${r3.y+10}" font-size="8.5" fill="#94a3b8">${tr('- - normal for the month','- - normal del mes')}</text>`; }
  h+=`<polyline points="${ds.map((x,i)=>x.ok?`${X(i)+cw/2},${YG(x.G)}`:'').filter(Boolean).join(' ')}" fill="none" stroke="#4ade80" stroke-width="1.8"/>`;
  h+=lbl(r3,tr('Root moisture','Humedad de raíces'),tr('0 dry – 1 saturated','0 seco – 1 saturado'),last.G.toFixed(2),'#4ade80');
  // eje de fechas
  [0, Math.floor(n/3), Math.floor(2*n/3), n-1].forEach(i=>{ h+=`<text x="${X(i)+cw/2}" y="${H-1}" text-anchor="middle" font-size="9" fill="#64748b">${fmtDia(ds[i].d)}</text>`; });
  const miss=ds.length-okd.length;
  $('#series').innerHTML=`<svg viewBox="0 0 ${W} ${H+4}" style="width:100%" role="img" aria-label="${tr('Last 90 days of rain, high temperature and soil moisture','Últimos 90 días de lluvia, temperatura máxima y humedad del suelo')}">${h}</svg>
    <div class="note" style="margin-top:2px">${tr('Last','Últimos')} ${n} ${tr('days','días')}. ${miss?tr('Gray bands are days NASA POWER has not published yet (usually a 2–4 day lag). ','Las franjas grises son días que NASA POWER todavía no publica (suele tardar 2–4 días). '):''}${tr('Data from a ~50 km pixel: it represents the area, not your exact plot.','Datos de un píxel de unos 50 km: representan la zona, no tu parcela exacta.')}</div>`;
}

function snapCrop(el, texs, lat, lon, half){
  const tw=el.clientWidth||240, x=(lon-LA_BOX.w)*LA_BOX.ppd, y=(LA_BOX.n-lat)*LA_BOX.ppd, sc=tw/(2*half*LA_BOX.ppd);
  el.style.backgroundImage=texs.map(t=>`url(${SNAP_DIR}${t}.webp)`).join(',');
  el.style.backgroundSize=`${LA_BOX.W*sc}px ${LA_BOX.H*sc}px`;
  el.style.backgroundPosition=`${tw/2-x*sc}px ${tw/2-y*sc}px`;
  el.style.backgroundRepeat='no-repeat';
}
function layoutCrops(){ document.querySelectorAll('.timg[data-crop]').forEach(el=>{ const [t,la,lo,h]=el.dataset.crop.split('|'); snapCrop(el,t.split(','),+la,+lo,+h); }); }
window.addEventListener('resize',()=>layoutCrops());

function renderLive(state, err){
  const si=$('#srcImerg');
  if (si){ si.className='badge '+(LIVE.mode==='live'?'on':'ref'); si.textContent=LIVE.mode==='live'?tr('live','en vivo'):tr('live only','solo en vivo'); }
  const s=S.site, dot=$('#liveDot'), mode = state==='ok' ? LIVE.mode : null;
  dot.className='ldot '+({ok:'on',loading:'wait',blocked:'off',error:'off'}[state]||'');
  const badge=$('#liveBadge');
  if (badge) badge.innerHTML = mode==='live' ? `<span class="lbadge live">● ${tr('LIVE','EN VIVO')}</span>` : mode==='snap' ? `<span class="lbadge snap">◆ ${tr('REAL NASA DATA','DATOS REALES NASA')} · ${fmtFecha(SNAP.date).toUpperCase()}</span>` : '';
  if (state==='blocked'){
    $('#liveSub').textContent=tr('· no NASA connection','· sin conexión con la NASA');
    $('#liveMsg').innerHTML=tr('<div class="blocked"><b>No data available for this place in this view.</b> Published on the web, the page queries NASA live.</div>','<div class="blocked"><b>No hay datos disponibles para este lugar en esta vista.</b> Publicada en la web, la página los consulta en vivo a la NASA.</div>');
    $('#tiles').innerHTML=''; $('#series').innerHTML=''; $('#livestats').innerHTML=''; return;
  }
  if (state==='error'){ $('#liveSub').textContent='· error'; $('#liveMsg').innerHTML=tr(`<div class="blocked"><b>NASA POWER did not respond</b> (${err}). Try “Refresh” in a few seconds.</div>`,`<div class="blocked"><b>NASA POWER no respondió</b> (${err}). Prueba “Actualizar” en unos segundos.</div>`); }
  else $('#liveMsg').innerHTML='';
  const ref=s.refKey?SITES[s.refKey]:null;
  $('#liveSub').textContent = state==='loading' ? tr('· querying NASA…','· consultando a la NASA…')
    : mode==='live' ? `· ${s.lat.toFixed(2)}, ${s.lon.toFixed(2)} · ${tr('updated','actualizado')} ${LIVE.at?LIVE.at.toLocaleTimeString(LANG==='es'?'es':'en',{hour:'2-digit',minute:'2-digit'}):''}`
    : ref ? tr(`· detail imagery and climate from ${siteRegion(ref)} (${r0(s.refDist)} km away)`,`· imágenes de detalle y clima de ${siteRegion(ref)} (a ${r0(s.refDist)} km)`) : `· ${siteRegion(s)}, ${siteCountry(s)}`;
  const site = ref || s, k = ref ? s.refKey : s.key;
  const keyT=(mode||'x')+'|'+LANG+'|'+k+'|'+s.lat.toFixed(3)+','+s.lon.toFixed(3);
  if ($('#tiles').dataset.k!==keyT && (mode==='live' || mode==='snap')){
    $('#tiles').dataset.k=keyT;
    const bm=`${GIBS}?SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1&LAYERS=BlueMarble_ShadedRelief_Bathymetry&SRS=EPSG:4326`;
    $('#tiles').innerHTML = TOOLS.map(T=>{
      let media='';
      if (mode==='snap'){
        if (T.kind==='site') media=`<div class="timg"><img src="${SNAP_DIR}${k}_${T.id}.webp" alt="${lx(T,'t')} ${tr('in','en')} ${siteRegion(site)}" loading="lazy">`;
        else media=`<div class="timg" data-crop="${T.tex}${T.opaque?'':',latam_bm'}|${s.lat}|${s.lon}|${T.half}" role="img" aria-label="${lx(T,'t')} ${tr('in the region','en la región')}">`;
      } else {
        if (T.kind==='site'){
          const base = T.base ? `<img class="base" src="${gibsURL(LIVE_LAYERS[0],s.lat,s.lon)}" alt="">` : T.relief ? `<img class="base" src="${gibsURL({layer:'ASTER_GDEM_Greyscale_Shaded_Relief'},s.lat,s.lon)}" alt="">` : '';
          media=`<div class="timg">${base}<img class="${base?'ov':''}" src="${T.live(s.lat,s.lon)}" alt="${lx(T,'t')}" onerror="this.style.display='none'">`;
        } else {
          const bb=regionBox(s.lat,s.lon,T.half);
          media=`<div class="timg">${T.opaque?'':`<img class="base" src="${bm}&BBOX=${bb}&WIDTH=420&HEIGHT=420&FORMAT=image%2Fjpeg" alt="">`}<img class="ov" src="${wmsBox(T.layer,bb,'image/png',T.ltime?T.ltime():'')}" alt="${lx(T,'t')}" onerror="this.style.display='none'">`;
        }
      }
      const km = T.kind==='site' ? r0(3*111*Math.cos(site.lat*Math.PI/180)) : r0(2*T.half*111*Math.cos(s.lat*Math.PI/180));
      const ends = lx(T,'ends');
      return `<figure class="tool">${media}<div class="xh"></div><span class="tsat">${T.sat}</span><span class="scale">≈ ${km} km</span></div>
        <figcaption><div class="t">${lx(T,'t')} ${srcChip('gibs')}<span>${mode==='live'?tr('live','en vivo'):lx(T,'when')}</span></div><div class="d">${lx(T,'d')}</div>
        ${T.ramp?`<div class="ramp" style="background:linear-gradient(90deg,${T.ramp.join(',')})"></div><div class="ends"><span>${ends[0]}</span><span>${ends[1]}</span></div>`:''}</figcaption></figure>`;
    }).join('');
    requestAnimationFrame(layoutCrops);
  }
  if (state!=='ok'){ if(state==='loading'){ $('#series').innerHTML=`<div class="note">${tr('Loading the last 90 days of NASA POWER…','Cargando los últimos 90 días de NASA POWER…')}</div>`; $('#livestats').innerHTML=''; } return; }
  renderSeries();
  const st=liveStats(); const old=document.getElementById('liveAlert'); if (old) old.remove();
  if (!st){ $('#livestats').innerHTML=''; return; }
  const pctTxt = st.pct!=null ? `${r0(st.pct*100)} % ${tr('of normal','de lo normal')}` : tr('no reference','sin referencia');
  const pcls = st.pct==null?'':st.pct<.6?'bad':st.pct>1.4?'warn':'ok';
  const gcls = st.gAnom==null?'':st.gAnom<-.08?'bad':st.gAnom>.08?'warn':'ok';
  $('#livestats').innerHTML = `
    <div class="kpi"><div class="k">${tr('Rain last 30 days','Lluvia últimos 30 días')}</div><div class="v">${r0(st.rain30)} mm</div><div class="s ${pcls}">${pctTxt}</div></div>
    <div class="kpi"><div class="k">${tr('Days with high ≥ 34 °C','Días con máxima ≥ 34 °C')}</div><div class="v ${st.hot>10?'bad':st.hot>3?'warn':'ok'}">${st.hot}</div><div class="s">${tr('of the last','de los últimos')} ${st.n30}</div></div>
    <div class="kpi"><div class="k">${tr('Root moisture','Humedad de raíces')}</div><div class="v">${st.g.toFixed(2)}</div><div class="s ${gcls}">${st.gAnom!=null?`${tr('normal','normal')} ${st.gNorm.toFixed(2)} · ${tr('anomaly','anomalía')} ${st.gAnom>0?'+':''}${st.gAnom.toFixed(2)}`:''}</div></div>
    <div class="kpi"><div class="k">${tr('Data through','Datos hasta')}</div><div class="v" style="font-size:17px">${fmtDia(st.last.d)}</div><div class="s">${mode==='live'?tr('NASA POWER daily (≈ 2–4 day lag)','NASA POWER diario (≈ 2–4 días de retraso)'):tr('NASA POWER daily · downloaded','NASA POWER diario · descargado el')+' '+fmtFecha(SNAP.date)}</div></div>`;
  let alert='';
  if (st.pct!=null && st.pct<.6) alert=tr(`<div class="livealert">⚠ <b>Drought signal:</b> in the last 30 days it rained ${r0(st.pct*100)} % of normal for the season. If you plan to sow soon, prioritize tolerant crops (sorghum, cowpea, sesame) or wait for the next rain.</div>`,`<div class="livealert">⚠ <b>Señal de sequía:</b> en los últimos 30 días llovió ${r0(st.pct*100)} % de lo normal para la época. Si vas a sembrar pronto, prioriza cultivos tolerantes (sorgo, caupí, ajonjolí) o espera la siguiente lluvia.</div>`);
  else if (st.gAnom!=null && st.gAnom<-.08) alert=tr(`<div class="livealert">⚠ <b>Soil drier than normal:</b> root moisture is ${Math.abs(st.gAnom).toFixed(2)} below the month's average.</div>`,`<div class="livealert">⚠ <b>Suelo más seco de lo normal:</b> la humedad de raíces está ${Math.abs(st.gAnom).toFixed(2)} por debajo del promedio del mes.</div>`);
  else if (st.pct!=null && st.pct>1.6) alert=tr(`<div class="livealert">⚠ <b>Much more rain than normal</b> (${r0(st.pct*100)} %): waterlogging and disease risk; watch peanut, sesame or potato.</div>`,`<div class="livealert">⚠ <b>Mucha más lluvia de lo normal</b> (${r0(st.pct*100)} %): riesgo de encharcamiento y enfermedades; cuidado con maní, ajonjolí o papa.</div>`);
  else alert=tr(`<div class="livealert ok">✓ Conditions over recent weeks are within normal for the season.</div>`,`<div class="livealert ok">✓ Las condiciones de las últimas semanas están dentro de lo normal para la época.</div>`);
  $('#livestats').insertAdjacentHTML('afterend', `<div id="liveAlert">${alert}</div>`);
  const ib=$('#imergBox'), im=LIVE.imerg;
  if (ib) ib.innerHTML = im
    ? `<div class="note" style="margin-top:10px">${srcChip('api',im.src)} <b>${tr('Sowing window','Ventana de siembra')} ${im.window} (${im.slot}):</b> <b>${r0(im.mm)} mm</b>${im.pct!=null?` = <b>${r0(im.pct*100)} %</b> ${tr('of the same climatological window','de la misma ventana climatológica')}`:''} · ${im.days} ${tr('days','días')}, ${im.miss} ${tr('missing','faltantes')}</div>`
    : '';
}

/* ---------- Ficha del lugar (sin enlaces externos) ---------- */
function renderPlace(){
  const s=S.site, ref=s.refKey?SITES[s.refKey]:null;
  const src = LIVE.mode==='live' ? `<span class="ok">● ${tr('NASA POWER live','NASA POWER en vivo')}</span>` : LIVE.mode==='snap' ? `<span class="ok">◆ NASA POWER · ${fmtFecha(SNAP.date)}</span>` : `<span class="warn">${tr('approx. reference','referencia aprox.')}</span>`;
  const warn = ref ? (s.refDist>350 ? `<div class="note warn" style="margin:0">⚠ ${tr('The nearest reference region is','La región de referencia más cercana está a')} ${r0(s.refDist)} km: ${tr('the climate may not represent this point.','el clima puede no representar este punto.')}${LIVE.mode==='live'?'':tr(' Published on the web, the page fetches the exact data.',' Publicada en la web, la página trae el dato exacto.')}</div>`
                     : `<div class="note" style="margin:0">${tr(`Climate from <b>${siteRegion(ref)}</b> (${r0(s.refDist)} km away).`,`Clima de <b>${siteRegion(ref)}</b> (a ${r0(s.refDist)} km).`)}</div>`) : '';
  $('#place').innerHTML = `
    <div><div class="kicker">${tr('SELECTED PLACE','LUGAR SELECCIONADO')}</div><h4>${siteRegion(s)}</h4><div class="sub">${siteCountry(s)} · ${s.lat.toFixed(3)}, ${s.lon.toFixed(3)}</div><div class="sub">${src}</div></div>
    ${warn}
    <div class="mini">
      <div><div class="k">${tr('Annual rainfall','Lluvia anual')}</div><div class="v">${r0(s.P)} mm</div></div>
      <div><div class="k">${tr('Season T','T temporada')}</div><div class="v">${s.Tg.toFixed(1)} °C</div></div>
      <div><div class="k">${tr('Root moisture','Humedad raíces')}</div><div class="v">${s.GWET.toFixed(2)}</div></div>
      <div><div class="k">${tr('Elevation','Elevación')}</div><div class="v">${r0(s.elev||0)} m</div></div>
      <div><div class="k">${tr('Warmest-month max','Máx. mes cálido')}</div><div class="v">${s.Tmax.toFixed(1)} °C</div></div>
      <div><div class="k">${tr('Water storage anomaly','Anomalía del agua almacenada')}</div><div class="v" style="font-size:12.5px">${s.gw>=.5?tr('declining','en descenso'):s.gw>=.25?tr('mild decline','descenso leve'):tr('stable','estable')}</div></div>
    </div>
    <div class="recbox"><div class="k">${tr('RECOMMENDED ROTATION','ROTACIÓN RECOMENDADA')}</div><div>${S.results&&S.results[0]?seqHTML(S.results[0].seq):'—'}</div><a href="#s-ranking">${tr('See full comparison ↓','Ver comparación completa ↓')}</a></div>
    <a class="toolsjump" href="#livebox">${tr('🛰 See what the satellites see here ↓','🛰 Ver lo que ven los satélites aquí ↓')}</a>`;
}
