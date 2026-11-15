/* AGRI-ORBIT · js/utils.js
   Utilidades compartidas: selectores, aleatorios, formato y toast. */

/* =========================================================
   UTILIDADES
   ========================================================= */
const $ = s => document.querySelector(s);
const clamp = (x,a=0,b=1) => Math.max(a,Math.min(b,x));
const r0 = x => Math.round(x);
const pct = x => Math.round(x*100)+'%';
function rng(seed){ let a=seed>>>0; return ()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}; }
function gauss(rand){ let u=0,v=0; while(!u)u=rand(); while(!v)v=rand(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); }
const pill = id => `<span class="pill"><i style="background:${CROPS[id].c}"></i>${cn(CROPS[id])}</span>`;
const seqHTML = seq => seq.map(pill).join('<span class="arrow">→</span>');
const seqTxt = seq => seq.map(id=>cn(CROPS[id])).join(' → ');
/* Conserva abiertos los <details data-keep> aunque la vista se vuelva a pintar */
const KEEP_OPEN = {};
const keepOpen = k => `data-keep="${k}"${KEEP_OPEN[k]?' open':''}`;
if (typeof document!=='undefined' && document.addEventListener) document.addEventListener('toggle', e=>{ const d=e.target; if (d && d.dataset && d.dataset.keep) KEEP_OPEN[d.dataset.keep]=d.open; }, true);
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.style.display='block'; clearTimeout(toast._t); toast._t=setTimeout(()=>t.style.display='none',2200); }

const DIAS=[31,28,31,30,31,30,31,31,30,31,30,31];
