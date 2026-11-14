/* AGRI-AI · validación de solicitudes y saneamiento del contexto agrícola */
'use strict';

const LIMITS = { maxMessages: 20, maxUserChars: 1200, maxAssistantChars: 4000, maxTotalChars: 24000,
  ctxDepth: 6, ctxKeys: 60, ctxArray: 24, ctxString: 400, ctxBytes: 16000 };

class ValidationError extends Error { constructor(msg){ super(msg); this.status = 400; } }

const KEY_RE = /^[A-Za-z][A-Za-z0-9_]{0,60}$/;
const CTRL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/* Copia profunda limitada: solo primitivos, claves seguras, textos cortos y sin código */
function sanitizeContext(v, depth = 0){
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v * 1000) / 1000 : null;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') return v.replace(CTRL_RE, '').replace(/[<>`]/g, '').slice(0, LIMITS.ctxString);
  if (depth >= LIMITS.ctxDepth) return null;
  if (Array.isArray(v)) return v.slice(0, LIMITS.ctxArray).map(x => sanitizeContext(x, depth + 1));
  if (typeof v === 'object') {
    const out = {};
    for (const k of Object.keys(v).slice(0, LIMITS.ctxKeys)) {
      if (!KEY_RE.test(k) || k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      out[k] = sanitizeContext(v[k], depth + 1);
    }
    return out;
  }
  return null;
}

function validateChatBody(body){
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ValidationError('Body must be a JSON object');
  const { messages, context, lang, questionLang } = body;
  if (!Array.isArray(messages) || messages.length < 1 || messages.length > LIMITS.maxMessages) throw new ValidationError('messages must be an array of 1–' + LIMITS.maxMessages + ' items');
  let total = 0;
  const clean = messages.map((m, i) => {
    if (!m || typeof m !== 'object') throw new ValidationError(`messages[${i}] must be an object`);
    if (m.role !== 'user' && m.role !== 'assistant') throw new ValidationError(`messages[${i}].role must be "user" or "assistant"`);
    if (typeof m.content !== 'string') throw new ValidationError(`messages[${i}].content must be a string`);
    const content = m.content.replace(CTRL_RE, '').trim();
    const max = m.role === 'user' ? LIMITS.maxUserChars : LIMITS.maxAssistantChars;
    if (!content) throw new ValidationError(`messages[${i}].content is empty`);
    if (content.length > max) throw new ValidationError(`messages[${i}].content exceeds ${max} characters`);
    total += content.length;
    return { role: m.role, content };
  });
  if (total > LIMITS.maxTotalChars) throw new ValidationError('conversation too long');
  if (clean[clean.length - 1].role !== 'user') throw new ValidationError('last message must be from the user');
  let ctx = null;
  if (context !== undefined && context !== null) {
    if (typeof context !== 'object' || Array.isArray(context)) throw new ValidationError('context must be an object');
    ctx = sanitizeContext(context);
    if (JSON.stringify(ctx).length > LIMITS.ctxBytes) throw new ValidationError('context too large');
  }
  const L = x => (x === 'es' || x === 'en') ? x : null;
  return { messages: clean, context: ctx, lang: L(lang) || 'es', questionLang: L(questionLang) };
}

module.exports = { validateChatBody, sanitizeContext, ValidationError, LIMITS };
