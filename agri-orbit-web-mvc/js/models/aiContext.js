/* AGRI-ORBIT · js/models/aiContext.js
   Adaptador de contexto para AGRI-AI (solo lectura).
   Transforma el estado S, los resultados del motor y los datos NASA en un
   objeto estructurado, redondeado y sin datos personales. Solo incluye las
   secciones relevantes para la pregunta. Nunca modifica S ni LIVE. */

const AI_TOPICS = {
  terrain:  /suelo|terreno|parcela|finca|ph\b|textura|materia org|pendiente|riego|elevaci|altitud|soil|terrain|land|plot|farm|texture|organic|slope|irrigat|elevation|altitude/i,
  climate:  /clima|temperatura|calor|lluvia|precipitaci|humedad|gwet|radiaci|viento|sequ[ií]a|canícula|canicula|helada|estr[eé]s|climate|weather|temperature|heat|rain|precip|moisture|radiation|wind|drought|frost|stress/i,
  recent:   /[uú]ltim|reciente|90 d|30 d|ahora|hoy|actual|last|recent|now|today|current/i,
  nasa:     /nasa|power|imerg|gpm|smap|modis|ndvi|gibs|grace|srtm|aster|sat[eé]lit|satellite|fuente|source|dato|data/i,
  results:  /rotaci|estrategi|alternativ|opci[oó]n|puntaj|puntuaci|[ií]ndice|compar|mejor|peor|econ|ingreso|rendim|nitr[oó]geno|fertiliz|forraje|cobertura|estabilidad|resilien|riesgo|d[eé]ficit|monte ?carlo|rotation|strateg|option|score|index|compare|better|best|income|yield|nitrogen|forage|cover|stabil|resilien|risk|deficit|recomien|recommend|sembrar|plant|cultivo|crop/i,
  calendar: /calendario|mes|temporada|balance h[ií]drico|water balance|evapotransp|siembra|primera|postrera|ventana|calendar|month|season|sowing|window/i,
  priorities:/prioridad|ponderaci|peso|ahorrar agua|proteger el suelo|priorit|weight|save water|protect the soil/i
};

function aiTopics(q){
  const t = new Set();
  const s = String(q || '');
  for (const k in AI_TOPICS) if (AI_TOPICS[k].test(s)) t.add(k);
  if (/analiza|analy[sz]e|condicion|condition|resumen|summary/i.test(s)) ['terrain','climate','results'].forEach(k=>t.add(k));
  if (!t.size) ['climate','results'].forEach(k=>t.add(k));
  return t;
}

const aiNum = (x, d=1) => (typeof x === 'number' && isFinite(x)) ? +x.toFixed(d) : null;
const aiTxt = (x, n=200) => String(x == null ? '' : x).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, n);

function aiRotation(R, label){
  if (!R || !R.m) return null;
  const m = R.m;
  return {
    label: aiTxt(label || R.name || ''),
    sequence: R.seq.map(id => aiTxt(cn(CROPS[id]), 60)),
    scores: { overall: aiNum(m.overall,0), economic: aiNum(m.econ,0), soilHealth: aiNum(m.soil,0),
      water: aiNum(m.water,0), stability: aiNum(m.resil,0), forage: aiNum(m.forage,0) },
    waterMmPerCycle: { estimatedDeficit: aiNum(m.deficit,0), irrigationApplied: aiNum(m.irrigation,0), remainingDeficit: aiNum(m.deficitRem,0) },
    nitrogenKgHaPerCycle: { fertilizerNeed: aiNum(m.nFert,0), fixedByLegumes: aiNum(m.nFix,0) },
    soilCover: { bareSoilPct: aiNum(m.bare,0), bareMonthsPerYear: aiNum(m.bareMonths,1), vulnerableMonthsPerYear: aiNum(m.vulnMonths,1) },
    cropFamilies: aiNum(m.div*R.seq.length,0)
  };
}

function aiDataMode(){
  const mode = LIVE.mode === 'live' ? 'live_api' : LIVE.mode === 'snap' ? 'offline_snapshot' : 'regional_reference';
  return { mode, label: aiTxt(dataLabel()), snapshotDate: (LIVE.mode === 'snap' && SNAP.date) || null };
}

function aiSite(){
  const s = S.site;
  const o = { name: aiTxt(siteName(s)), region: aiTxt(siteRegion(s)), country: aiTxt(siteCountry(s)),
    lat: aiNum(s.lat,2), lon: aiNum(s.lon,2), elevationM: aiNum(s.elev,0),
    tropical: Math.abs(s.lat) < 23.5, currentPracticeInApp: aiTxt(baseName(s) || '') };
  if (s.refKey && SITES[s.refKey]) {
    o.pointPickedOnGlobe = true;
    o.referenceRegion = aiTxt(siteName(SITES[s.refKey]));
    o.referenceDistanceKm = aiNum(s.refDist, 0);
  }
  return o;
}

function aiClimate(full){
  const s = S.site, sc = scen();
  const c = {
    source: s.mT ? (LIVE.mode === 'live' ? 'NASA POWER climatology (live API)' : 'NASA POWER climatology (offline snapshot)') : 'approximate regional reference values (not a live NASA query)',
    annualRainfallMm: aiNum(s.P,0), warmSeasonMeanTempC: aiNum(s.Tg,1), warmestMonthMaxTempC: aiNum(s.Tmax,1),
    rootZoneMoistureGWETROOT_0to1: aiNum(s.GWET,2), solarRadiationKWhM2Day: aiNum(s.SW,1),
    windIndex_0to1: aiNum(s.wind,2), heavyRainIndex_0to1: aiNum(s.heavy,2), frostIndex_0to1: aiNum(s.frost,2),
    interannualRainfallCV: aiNum(s.Pcv,2),
    scenario: { label: aiTxt(sc.lbl), tempChangeC: S.dT, rainfallChangePct: S.dP }
  };
  if (full && S.cal && S.cal.mo) {
    c.monthlyWithScenario = S.cal.mo.map(x => ({ month: MESL[x.m].slice(0,3), tMeanC: aiNum(x.T,1), tMaxC: aiNum(x.Tx,1), tMinC: aiNum(x.Tn,1), rainMm: aiNum(x.P,0), etMm: aiNum(x.ET,0) }));
  }
  return c;
}

function aiRecent(){
  const out = {};
  const st = (typeof liveStats === 'function') ? liveStats() : null;
  if (st) out.last90Days = { source: LIVE.mode === 'live' ? 'NASA POWER daily (live)' : 'NASA POWER daily (snapshot)',
    lastDay: st.last.d, rainLast30DaysMm: aiNum(st.rain30,0), normalRainSamePeriodMm: aiNum(st.norm30,0),
    rainVsNormalPct: st.pct != null ? aiNum(st.pct*100,0) : null, hotDaysOver34C_last30: st.hot,
    rootZoneMoistureLatest: aiNum(st.g,2), rootZoneMoistureNormal: aiNum(st.gNorm,2), rootZoneMoistureAnomaly: aiNum(st.gAnom,2) };
  if (LIVE.imerg) { const im = LIVE.imerg;
    out.sowingWindowRainIMERG = { source: aiTxt(im.src), window: aiTxt(im.window), season: aiTxt(im.slot), rainMm: aiNum(im.mm,0),
      validDays: im.days, missingDays: im.miss, climatologyMm: aiNum(im.norm,0), vsClimatologyPct: im.pct != null ? aiNum(im.pct*100,0) : null };
  }
  if (!st && !LIVE.imerg) out.note = 'No daily series available right now (no live query or snapshot for this point).';
  return out;
}

function aiHazards(){
  if (!S.ctx || !S.ctx.H) return null;
  const H = S.ctx.H, o = {};
  for (const k in H) o[k] = { name: aiTxt(H[k].n), level_0to1: aiNum(H[k].v,2), detail: aiTxt(H[k].d) };
  return o;
}

function aiCalendar(){
  if (!S.cal) return null;
  return { dryMonthsPerYear: S.cal.dryMonths,
    growingSeasons: S.cal.gs.slots.map(sl => ({ name: aiTxt(sl.lbl), startMonth: MESL[sl.start], lengthMonths: sl.len })),
    shortSeason: !!S.cal.gs.short };
}

function aiPriorities(){
  const p = S.prio, tw = (p.econ+p.soil+p.water+p.risk+p.forage) || 1;
  const casePreset = Object.keys(CASE_PRIO).find(k => ['econ','soil','water','risk','forage'].every(q => p[q] === CASE_PRIO[k].prio[q]));
  return { sliders_0to100: { income: p.econ, soilHealth: p.soil, waterConservation: p.water, riskReduction: p.risk, forage: p.forage },
    weightsPct: { income: aiNum(100*p.econ/tw,0), soilHealth: aiNum(100*p.soil/tw,0), waterConservation: aiNum(100*p.water/tw,0), riskReduction: aiNum(100*p.risk/tw,0), forage: aiNum(100*p.forage/tw,0) },
    casePreset: casePreset ? aiTxt(tr(CASE_PRIO[casePreset].lblEn, CASE_PRIO[casePreset].lbl)) : null };
}

function aiResults(){
  const sel = getSel(), cmp = getCmp();
  const o = {
    rotationsEvaluated: S.nEval || 0,
    rotationLengthCycles: S.L,
    excludedCrops: [...S.excluded].map(id => aiTxt(cn(CROPS[id]), 60)),
    topOptions: S.results.slice(0,5).map(R => aiRotation(R)),
    selectedOnScreen: aiRotation(sel),
    comparedAgainst: aiRotation(cmp),
    currentRotation: aiRotation(S.base),
    customRotation: S.customRes ? aiRotation(S.customRes) : null
  };
  if (S.mc) o.monteCarlo = { simulations: 1000, horizonCycles: S.mc.H,
    probSelectedEndsWithMoreIncomeThanCompared: aiNum(S.mc.pWin*100,0),
    cropLossRatePct: { selected: aiNum(S.mc.loss[0]*100,0), compared: aiNum(S.mc.loss[1]*100,0) } };
  return o;
}

function aiCase(){
  if (!S.caseRes || S.siteKey !== CASE.siteKey) return null;
  const c = S.caseRes;
  return { name: 'Chiquimula Dry Corridor case (prototype reference farm)',
    base: aiRotation(c.base, tr('Base: maize 1st + 2nd season','Base: maíz primera y postrera')),
    alternatives: c.alts.map(a => ({ ...aiRotation(a.R, tr(a.titleEn, a.title)),
      assumptions: aiTxt(tr(a.assumeEn,a.assume),400), benefit: aiTxt(tr(a.benefitEn,a.benefit),400),
      tradeOff: aiTxt(tr(a.sacrificeEn,a.sacrifice),400), dataToValidate: aiTxt(tr(a.missingEn,a.missing),400) })),
    scoresByPreset: Object.keys(CASE_PRIO).map(k => ({ preset: aiTxt(tr(CASE_PRIO[k].lblEn, CASE_PRIO[k].lbl)),
      base: aiNum(overallWith(c.base.m, CASE_PRIO[k].prio),0),
      alternatives: c.alts.map(a => aiNum(overallWith(a.R.m, CASE_PRIO[k].prio),0)) })) };
}

function aiVisibleSection(){
  if (typeof document === 'undefined' || !document.querySelector) return null;
  const a = document.querySelector('nav.top a.active');
  return a && a.getAttribute ? aiTxt(a.getAttribute('href') || '', 30) || null : null;
}

/* Contexto para una pregunta. Solo lectura: no modifica el estado. */
function buildAIContext(question){
  if (!S || !S.site) return { available: false };
  const t = aiTopics(question);
  const ctx = {
    app: { name: 'AGRI-ORBIT', model: 'rules model v0.3', uiLanguage: LANG, visibleSection: aiVisibleSection() },
    data: aiDataMode(),
    site: aiSite(),
    soilFarmerInput: { texture: aiTxt(texLbl(S.texture)), organicMatterPct: S.om, pH: S.ph, slopePct: S.slope, irrigation: aiTxt(irrLbl(S.irr)), irrigationCapMmPerCycle: IRR[S.irr] },
    scenario: { label: aiTxt(scen().lbl), tempChangeC: S.dT, rainfallChangePct: S.dP },
    priorities: aiPriorities(),
    includedSections: [...t]
  };
  if (t.has('climate') || t.has('terrain') || t.has('nasa') || t.has('calendar')) ctx.climate = aiClimate(t.has('climate') || t.has('calendar'));
  if (t.has('recent') || t.has('climate') || t.has('nasa')) ctx.recent = aiRecent();
  if (t.has('climate') || t.has('results') || t.has('terrain')) ctx.hazards = aiHazards();
  if (t.has('calendar') || t.has('climate')) ctx.calendar = aiCalendar();
  if (t.has('results') || t.has('priorities') || t.has('terrain')) ctx.results = aiResults();
  else ctx.results = { selectedOnScreen: aiRotation(getSel()) };
  const cs = (t.has('results') || t.has('priorities')) ? aiCase() : null;
  if (cs) ctx.chiquimulaCase = cs;
  return ctx;
}

/* Firma corta del contexto actual (para mostrar en el chat qué datos usa AGRI-AI) */
function aiContextSummary(){
  if (!S || !S.site) return '';
  const pr = aiPriorities();
  const top = Object.entries(pr.weightsPct).sort((a,b)=>b[1]-a[1])[0];
  const prioName = {income:tr('income','ingreso'), soilHealth:tr('soil','suelo'), waterConservation:tr('water','agua'), riskReduction:tr('risk','riesgo'), forage:tr('forage','forraje')}[top[0]];
  return `${siteRegion(S.site)} · pH ${S.ph} · ${texLbl(S.texture)} · ${irrLbl(S.irr)} · ${tr('priority','prioridad')}: ${pr.casePreset || prioName}`;
}
