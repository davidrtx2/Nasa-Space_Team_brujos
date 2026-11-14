/* AGRI-AI · proveedor de modelos compatible con la API de OpenAI (Chat Completions).
   Funciona con OpenAI y con proveedores compatibles (Azure OpenAI vía proxy, Groq,
   OpenRouter, Together, Ollama…) cambiando OPENAI_BASE_URL y OPENAI_MODEL. */
'use strict';

class ProviderError extends Error { constructor(status, msg){ super(msg); this.status = status; } }

async function chatCompletion(cfg, messages){
  if (!cfg.apiKey) throw new ProviderError(503, 'AI provider not configured');
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), cfg.upstreamTimeoutMs);
  let r;
  try {
    r = await fetch(cfg.baseUrl + '/chat/completions', {
      method: 'POST', signal: ctl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + cfg.apiKey },
      body: JSON.stringify({ model: cfg.model, messages, temperature: 0.3, max_tokens: cfg.maxOutputTokens })
    });
  } catch (e) {
    clearTimeout(to);
    if (e && e.name === 'AbortError') throw new ProviderError(504, 'AI provider timed out');
    throw new ProviderError(502, 'AI provider unreachable');
  }
  try {
    const j = await r.json().catch(() => null);
    if (!r.ok) {
      if (r.status === 429) throw new ProviderError(429, 'AI provider rate limit');
      throw new ProviderError(502, 'AI provider error (' + r.status + ')');
    }
    const text = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
    if (typeof text !== 'string' || !text.trim()) throw new ProviderError(502, 'Empty AI response');
    return text.trim();
  } catch (e) {
    if (e && e.name === 'AbortError') throw new ProviderError(504, 'AI provider timed out');
    throw e;
  } finally { clearTimeout(to); }
}

module.exports = { chatCompletion, ProviderError };
