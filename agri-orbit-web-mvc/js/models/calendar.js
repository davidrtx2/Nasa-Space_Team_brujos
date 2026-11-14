/* AGRI-ORBIT · js/models/calendar.js
   Modelo del calendario mensual: balance hídrico, ventanas de siembra y suelo desnudo. */

/* =========================================================
   CALENDARIO MENSUAL: balance hídrico, suelo desnudo y épocas vulnerables
   ========================================================= */

function monthly(){
  const s=S.site, sc=scen(), out=[];
  const trop=Math.abs(s.lat)<23.5;
  const A = trop ? (s.elev>2000?1.2:1.8) : (Math.abs(s.lat)<30?4.5:6.5);
  const peak = s.lat>=0 ? (trop?4:6) : 0;
  const Tann = s.Tg - .64*A;
  const sh = REG[s.reg] || REG.ca, shMax=Math.max(...sh);
  const dtrBase = s.elev>3500?13 : s.elev>2000?11 : trop?8:10;
  for (let m=0;m<12;m++){
    let T,Tx,Tn,P;
    if (s.mT){ T=s.mT[m]+sc.dT; Tx=s.mTx[m]+sc.dT; Tn=s.mTn[m]+sc.dT; P=s.mP[m]*(1+sc.dP); }
    else {
      T = Tann + A*Math.cos(2*Math.PI*(m-peak)/12) + sc.dT;
      Tx = T + (s.Tmax - (s.Tg + .36*A));
      Tn = T - dtrBase*(1-.45*sh[m]/shMax)/2 - dtrBase*.25;
      P = s.P*(1+sc.dP)*sh[m];
    }
    const ET = 30*Math.max(.6, .12*T+1.2)*(.85+.06*(s.SW-5));
    out.push({m,T,Tx,Tn,P,ET,heat:Tx>=34,dry:P<.5*ET,wetX:P>320,frost:Tn<3});
  }
  if (!s.mT && s.frost>=.3){ [...out].sort((a,b)=>a.T-b.T).slice(0,2).forEach(x=>x.frost=true); }
  if (!s.frost) out.forEach(x=>x.frost=false);
  if (s.reg==='ca'){ [6,7].forEach(i=>{ if (out[i].P < out[5].P && out[i].P < out[8].P) out[i].canicula=true; }); }
  return out;
}

function growSlots(mo){
  const s=S.site, irr=IRR[S.irr], trop=Math.abs(s.lat)<23.5;
  const ok = mo.map(x => (x.P + irr/3 >= Math.max(30,.45*x.ET)) && x.T >= 5);
  let best={s:0,n:0};
  if (ok.every(Boolean)) best={s:0,n:12};
  else for (let s0=0;s0<12;s0++){ if (ok[(s0+11)%12]) continue; let n=0; while(n<12 && ok[(s0+n)%12]) n++; if(n>best.n) best={s:s0,n}; }
  if (!trop && best.n>=9){
    const warmStart = s.lat<0 ? 9 : 3;  // oct (sur) / abr (norte)
    return {slots:[{start:warmStart,len:5,kind:'warm',lbl:tr('warm season','temporada cálida')},{start:(warmStart+7)%12,len:5,kind:'cool',lbl:tr('cool season','temporada fresca')}], n:best.n};
  }
  if (best.n===12){ const dri=mo.reduce((a,b)=>b.P<mo[a].P?b.m:a,0); best.s=(dri+1)%12; }
  if (best.n>=6){ const l1=Math.min(4,Math.floor(best.n/2)), l2=Math.min(4,best.n-l1); return {slots:[{start:best.s,len:l1,kind:'any',lbl:tr('first season','primera')},{start:(best.s+l1)%12,len:l2,kind:'any',lbl:tr('second season','postrera')}], n:best.n}; }
  if (best.n>=4) return {slots:[{start:best.s,len:Math.min(best.n,5),kind:'any',lbl:tr('rainy season','temporada de lluvias')}], n:best.n};
  const wet=mo.reduce((a,b)=>b.P>mo[a].P?b.m:a,0);
  return {slots:[{start:(wet+10)%12,len:4,kind:'any',lbl:tr('short season','temporada corta')}], n:best.n, short:true};
}

function schedule(seq, gs){
  const ns=gs.slots.length, out=[]; let t=0;
  for (const id of seq){
    const c=CROPS[id];
    if (gs.slots[0].kind!=='any'){
      for (let g=0; g<ns; g++){ const k=gs.slots[t%ns].kind; if (id==='barbecho' || (c.cool ? k==='cool' : k==='warm')) break; t++; }
    }
    out.push({t,id}); t++;
  }
  return {pl:out, total:t};
}

function calendarFor(R, mo, gs){
  const ns=gs.slots.length, sc=schedule(R.seq, gs);
  const years=Math.min(4, Math.max(1, Math.ceil(sc.total/ns)));
  const rows=[]; let bare=0, vuln=0, vulnList=[];
  for (let y=0;y<years;y++){
    const cells=Array.from({length:12},()=>({kind:'bare'}));
    for (let j=0;j<ns;j++){
      const a=y*ns+j, pl=sc.pl.find(p=>p.t===a), sl=gs.slots[j];
      for (let k=0;k<sl.len;k++){
        const m=(sl.start+k)%12;
        if (!pl){ cells[m]={kind:'bare',empty:true}; continue; }
        const c=CROPS[pl.id];
        if (pl.id==='barbecho'){ cells[m]={kind:'fallow',id:pl.id}; continue; }
        const x=mo[m], flags=[];
        if (x.heat && c.ht<.6) flags.push('heat');
        if ((x.dry || x.canicula) && c.dt<.6 && IRR[S.irr]<150) flags.push('dry');
        if (x.frost && c.ft<.5) flags.push('frost');
        if (x.wetX && ((c.wet||0)>0 || c.till>.6)) flags.push('wet');
        if (flags.length){ vuln++; vulnList.push({id:pl.id,m,flags}); }
        cells[m]={kind:'crop',id:pl.id,flags,first:k===0,slot:sl.lbl};
      }
    }
    // rastrojo: meses sin cultivo después de uno con mucho residuo quedan parcialmente protegidos
    for (let m=0;m<12;m++){
      if (cells[m].kind!=='bare') continue;
      for (let b=1;b<=3;b++){ const pm=(m-b+12)%12, pc=cells[pm]; if (pc.kind==='crop'){ if (CROPS[pc.id].res>=.6 && b<=2) cells[m]={kind:'residue',id:pc.id}; break; } if (pc.kind!=='bare') break; }
    }
    cells.forEach(c=>{ if (c.kind==='bare'||c.kind==='fallow') bare+=1; else if (c.kind==='residue') bare+=.5; });
    rows.push(cells);
  }
  return {rows, years, bareYr: bare/years, vulnYr: vuln/years, vulnList};
}

function computeCalendar(){
  const mo=monthly(), gs=growSlots(mo);
  const all=[...S.results, S.base, S.customRes].filter(Boolean);
  all.forEach(R=>{ R.cal=calendarFor(R,mo,gs); R.m.bareMonths=R.cal.bareYr; R.m.vulnMonths=R.cal.vulnYr; });
  S.cal={mo,gs, dryMonths: mo.filter(x=>x.dry).length};
}
