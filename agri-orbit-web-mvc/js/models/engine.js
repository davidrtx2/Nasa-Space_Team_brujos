/* AGRI-ORBIT · js/models/engine.js
   Modelo agronómico: aptitud, evaluación de rotaciones, ranking y Monte Carlo. */

/* =========================================================
   MODELO AGRONÓMICO (reglas + puntajes)
   ========================================================= */
function envFrom(over={}){
  const s=S.site, sc=scen();
  return {
    tropical: Math.abs(s.lat) < 23.5,
    Tg: s.Tg + sc.dT + (over.dT||0),
    Tmax: s.Tmax + sc.dT + (over.dT||0) + (over.heat||0),
    P: s.P * (1+sc.dP) * (over.pf||1),
    frost: clamp(s.frost - .12*sc.dT),
    texW: {arenoso:.85,franco:1,arcilloso:1.05}[S.texture] * (1 + (S.om-2)*.03),
    irr: IRR[S.irr],
    frac: s.frac || 0
  };
}

// Aptitud de un cultivo (0–1) en un ambiente dado
function cropScore(c, e){
  if (c.id==='barbecho') return {S:1, W:0, deficit:0, heat:0, tfit:1, wfit:1};
  const coolTemperate = c.cool && !e.tropical;
  const T = coolTemperate ? Math.max(e.Tg-10, e.Tg*.7) : e.Tg;
  const tfit = Math.exp(-Math.pow((T-c.To)/c.Tr,2));
  const frac = e.frac || (e.tropical ? .5 : (coolTemperate ? .45 : .65));
  const Wrain = e.P*frac*e.texW;
  const deficitRain = Math.max(0, c.need - Wrain);
  const deficit = Math.max(0, deficitRain - e.irr);
  const wfit = 1 - (deficit/c.need)*(1 - .6*c.dt);
  const heat = clamp(((coolTemperate ? e.Tmax-10 : e.Tmax) - 32)/8) * (1-c.ht);
  const frostP = e.frost * (1-c.ft) * (e.tropical || c.cool ? .6 : .3);
  const d = S.ph < c.ph[0] ? c.ph[0]-S.ph : S.ph > c.ph[1] ? S.ph-c.ph[1] : 0;
  const phfit = clamp(1 - .15*d, .5, 1);
  const texfit = ((c.tex && c.tex[S.texture]) || 1) * (1 - clamp((e.P-1500)/1500)*(c.wet||0));
  return {S: clamp(tfit*clamp(wfit)*(1-heat)*(1-frostP)*phfit*texfit), W:Wrain, deficitRain, deficit, heat, tfit, wfit};
}

// Efecto del cultivo anterior sobre el siguiente
function stageMod(p, c, e){
  let m = 0;
  if (p.nfix >= 40 && c.ndem >= 80) m += .10;                      // crédito de nitrógeno
  if (p.fam === c.fam && p.id!=='barbecho' && c.id!=='barbecho') m -= .12; // plagas/enfermedades compartidas
  if (p.id==='barbecho' && e.P < 750) m += .08;                     // barbecho almacena humedad en secano seco
  if (p.cover && !c.cover) m += e.P < 750 ? -.06*(1-p.dt) : .05;   // cobertura: mejora suelo, pero compite por agua si es seco
  return m;
}

function hazards(e){
  const s=S.site, sc=scen();
  const drought = clamp(.55*clamp(1-e.P/1300) + .9*s.Pcv*sc.cv - .05);
  return {
    heat:   {n:'Calor extremo', d:`Máx. mes más cálido ≈ ${e.Tmax.toFixed(1)} °C`, v: clamp((e.Tmax-31)/8)},
    drought:{n:'Sequía estacional', d:`Lluvia ≈ ${r0(e.P)} mm/año · variabilidad ${pct(s.Pcv*sc.cv)}`, v: drought},
    flash:  {n:'Sequía relámpago / canícula', d:`Humedad zona radicular ${s.GWET.toFixed(2)} · calor`, v: clamp(.5*drought + .4*clamp((e.Tmax-28)/10) + .3*(.6-s.GWET))},
    erosion:{n:'Erosión (viento y escorrentía)', d:`Pendiente ${S.slope} % · viento ${pct(s.wind)}`, v: clamp(.35*s.wind + .35*s.heavy*(S.slope/12) + .3*clamp(S.slope/25))},
    rain:   {n:'Lluvias intensas / encharcamiento', d:`Suelo ${S.texture}`, v: clamp(s.heavy*(S.texture==='arcilloso'?1.15:.85))},
    frost:  {n:'Heladas', d: e.frost>0 ? 'Riesgo en la estación fría' : 'No relevante en este sitio', v: e.frost},
    gw:     {n:'Agua subterránea en descenso', d:`GRACE/GRACE-FO (ref.) · ${S.irr==='none'?'afecta si usas riego':'tu finca usa riego'}`, v: s.gw}
  };
}

function evaluate(seq, ctx){
  const L=seq.length, e=ctx.env;
  let econ=0, wat=0, wn=0, irrNeed=0, fo=0, cov=0, res=0, till=0, nfix=0, ndem=0, cash=0;
  const fams=new Set(), exp={heat:0,drought:0,flash:0,erosion:0,rain:0,frost:0,gw:0}, stages=[];
  for (let i=0;i<L;i++){
    const c=CROPS[seq[i]], p=CROPS[seq[(i-1+L)%L]], sc=ctx.cs[c.id];
    const mod = stageMod(p,c,e);
    const y = clamp(sc.S*(1+mod));
    stages.push({id:c.id, y, mod, sc});
    econ += y*c.inc;
    if (c.need>0){ wat += 1 - sc.deficitRain/c.need; wn++; irrNeed += Math.min(sc.deficitRain, e.irr); }
    fo += c.fo||0;
    cov+=c.cov; res+=c.res; till+=c.till; nfix+=c.nfix; ndem+=c.ndem;
    if (c.id!=='barbecho') fams.add(c.fam);
    if (c.inc>=.4) cash++;
    const w = c.cover ? .35 : 1;
    exp.heat += w*(1-c.ht); exp.drought += w*(1-c.dt); exp.flash += w*(1-c.dt);
    exp.frost += w*(1-c.ft);
    exp.erosion += (1-c.cov)*(.5+.5*c.till);
    exp.rain += (1-c.cov)*.7 + (c.till>.6 ? .3 : 0);
  }
  for (const k in exp) exp[k]/=L;
  exp.gw = clamp(irrNeed/L/250);
  const div = Math.min(1, fams.size/L);
  const nRatio = clamp(.6*nfix/Math.max(1,ndem));
  const m = {
    econ: 100*clamp(econ/L/.72),
    water: 100*clamp(wn ? wat/wn : 1),
    soil: 100*clamp((.32*cov/L + .2*res/L + .18*div + .15*nRatio + .15*(1-till/L))/.86),
    nAuto: 100*nRatio,
    forage: 100*fo/L
  };
  m.water = clamp(m.water - 35*S.site.gw*exp.gw, 0, 100);
  const risk={}; let rs=0, n=0;
  for (const k in ctx.H){ risk[k] = ctx.H[k].v * exp[k]; rs += risk[k]; n++; }
  m.resil = 100*clamp(1 - (rs/n)*1.45 + .08*div);
  const w=S.prio, tw=(w.econ+w.soil+w.water+w.risk+w.forage)||1;
  m.overall = (w.econ*m.econ + w.soil*m.soil + w.water*m.water + w.risk*m.resil + w.forage*m.forage)/tw;
  m.irrigation = irrNeed/L;
  m.nFert = Math.max(0, ndem - .6*nfix)/L;
  m.nFix = nfix/L;
  m.bare = 100*(1 - cov/L);
  m.cash = cash; m.div=div;
  return {seq, m, risk, exp, stages};
}

function canonical(seq){
  let best=null;
  for (let i=0;i<seq.length;i++){ const r=seq.slice(i).concat(seq.slice(0,i)).join(','); if(best===null||r<best) best=r; }
  return best;
}

function runEngine(){
  const env = envFrom();
  const cs = {}; for (const k in CROPS) cs[k] = cropScore(CROPS[k], env);
  const H = hazards(env);
  const ctx = {env, cs, H};
  const L = S.L;
  // candidatos: cultivos con aptitud suficiente
  const pool = Object.keys(CROPS).filter(k => k==='barbecho' || (!S.excluded.has(k) && cs[k].S >= .3 && !(CROPS[k].trop && !env.tropical) && !(CROPS[k].andino && (S.site.elev||0) < 1800)))
     .sort((a,b)=>cs[b].S-cs[a].S).slice(0,11);
  if (!pool.includes('barbecho')) pool.push('barbecho');
  const seen = new Set(), all=[];
  let count=0;
  const seq = new Array(L);
  (function rec(i){
    if (i===L){
      if (seq[L-1]===seq[0]) return;
      const cash = seq.filter(k=>CROPS[k].inc>=.4).length;
      if (cash < Math.ceil(L/2)) return;
      if (seq.filter(k=>k==='barbecho').length>1) return;
      if (seq.filter(k=>CROPS[k].cover).length>1) return;
      const key = canonical(seq); if (seen.has(key)) return; seen.add(key);
      count++;
      all.push(evaluate(seq.slice(), ctx));
      return;
    }
    for (const k of pool){ if (i>0 && seq[i-1]===k) continue; seq[i]=k; rec(i+1); }
  })(0);
  all.sort((a,b)=>b.m.overall-a.m.overall);
  // seleccionar top diverso
  // top diverso: cada opción difiere en ≥2 cultivos de las anteriores y ningún cultivo aparece en más de 3 opciones
  const picked=[], usage={};
  for (const r of all){
    const tok = x => CROPS[x].cover ? 'COBERTURA' : x;
    const rs = new Set(r.seq.map(tok));
    const tooSimilar = picked.some(p => { const ps=new Set(p.seq.map(tok)); let d=0; rs.forEach(x=>{if(!ps.has(x))d++;}); ps.forEach(x=>{if(!rs.has(x))d++;}); return d<2; });
    if (tooSimilar) continue;
    if ([...rs].some(x => x!=='barbecho' && x!=='COBERTURA' && (usage[x]||0) >= 3)) continue;
    rs.forEach(x=>usage[x]=(usage[x]||0)+1);
    picked.push(r); if (picked.length===5) break;
  }
  if (!picked.length && all.length) picked.push(all[0]);
  const curSeq = curRot(); const base = evaluate(curSeq, ctx); base.isBase=true; base.name='Tu rotación actual';
  picked.forEach((r,i)=>r.name='Opción '+(i+1));
  let custom=null;
  if (S.custom){ custom = evaluate(S.custom.slice(0,L), ctx); custom.isCustom=true; custom.name='Mi rotación'; }
  S.results = picked; S.base = base; S.customRes = custom; S.ctx = ctx; S.nEval = count;
  if (S.sel >= picked.length && S.sel!=='custom') S.sel = 0;
  computeCalendar();
}
function curRot(){ const L=S.L, b=(S.current||S.site.base).slice(0,L); while(b.length<L) b.push(b[b.length%Math.max(1,b.length)]||'maiz'); return b; }

const getSel = () => S.sel==='custom' && S.customRes ? S.customRes : S.results[S.sel] || S.results[0];
const getCmp = () => S.cmp==='base' ? S.base : S.cmp==='custom' && S.customRes ? S.customRes : (S.results[+S.cmp] || S.base);

/* =========================================================
   MONTE CARLO
   ========================================================= */
function monteCarlo(A, B, N=1000, H=8){
  const rand = rng(20251004 + S.L*7 + r0(Math.abs(S.site.lat*100+S.site.lon*10)) + r0(S.dT*10+S.dP+50)*101);
  const s=S.site, sc=scen();
  const heatP = hazards(envFrom()).heat.v;
  const curves = [A,B].map(()=>Array.from({length:H+1},()=>new Float64Array(N)));
  const loss=[0,0], win={n:0};
  for (let n=0;n<N;n++){
    const draws=[];
    for (let t=0;t<H;t++){
      draws.push({pf: Math.max(.2, 1 + gauss(rand)*s.Pcv*sc.cv*1.4), dT: gauss(rand)*.6, heat: rand()<heatP*.35 ? 3 : 0});
    }
    const finals=[];
    [A,B].forEach((R,ri)=>{
      let soil=.5, cum=0; const L=R.seq.length;
      for (let t=0;t<H;t++){
        const c=CROPS[R.seq[t%L]], p=CROPS[R.seq[(t-1+L)%L]];
        const e=envFrom(draws[t]);
        const sc2=cropScore(c,e);
        // ruido propio del cultivo (plagas, manejo, fechas de siembra): mayor en cultivos sensibles a sequía
        const noise = 1 + gauss(rand)*(.10 + .12*(1-c.dt));
        const y = clamp(sc2.S*(1+stageMod(p,c,e))*(.88+.24*soil)*noise);
        if (c.inc>=.4 && y < .5*clamp(sc2.S>0?R.stages[t%L].y:1)) loss[ri]++;
        cum += y*c.inc*100;
        soil = clamp(soil + .05*(c.cov-.5) + (c.nfix>0?.03:0) - .04*(c.till-.4) - (c.id==='barbecho'?.03:0));
        curves[ri][t+1][n]=cum;
      }
      finals.push(cum);
    });
    if (finals[0]>finals[1]) win.n++;
  }
  const q=(arr,p)=>{const a=Array.from(arr).sort((x,y)=>x-y);return a[Math.floor(p*(a.length-1))];};
  const stats = curves.map(cv => cv.map(arr => ({p10:q(arr,.1),p25:q(arr,.25),p50:q(arr,.5),p75:q(arr,.75),p90:q(arr,.9)})));
  const cashCycles = R => { let k=0; for(let t=0;t<H;t++) if(CROPS[R.seq[t%R.seq.length]].inc>=.4) k++; return k*N; };
  return {stats, H, pWin: win.n/N, loss:[loss[0]/cashCycles(A), loss[1]/cashCycles(B)]};
}
