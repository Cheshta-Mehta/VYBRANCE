'use strict';
// VYBRANCE SMS relay. Receives alert METADATA only (no audio), sends one SMS via a provider.
const http = require('http'), crypto = require('crypto');
const E = process.env, PORT = +E.PORT || 8787, KEY = E.API_KEY || '', ORIGIN = E.ALLOWED_ORIGIN || '*';
const PROV = E.PROVIDER || 'mock', MAXH = +E.MAX_PER_HOUR || 10, CD = (+E.COOLDOWN_SEC || 300) * 1000;
const TW = E.TWILIO_BASE || 'https://api.twilio.com';
if (KEY.length < 16) { console.error('API_KEY must be set (16+ characters).'); process.exit(1); }
if (PROV === 'twilio' && !(E.TWILIO_SID && E.TWILIO_TOKEN && E.TWILIO_FROM && E.ALERT_TO)) {
  console.error('PROVIDER=twilio needs TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM, ALERT_TO.'); process.exit(1); }
const SEV = ['Informational', 'Warning', 'High Risk', 'Critical', 'Test'];
const sent = [], last = new Map();
const clean = (s, n) => String(s ?? '').replace(/[^\x20-\x7E]/g, '').slice(0, n);
const same = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const out = (res, c, o) => { res.writeHead(c, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': ORIGIN,
  'Access-Control-Allow-Headers': 'content-type,x-api-key', 'Access-Control-Allow-Methods': 'POST,GET,OPTIONS' }); res.end(JSON.stringify(o)); };
async function send(text) {
  if (PROV === 'mock') { console.log('[mock SMS, nothing sent]', text); return { status: 'mock: no SMS was sent' }; }
  const r = await fetch(`${TW}/2010-04-01/Accounts/${E.TWILIO_SID}/Messages.json`, { method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(E.TWILIO_SID + ':' + E.TWILIO_TOKEN).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ To: E.ALERT_TO, From: E.TWILIO_FROM, Body: text }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('Twilio HTTP ' + r.status + (j.message ? ': ' + clean(j.message, 120) : ''));
  return { status: 'accepted by Twilio (' + (j.status || 'queued') + ', delivery not confirmed)', detail: j.sid };
}
http.createServer((req, res) => {
  if (req.method === 'OPTIONS') return out(res, 204, {});
  if (req.url === '/health') return out(res, 200, { ok: true, provider: PROV });
  if (req.method !== 'POST' || req.url !== '/api/alert') return out(res, 404, { error: 'not found' });
  if (!same(String(req.headers['x-api-key'] || ''), KEY)) return out(res, 401, { error: 'bad API key' });
  let body = '', big = false;
  req.on('data', c => { body += c; if (body.length > 4096) { big = true; req.destroy(); } });
  req.on('end', async () => {
    if (big) return;
    let d; try { d = JSON.parse(body); } catch { return out(res, 400, { error: 'invalid JSON' }); }
    const lv = SEV.indexOf(d.severity), score = Number(d.score);
    if (lv < 0 || !(score >= 0 && score <= 100)) return out(res, 400, { error: 'invalid severity or score' });
    const kind = clean(d.kind, 80), asset = clean(d.asset, 60);
    if (!kind || !asset) return out(res, 400, { error: 'kind and asset are required' });
    const now = Date.now(); while (sent.length && now - sent[0] > 3600000) sent.shift();
    if (sent.length >= MAXH) return out(res, 429, { error: 'hourly SMS limit reached' });
    const k = asset + '|' + kind, p = last.get(k);
    if (d.severity !== 'Test' && p && now - p.t < CD && lv <= p.lv) return out(res, 429, { error: 'cooldown: same alert already sent' });
    const text = `VYBRANCE ${d.severity}: ${kind} on ${asset}, score ${Math.round(score)}.${d.demo ? ' [DEMO]' : ''} Prototype alert, check on site.`;
    try { const r = await send(text); sent.push(now); last.set(k, { t: now, lv }); out(res, 200, r); }
    catch (e) { console.error('send failed:', e.message); out(res, 502, { error: e.message }); }
  });
}).listen(PORT, () => console.log(`SMS relay on :${PORT}, provider=${PROV}`));
