// Vercel Serverless Function: /api/r
// Purpose: capture the Referer header from the page that linked here,
// pull rider_id (and other useful params) out of that source URL,
// and redirect to the feedback form with those values attached.
//
// USAGE:
//   From your source app, link users to:
//     https://<your-vercel-domain>/api/r
//   The source page MUST allow full referrer (see notes at bottom).
//
// You can also append fallback params directly:
//     https://<your-vercel-domain>/api/r?rider_id=R123
//   These win if the Referer is missing or stripped.

export default function handler(req, res) {
  const referer = req.headers.referer || req.headers.referrer || '';
  const ua = req.headers['user-agent'] || '';
  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    '';

  // 1. Try to pull rider_id (+ friends) out of the Referer URL's query string
  let fromReferer = {};
  let refererHost = '';
  let refererPath = '';
  if (referer) {
    try {
      const u = new URL(referer);
      refererHost = u.hostname;
      refererPath = u.pathname;
      fromReferer = {
        rider_id:
          u.searchParams.get('rider_id') ||
          u.searchParams.get('riderId') ||
          u.searchParams.get('rid') ||
          '',
        order_count:
          u.searchParams.get('order_count') ||
          u.searchParams.get('orderCount') ||
          '',
        utm_source: u.searchParams.get('utm_source') || '',
        utm_medium: u.searchParams.get('utm_medium') || '',
        utm_campaign: u.searchParams.get('utm_campaign') || '',
      };
    } catch (_) {
      /* malformed referer — ignore */
    }
  }

  // 2. Allow direct query-string fallback on /api/r itself
  const direct = req.query || {};
  const pick = (k) => direct[k] || fromReferer[k] || '';

  const rider_id = pick('rider_id') || pick('riderId');
  const order_count = pick('order_count') || pick('orderCount');
  const utm_source = pick('utm_source');
  const utm_medium = pick('utm_medium');
  const utm_campaign = pick('utm_campaign');

  // 3. Server-side log — visible in Vercel → Logs. Useful for debugging
  //    whether the Referer is actually arriving with query params attached.
  console.log(
    JSON.stringify({
      at: new Date().toISOString(),
      event: 'redirect_hit',
      referer,
      refererHost,
      refererPath,
      rider_id,
      order_count,
      utm_source,
      utm_medium,
      utm_campaign,
      ua,
      ip,
    })
  );

  // 4. Build the redirect target — the existing form page.
  //    Must match a route that exists in vercel.json (or a real file).
  //    For the rider-banner project, /rider-banner is rewritten to /index.html.
  const target = new URL('https://' + (req.headers.host || 'localhost') + '/rider-banner');
  if (rider_id) target.searchParams.set('rider_id', rider_id);
  if (order_count) target.searchParams.set('order_count', order_count);
  if (utm_source) target.searchParams.set('utm_source', utm_source);
  if (utm_medium) target.searchParams.set('utm_medium', utm_medium);
  if (utm_campaign) target.searchParams.set('utm_campaign', utm_campaign);
  // Also pass the raw referer through so the form / sheet can store it
  if (referer) target.searchParams.set('src_url', referer);

  res.setHeader('Cache-Control', 'no-store');
  res.writeHead(302, { Location: target.pathname + target.search });
  res.end();
}
