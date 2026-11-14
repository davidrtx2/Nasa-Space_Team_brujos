/* AGRI-ORBIT · js/controllers/agriAI.js
   Controlador de AGRI-AI: apertura/cierre, envío de preguntas y sincronización.
   No modifica el estado agronómico: solo lee el contexto mediante buildAIContext(). */

function openAgriAI(){
  AGRI_AI.open = true;
  const p = $('#aiPanel'), f = $('#aiFab');
  if (p) { p.hidden = false; p.classList.add('show'); }
  if (f) f.setAttribute('aria-expanded', 'true');
  renderAgriAI();
  if (AGRI_AI.status !== 'online') aiCheckHealth().then(renderAgriAIStatus);
  const i = $('#aiInput'); if (i && i.focus) setTimeout(() => i.focus(), 60);
}
function closeAgriAI(){
  AGRI_AI.open = false;
  const p = $('#aiPanel'), f = $('#aiFab');
  if (p) { p.classList.remove('show'); p.hidden = true; }
  if (f) { f.setAttribute('aria-expanded', 'false'); if (f.focus) f.focus(); }
}
function toggleAgriAI(){ AGRI_AI.open ? closeAgriAI() : openAgriAI(); }

async function sendAgriAI(text){
  const q = String(text || '').trim();
  if (!q || AGRI_AI.busy) return;
  AGRI_AI.error = null;
  AGRI_AI.history.push({ role: 'user', content: q.slice(0, AGRI_AI.MAX_CHARS), at: Date.now() });
  AGRI_AI.busy = true; renderAgriAI();
  try {
    const reply = await aiAsk(q);
    AGRI_AI.history.push({ role: 'assistant', content: reply, at: Date.now() });
    AGRI_AI.status = 'online';
  } catch (e) {
    AGRI_AI.error = (e && e.code) || 'server';
    if (['network','unconfigured','noconn'].includes(AGRI_AI.error)) AGRI_AI.status = AGRI_AI.error === 'network' ? 'offline' : AGRI_AI.error;
    AGRI_AI.history.pop();          // la pregunta no respondida vuelve al campo de texto
    const i = $('#aiInput'); if (i) i.value = q;
  } finally {
    AGRI_AI.busy = false; renderAgriAI();
    const i = $('#aiInput'); if (i && i.focus && AGRI_AI.open) i.focus();
  }
}

function initAgriAI(){
  const fab = $('#aiFab'), form = $('#aiForm'), inp = $('#aiInput'), msgs = $('#aiMsgs');
  if (!fab || !form) return;
  AGRI_AI.endpoint = aiResolveEndpoint();
  fab.onclick = toggleAgriAI;
  const c = $('#aiClose'); if (c) c.onclick = closeAgriAI;
  form.onsubmit = e => { e.preventDefault(); const v = inp.value; inp.value = ''; sendAgriAI(v); };
  inp.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.onsubmit(e); } };
  msgs.onclick = e => { const b = e.target.closest && e.target.closest('button[data-q]'); if (b) sendAgriAI(tr(AI_QUICK[+b.dataset.q][0], AI_QUICK[+b.dataset.q][1])); };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && AGRI_AI.open) closeAgriAI(); });
  window.addEventListener('online', () => aiCheckHealth().then(renderAgriAIStatus));
  window.addEventListener('offline', () => { AGRI_AI.status = 'noconn'; renderAgriAIStatus(); });
  renderAgriAI();
  aiCheckHealth().then(renderAgriAIStatus);
}
