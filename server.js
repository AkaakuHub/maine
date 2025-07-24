const { createServer } = require('node:https');
const { parse } = require('node:url');
const next = require('next');
const fs = require('node:fs');
const path = require('node:path');

const port = process.env.PORT || 3000;
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// SSL証明書のパス
const keyPath = path.join(__dirname, 'localhost-key.pem');
const certPath = path.join(__dirname, 'localhost.pem');

// 証明書ファイルの存在確認
if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
  console.error('❌ SSL証明書が見つかりません！');
  console.error('📋 以下の手順で証明書を生成してください：');
  console.error('');
  console.error('macOS/Linux:');
  console.error('  brew install mkcert');
  console.error('  mkcert -install');
  console.error('  mkcert localhost 127.0.0.1 ::1');
  console.error('');
  console.error('Windows:');
  console.error('  choco install mkcert (または scoop install mkcert)');
  console.error('  mkcert -install');
  console.error('  mkcert localhost 127.0.0.1 ::1');
  console.error('');
  console.error('証明書生成後、再度 pnpm start を実行してください。');
  process.exit(1);
}

const httpsOptions = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath),
};

app.prepare().then(() => {
  createServer(httpsOptions, (req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on https://localhost:${port}`);
  });
});