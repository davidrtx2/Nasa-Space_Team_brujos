/* AGRI-ORBIT · js/views/agriAI.js
   Vista de AGRI-AI: ventana de conversación, estado, mensajes y contexto. */

const AI_QUICK = [
  ['Analyze my land conditions.', 'Analiza las condiciones de mi terreno.'],
  ['How can I improve soil health?', '¿Cómo puedo mejorar la salud del suelo?'],
  ['Explain the NASA data to me.', 'Explícame los datos de NASA.'],
  ['Compare my rotation strategies.', 'Compara mis estrategias de rotación.'],
  ['How can I save water?', '¿Cómo puedo ahorrar agua?']
];

const aiEsc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* Markdown mínimo y seguro: se escapa todo el HTML antes de dar formato */
function aiFormat(text){
  const lines = aiEsc(text).split(/\r?\n/);
  let html = '', list = null;
  const inline = s => s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>');
  const close = () => { if (list) { html += `</${list}>`; list = null; } };
  for (const raw of lines) {
    const l = raw.trim();
    let m;
    if ((m = l.match(/^[-*•]\s+(.*)/))) { if (list !== 'ul') { close(); html += '<ul>'; list = 'ul'; } html += `<li>${inline(m[1])}</li>`; }
    else if ((m = l.match(/^\d+[.)]\s+(.*)/))) { if (list !== 'ol') { close(); html += '<ol>'; list = 'ol'; } html += `<li>${inline(m[1])}</li>`; }
    else if ((m = l.match(/^#{1,4}\s+(.*)/))) { close(); html += `<p class="aih">${inline(m[1])}</p>`; }
    else if (!l) { close(); }
    else { close(); html += `<p>${inline(l)}</p>`; }
  }
  close();
  return html;
}

function aiWelcomeHTML(){
  return aiFormat(tr(
`Hi! I'm AGRI-AI, your smart farming assistant.

I'm here to help you understand your land data, interpret NASA information and explore more resilient crop rotation strategies.

You can ask me anything about AGRI-ORBIT or about the farming conditions in your region.

How can I help you today?`,
`¡Hola! Soy AGRI-AI, tu asistente agrícola inteligente.

Estoy aquí para ayudarte a comprender los datos de tu terreno, interpretar la información de NASA y explorar estrategias de rotación de cultivos más resilientes.

Puedes preguntarme cualquier cosa sobre AGRI-ORBIT o sobre las condiciones agrícolas de tu región.

¿En qué puedo ayudarte hoy?`));
}

function aiStatusInfo(){
  const st = AGRI_AI.status;
  if (st === 'online') return { cls: 'on', txt: tr('Online · uses your current AGRI-ORBIT data', 'En línea · usa tus datos actuales de AGRI-ORBIT') };
  if (st === 'checking' || st === 'unknown') return { cls: 'wait', txt: tr('Checking connection…', 'Comprobando conexión…') };
  if (st === 'noconn') return { cls: 'off', txt: tr('No connection · needs internet to answer', 'Sin conexión · necesita internet para responder') };
  const dev = aiIsLocalDev() && AGRI_AI.endpoint;
  if (st === 'unconfigured') return { cls: 'off', txt: dev ? tr('Backend without API key (server/.env)', 'Backend sin API key (server/.env)') : tr('Not configured on this deployment', 'No configurado en este despliegue') };
  return { cls: 'off', txt: dev ? tr('Backend not running (node server/index.js)', 'Backend apagado (node server/index.js)') : tr('Unavailable right now', 'No disponible en este momento') };
}

function renderAgriAIStatus(){
  const el = $('#aiStatus'); if (!el) return;
  const s = aiStatusInfo();
  el.innerHTML = `<i class="aidot ${s.cls}"></i>${aiEsc(s.txt)}`;
  const fab = $('#aiFab'); if (fab && fab.classList) fab.classList.toggle('off', s.cls === 'off');
}

function renderAgriAICtx(){
  const el = $('#aiCtx'); if (!el) return;
  el.innerHTML = `<span class="aictx-k">${tr('Context','Contexto')}</span> ${aiEsc(aiContextSummary())}`;
}

function renderAgriAI(){
  const box = $('#aiMsgs'); if (!box) return;
  renderAgriAIStatus(); renderAgriAICtx();
  const msgs = AGRI_AI.history.map(m => `<div class="aimsg ${m.role === 'user' ? 'me' : 'bot'}">${m.role === 'user' ? `<p>${aiEsc(m.content)}</p>` : aiFormat(m.content)}</div>`).join('');
  const typing = AGRI_AI.busy ? `<div class="aimsg bot aityping" role="status" aria-label="${tr('AGRI-AI is typing','AGRI-AI está escribiendo')}"><span></span><span></span><span></span></div>` : '';
  const err = AGRI_AI.error ? `<div class="aierr" role="alert">${aiEsc(aiErrorText(AGRI_AI.error))}</div>` : '';
  const quick = AGRI_AI.history.length ? '' : `<div class="aiquick">${AI_QUICK.map((q,i) => `<button type="button" data-q="${i}">${aiEsc(tr(q[0], q[1]))}</button>`).join('')}</div>`;
  box.innerHTML = `<div class="aimsg bot aiwelcome">${aiWelcomeHTML()}</div>${quick}${msgs}${typing}${err}`;
  box.scrollTop = box.scrollHeight;
  const send = $('#aiSend'), inp = $('#aiInput');
  if (send) send.disabled = AGRI_AI.busy;
  if (inp) inp.disabled = AGRI_AI.busy;
}
