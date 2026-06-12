// Smoke test. If /api/hello returns "ok" your function setup is working.
// If it 404s, the api/ folder isn't being deployed.
export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    at: new Date().toISOString(),
    msg: 'Serverless functions are working.'
  });
}
