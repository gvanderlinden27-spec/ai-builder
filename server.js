const http = require('http');
const fs   = require('fs');
const path = require('path');
const url  = require('url');

// Load .env.local
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && v.length) process.env[k.trim()] = v.join('=').trim();
  });
}

const handler = require('./api/roadmap');

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);

  if (parsed.pathname === '/api/roadmap') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try { req.body = body ? JSON.parse(body) : {}; } catch { req.body = {}; }
      res.json = (data) => {
        res.writeHead(res.statusCode || 200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      };
      res.status = (code) => { res.statusCode = code; return res; };
      handler(req, res).catch(err => {
        console.error(err);
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      });
    });
    return;
  }

  // Serve static HTML
  const file = parsed.pathname === '/' ? '/ai-builder-dashboard.html' : parsed.pathname;
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    const ext  = path.extname(filePath);
    const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript' }[ext] || 'text/plain';
    res.writeHead(200, { 'Content-Type': mime });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

const PORT = 3000;
server.listen(PORT, () => console.log(`Dev server running at http://localhost:${PORT}`));
