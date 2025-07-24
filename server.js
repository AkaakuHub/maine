const { createServer } = require('node:https');
const { parse } = require('node:url');
const next = require('next');
const fs = require('node:fs');
const path = require('node:path');

const port = process.env.PORT || 3000;
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// SSL証明書のパス（複数のファイル名パターンに対応）
const possibleKeyFiles = [
  'localhost-key.pem',
  'localhost+2-key.pem',
  'localhost+1-key.pem'
];
const possibleCertFiles = [
  'localhost.pem',
  'localhost+2.pem', 
  'localhost+1.pem'
];

let keyPath = null;
let certPath = null;

// 存在する証明書ファイルを検索
for (const keyFile of possibleKeyFiles) {
  const fullKeyPath = path.join(__dirname, keyFile);
  if (fs.existsSync(fullKeyPath)) {
    keyPath = fullKeyPath;
    break;
  }
}

for (const certFile of possibleCertFiles) {
  const fullCertPath = path.join(__dirname, certFile);
  if (fs.existsSync(fullCertPath)) {
    certPath = fullCertPath;
    break;
  }
}

// 証明書ファイルの存在確認
if (!keyPath || !certPath) {
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