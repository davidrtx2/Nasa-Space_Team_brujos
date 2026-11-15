/* AGRI-ORBIT · js/i18n.js
   Capa de idiomas: inglés nativo + cambio a español (persistente en localStorage). */

/* =========================================================
   NÚCLEO i18n
   ========================================================= */
let LANG = 'en';
const tr = (en, es) => LANG === 'es' ? es : en;

/* Meses según idioma activo */
const MONTHS = {
  en: { s: ['J','F','M','A','M','J','J','A','S','O','N','D'],
        l: ['January','February','March','April','May','June','July','August','September','October','November','December'] },
  es: { s: ['E','F','M','A','M','J','J','A','S','O','N','D'],
        l: ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'] }
};
let MES = MONTHS.en.s, MESL = MONTHS.en.l;

/* Campo bilingüe de un objeto: lx(obj,'t') -> obj.t / obj.tEs */
const lx = (o, k) => tr(o[k], o[k + 'Es'] !== undefined ? o[k + 'Es'] : o[k]);

/* Nombres localizados del modelo de datos */
const cn   = c => tr(c.n, c.nEs || c.n);                     // cultivo
const cfam = c => tr(c.famEn || FAM_EN[c.fam] || c.fam, c.fam); // familia
const croot = c => tr(ROOT_EN[c.root] || c.root, c.root);    // profundidad de raíz
const siteRegion  = s => tr(s.regionEn || s.region, s.regionEs || s.region);
const siteCountry = s => tr(s.countryEn || s.country, s.countryEs || s.country);
const siteName    = s => tr(s.nameEn || s.name, s.nameEs || s.name);
const baseName    = s => tr(s.baseNameEn || s.baseName, s.baseName);
const scenLbl     = sc => tr(sc.lblEn || sc.lbl, sc.lbl);

const FAM_EN = {
  'Poáceas': 'Grasses', 'Leguminosas': 'Legumes', 'Solanáceas': 'Nightshades',
  'Asteráceas': 'Sunflower family', 'Pedaliáceas': 'Sesame family',
  'Amarantáceas': 'Amaranths', 'Mezcla': 'Mix', '—': '—'
};
const ROOT_EN = { 'media': 'medium', 'superficial': 'shallow', 'profunda': 'deep', '—': '—' };

/* =========================================================
   HTML ESTÁTICO
   El HTML lleva el inglés como texto nativo; los atributos
   data-es* guardan la versión en español.
     data-es        -> textContent
     data-es-html   -> innerHTML (para elementos con marcado)
     data-es-ph     -> placeholder
     data-es-aria   -> aria-label
     data-es-title  -> title
     data-es-alt    -> alt
   ========================================================= */
function applyStaticLang() {
  const es = LANG === 'es';
  document.querySelectorAll('[data-es]').forEach(el => {
    if (el.dataset.en === undefined) el.dataset.en = el.textContent;
    el.textContent = es ? el.dataset.es : el.dataset.en;
  });
  document.querySelectorAll('[data-es-html]').forEach(el => {
    if (el.dataset.enhtml === undefined) el.dataset.enhtml = el.innerHTML;
    el.innerHTML = es ? el.dataset.esHtml : el.dataset.enhtml;
  });
  document.querySelectorAll('[data-es-ph]').forEach(el => {
    if (el.dataset.enph === undefined) el.dataset.enph = el.placeholder;
    el.placeholder = es ? el.dataset.esPh : el.dataset.enph;
  });
  document.querySelectorAll('[data-es-aria]').forEach(el => {
    if (el.dataset.enaria === undefined) el.dataset.enaria = el.getAttribute('aria-label') || '';
    el.setAttribute('aria-label', es ? el.dataset.esAria : el.dataset.enaria);
  });
  document.querySelectorAll('[data-es-alt]').forEach(el => {
    if (el.dataset.enalt === undefined) el.dataset.enalt = el.alt;
    el.alt = es ? el.dataset.esAlt : el.dataset.enalt;
  });
  document.querySelectorAll('[data-es-title]').forEach(el => {
    if (el.dataset.entitle === undefined) el.dataset.entitle = el.title;
    el.title = es ? el.dataset.esTitle : el.dataset.entitle;
  });
}

function setLang(l, save = true) {
  LANG = l === 'es' ? 'es' : 'en';
  if (save) try { localStorage.setItem('agriLang', LANG); } catch (e) {}
  document.documentElement.lang = LANG;
  MES = MONTHS[LANG].s; MESL = MONTHS[LANG].l;
  document.title = tr('AGRI-ORBIT · Decide what to plant next',
                      'AGRI-ORBIT · Decide qué sembrar después');
  const md = document.querySelector('meta[name="description"]');
  if (md) md.content = tr('AGRI-ORBIT compares crop rotations for Latin America with NASA satellite data: rainfall, soil moisture, vegetation, heat and groundwater.',
                          'AGRI-ORBIT compara rotaciones de cultivos para Latinoamérica con datos satelitales de la NASA: lluvia, humedad del suelo, vegetación, calor y agua subterránea.');
  const og = document.querySelector('meta[property="og:title"]');
  if (og) og.content = document.title;
  const ogd = document.querySelector('meta[property="og:description"]');
  if (ogd) ogd.content = tr('Decide what to plant next with NASA satellite data.', 'Decide qué sembrar después con datos satelitales de la NASA.');
  applyStaticLang();
  const b = document.getElementById('langBtn');
  if (b) {
    b.textContent = LANG === 'es' ? 'EN' : 'ES';
    b.setAttribute('aria-label', tr('Switch language to Spanish', 'Cambiar idioma a inglés'));
    b.title = tr('Cambiar a español', 'Switch to English');
  }
}

/* Re-renderiza todo lo dinámico tras un cambio de idioma */
function refreshLang() {
  if (typeof buildSiteSelect === 'function') buildSiteSelect();
  if (typeof fillSearch === 'function' && G.ready) fillSearch();
  if (typeof recompute === 'function') recompute();
  if (typeof renderPlace === 'function' && G.proj) renderPlace();
  if (typeof renderLegend === 'function' && G.proj) renderLegend();
  if (typeof renderLive === 'function') renderLive(LIVE.mode ? 'ok' : (LIVE.blocked ? 'blocked' : 'loading'));
  if (typeof refreshSat === 'function') refreshSat();
  if (typeof renderHeroStats === 'function') renderHeroStats();
}

function toggleLang() { setLang(LANG === 'es' ? 'en' : 'es'); refreshLang(); }

function initLang() {
  let saved = 'en';
  try { saved = localStorage.getItem('agriLang') || 'en'; } catch (e) {}
  const b = document.getElementById('langBtn');
  if (b) b.onclick = toggleLang;
  setLang(saved, false);
}
