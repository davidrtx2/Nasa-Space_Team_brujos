/* AGRI-AI · configuración desde variables de entorno (y server/.env opcional) */
'use strict';
const fs = require('fs'), path = require('path');

function loadDotEnv(file){
  let txt; try { txt = fs.readFileSync(file, 'utf8'); } catch (e) { return; }
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith('#')) continue;
    if (process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

function getConfig(env = process.env){
  const int = (k, d) => { const v = parseInt(env[k], 10); return Number.isFinite(v) && v > 0 ? v : d; };
  return {
    port: int('PORT', 8787),
    apiKey: env.OPENAI_API_KEY || '',
    model: env.OPENAI_MODEL || 'gpt-4o-mini',
    baseUrl: (env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, ''),
    allowedOrigins: (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean),
    serveStatic: env.SERVE_STATIC !== '0',
    trustProxy: env.TRUST_PROXY === '1',
    rateMax: int('RATE_LIMIT_MAX', 20),
    rateWindowMs: int('RATE_LIMIT_WINDOW_MS', 60000),
    maxBodyBytes: int('MAX_BODY_BYTES', 65536),
    upstreamTimeoutMs: int('UPSTREAM_TIMEOUT_MS', 30000),
    maxOutputTokens: int('MAX_OUTPUT_TOKENS', 800),
    staticRoot: path.resolve(__dirname, '..', '..')
  };
}

module.exports = { loadDotEnv, getConfig };
