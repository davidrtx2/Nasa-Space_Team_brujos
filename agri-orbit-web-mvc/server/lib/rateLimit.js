/* AGRI-AI · límite de solicitudes por IP (ventana fija, en memoria) */
'use strict';
function createRateLimiter({ max, windowMs }){
  const hits = new Map();
  const sweep = setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (v.reset <= now) hits.delete(k); }, windowMs);
  if (sweep.unref) sweep.unref();
  return {
    check(key){
      const now = Date.now();
      let h = hits.get(key);
      if (!h || h.reset <= now) { h = { n: 0, reset: now + windowMs }; hits.set(key, h); }
      h.n++;
      return { ok: h.n <= max, remaining: Math.max(0, max - h.n), retryAfterS: Math.ceil((h.reset - now) / 1000) };
    },
    stop(){ clearInterval(sweep); }
  };
}
module.exports = { createRateLimiter };
