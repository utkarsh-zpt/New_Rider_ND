// Vercel Serverless Function: /api/debug
//
// PURPOSE
// Open this URL from wherever you're trying to capture rider_id from
// (the rider-app banner, the webview, a WhatsApp link, etc.) and it will
// render a page showing every piece of data the server can see:
//   • Full Referer header (if any) — this is the "source URL"
//   • All request headers
//   • All query string params on this request
//   • User-Agent (tells you what app/browser is opening the link)
//   • Client IP
//
// HOW TO USE
// 1. Deploy this file to Vercel (drop it into /api/).
// 2. From your source app, navigate to:
//      https://banner-feedback.vercel.app/api/debug
//    (Just replace the banner link temporarily, or add a test banner.)
// 3. Take a screenshot of what loads. That tells us exactly what's
//    available, and we can decide how to extract rider_id from it.
// 4. Everything also lands in Vercel → Project → Logs → Runtime Logs
//    as a single JSON line, so you can compare hits across users.

export default function handler(req, res) {
  const referer = req.headers.referer || req.headers.referrer || '';
  const ua      = req.headers['user-agent'] || '';
  const ip      = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
                  || req.socket?.remoteAddress || '';

  // Try to parse the referer URL for query params (where rider_id might live)
  let refererParsed = null;
  if (referer) {
    try {
      const u = new URL(referer);
      refererParsed = {
        href:     u.href,
        origin:   u.origin,
        host:     u.hostname,
        path:     u.pathname,
        query:    Object.fromEntries(u.searchParams.entries()),
      };
    } catch (e) {
      refererParsed = { error: 'Could not parse referer: ' + e.message };
    }
  }

  const snapshot = {
    at: new Date().toISOString(),
    url_on_this_request: {
      path:  req.url,
      query: req.query,
    },
    referer_raw: referer || '(empty — no Referer header sent)',
    referer_parsed: refererParsed,
    user_agent: ua,
    client_ip: ip,
    all_headers: req.headers,
  };

  // Log so you can also see it in Vercel Logs
  console.log('DEBUG_HIT ' + JSON.stringify(snapshot));

  // Render a readable HTML page on screen
  const esc = (s) => String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  const html = `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Source URL Debug</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; margin: 0; padding: 16px; background: #0F1115; color: #E5E7EB; line-height: 1.5; }
  h1 { font-size: 18px; margin: 0 0 12px; color: #fff; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .08em; color: #9CA3AF; margin: 20px 0 6px; }
  .card { background: #1A1D24; border: 1px solid #2A2F3A; border-radius: 8px; padding: 12px 14px; margin-bottom: 4px; }
  .key { color: #A78BFA; font-weight: 600; }
  .val { color: #FCD34D; word-break: break-all; }
  .empty { color: #6B7280; font-style: italic; }
  pre { margin: 0; white-space: pre-wrap; word-break: break-all; font-size: 12px; font-family: ui-monospace, 'SF Mono', Menlo, monospace; }
  .pill { display: inline-block; padding: 2px 8px; background: #2A2F3A; border-radius: 4px; font-size: 11px; color: #9CA3AF; margin-bottom: 8px; }
</style></head>
<body>
  <div class="pill">${esc(snapshot.at)}</div>
  <h1>🔍 Source URL Debug</h1>

  <h2>Referer (the "source URL")</h2>
  <div class="card">
    ${referer
      ? `<pre>${esc(referer)}</pre>`
      : `<span class="empty">(empty — the source app did not send a Referer header. This is common for in-app webviews, SMS, push deeplinks.)</span>`}
  </div>

  ${refererParsed && !refererParsed.error ? `
  <h2>Referer broken down</h2>
  <div class="card">
    <pre><span class="key">host:</span>  <span class="val">${esc(refererParsed.host)}</span>
<span class="key">path:</span>  <span class="val">${esc(refererParsed.path)}</span>
<span class="key">query:</span> <span class="val">${esc(JSON.stringify(refererParsed.query, null, 2))}</span></pre>
  </div>` : ''}

  <h2>Query params on THIS URL</h2>
  <div class="card"><pre>${esc(JSON.stringify(req.query, null, 2))}</pre></div>

  <h2>User-Agent (which app opened this)</h2>
  <div class="card"><pre>${esc(ua) || '<span class="empty">(empty)</span>'}</pre></div>

  <h2>Client IP</h2>
  <div class="card"><pre>${esc(ip) || '<span class="empty">(empty)</span>'}</pre></div>

  <h2>All request headers</h2>
  <div class="card"><pre>${esc(JSON.stringify(req.headers, null, 2))}</pre></div>

  <h2>What this means</h2>
  <div class="card" style="background:#1A2330; border-color:#3B5170;">
    <p style="margin:0 0 8px"><b>If "Referer" is empty:</b> the source (rider-app webview / push / SMS) is not sending it. You won't be able to read rider_id from the source URL — it must be passed as a query param on the banner link itself, e.g. <code>?rider_id=R123</code>.</p>
    <p style="margin:0"><b>If "Referer" is present but has no rider_id in the query:</b> the source page knows the rider but isn't putting rider_id in its own URL. You'll need to ask the source to either add it to the banner link directly, or to its own URL with referrer-policy unsafe-url.</p>
  </div>
</body></html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(html);
}
