/* AGRI-ORBIT · js/models/state.js
   Estado global de la aplicación (único origen de verdad). */

/* =========================================================
   ESTADO
   ========================================================= */
const S = {
  siteKey:'corredor', site:{...SITES.corredor}, live:false,
  texture:'franco', om:2.5, ph:6.2, slope:8, irr:'none', L:4, scen:'moderado', dT:1, dP:-5,
  prio:{...CASE_PRIO.water.prio}, current:null, excluded:new Set(),
  results:[], sel:0, cmp:'base', custom:null, year:0, layer:'crop', parcel:0, mc:null,
  casePrio:'water', caseRes:null
};
