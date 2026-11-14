/* AGRI-AI · backend mínimo de AGRI-ORBIT (Node ≥ 18, sin dependencias)
   POST /api/agri-ai/chat    { messages, context, lang, questionLang } → { reply }
   GET  /api/agri-ai/health  → { ok, configured, provider, model }
   Opcional (SERVE_STATIC=1): sirve la web estática de AGRI-ORBIT en el mismo origen. */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { loadDotEnv, getConfig } = require('./lib/config');
const { createRateLimiter } = require('./lib/rateLimit');
const { validateChatBody, ValidationError } = require('./lib/validate');
const { buildMessages } = require('./lib/prompt');
const { chatCompletion } = require('./lib/provider');

const MIME = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8', '.webp':'image/webp', '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.md':'text/plain; charset=utf-8' };

function createServer(cfg = getConfig(), deps = {}){
  const limiter = createRateLimiter({ max: cfg.rateMax, windowMs: cfg.rateWindowMs });
  const complete = deps.chatCompletion || chatCompletion;
  const log = deps.log || ((...a) => console.log(new Date().toISOString(), ...a));

  const security = res => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  };
  const json = (res, status, obj, extra = {}) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra });
    res.end(JSON.stringify(obj));
  };
  const cors = (req, res) => {
    const o = req.headers.origin;
    if (!o) return true;                                   // misma página / herramientas sin Origin
    const host = req.headers.host;
    const same = host && (o === 'http://' + host || o === 'https://' + host);
    if (same || cfg.allowedOrigins.includes(o) || cfg.allowedOrigins.includes('*')) {
      res.setHeader('Access-Control-Allow-Origin', o);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
      res.setHeader('Access-Control-Max-Age', '600');
      return true;
    }
    return false;
  };
  const clientIp = req => (cfg.trustProxy && String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || req.socket.remoteAddress || 'unknown';

  const readBody = req => new Promise((resolve, reject) => {
    const len = +req.headers['content-length'] || 0;
    if (len > cfg.maxBodyBytes) { const e = new Error('Payload too large'); e.status = 413; return reject(e); }
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > cfg.maxBodyBytes) { const e = new Error('Payload too large'); e.status = 413; req.destroy(); reject(e); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });

  async function handleChat(req, res){
    const ip = clientIp(req);
    const rl = limiter.check(ip);
    res.setHeader('X-RateLimit-Remaining', String(rl.remaining));
    if (!rl.ok) return json(res, 429, { error: 'Too many requests' }, { 'Retry-After': String(rl.retryAfterS) });
    if (!/^application\/json/i.test(req.headers['content-type'] || '')) return json(res, 415, { error: 'Content-Type must be application/json' });
    let raw;
    try { raw = await readBody(req); } catch (e) { return json(res, e.status || 400, { error: e.status === 413 ? 'Payload too large' : 'Bad request' }); }
    let body;
    try { body = JSON.parse(raw); } catch (e) { return json(res, 400, { error: 'Invalid JSON' }); }
    let input;
    try { input = validateChatBody(body); } catch (e) { return json(res, e instanceof ValidationError ? 400 : 500, { error: e instanceof ValidationError ? e.message : 'Server error' }); }
    if (!cfg.apiKey) return json(res, 503, { error: 'AI provider not configured' });
    const t0 = Date.now();
    try {
      const reply = await complete(cfg, buildMessages(input));
      log('chat ok', { ms: Date.now() - t0, lang: input.lang, turns: input.messages.length });
      return json(res, 200, { reply, model: cfg.model });
    } catch (e) {
      const st = [429, 502, 503, 504].includes(e && e.status) ? e.status : 502;
      log('chat error', { status: st, msg: e && e.message });      // nunca se registran claves ni contenido
      return json(res, st, { error: st === 504 ? 'AI provider timed out' : st === 429 ? 'AI provider busy, try again later' : st === 503 ? 'AI provider not configured' : 'AI provider error' });
    }
  }

  function serveStatic(req, res, pathname){
    if (!cfg.serveStatic || (req.method !== 'GET' && req.method !== 'HEAD')) return json(res, 404, { error: 'Not found' });
    let rel;
    try { rel = decodeURIComponent(pathname); } catch (e) { return json(res, 400, { error: 'Bad request' }); }
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.resolve(cfg.staticRoot, '.' + path.posix.normalize(rel));
    const relToRoot = path.relative(cfg.staticRoot, file);
    const parts = relToRoot.split(path.sep);
    if (relToRoot.startsWith('..') || path.isAbsolute(relToRoot) || parts[0] === 'server' || parts[0] === 'tests' || parts.some(p => p.startsWith('.'))) return json(res, 404, { error: 'Not found' });
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) return json(res, 404, { error: 'Not found' });
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Content-Length': st.size, 'Cache-Control': 'no-cache' });
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(file).pipe(res);
    });
  }

  const server = http.createServer(async (req, res) => {
    security(res);
    let url;
    try { url = new URL(req.url, 'http://localhost'); } catch (e) { return json(res, 400, { error: 'Bad request' }); }
    const p = url.pathname;
    if (p.startsWith('/api/agri-ai')) {
      if (!cors(req, res)) return json(res, 403, { error: 'Origin not allowed' });
      if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
      if (p === '/api/agri-ai/health' && req.method === 'GET')
        return json(res, 200, { ok: true, configured: !!cfg.apiKey, provider: 'openai-compatible', model: cfg.apiKey ? cfg.model : null });
      if (p === '/api/agri-ai/chat' && req.method === 'POST') return handleChat(req, res);
      return json(res, 404, { error: 'Not found' });
    }
    return serveStatic(req, res, p);
  });
  server.requestTimeout = cfg.upstreamTimeoutMs + 15000;
  server.on('close', () => limiter.stop());
  return server;
}

if (require.main === module) {
  loadDotEnv(path.join(__dirname, '.env'));
  const cfg = getConfig();
  createServer(cfg).listen(cfg.port, () => {
    console.log(`AGRI-AI backend on http://localhost:${cfg.port} · provider ${cfg.apiKey ? 'configured (' + cfg.model + ')' : 'NOT configured (set OPENAI_API_KEY)'} · static ${cfg.serveStatic ? 'on' : 'off'}`);
  });
}

module.exports = { createServer };
