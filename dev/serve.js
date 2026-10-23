// 개발용 정적 서버 (python이 없는 PC에서도 실행). 사용: node dev/serve.js [포트]
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const port = Number(process.argv[2]) || 8123;
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.webmanifest': 'application/manifest+json',
};
http.createServer((req, res) => {
  // 개발 도구용: POST /__save?name=파일명 → dev/out/ 에 저장 (프레임 시트 등 분석 결과 확인용)
  // 저장 가능한 곳: dev/out(분석 결과), assets/sprites(스프라이트 PNG), js/sprites_data.js(스프라이트 목록) 만 허용
  const SAVE = { 'dev/out': /.*/, 'assets/sprites': /\.png$/i, 'js': /^(sprites_data|voice_data)\.js$/ };
  if (req.method === 'POST' && req.url.startsWith('/__save')) {
    const q = new URL(req.url, 'http://x').searchParams, dir = q.get('dir') || 'dev/out', name = path.basename(decodeURIComponent(q.get('name') || 'out.bin'));
    if (!SAVE[dir] || !SAVE[dir].test(name)) { res.writeHead(403); return res.end('not allowed'); }
    const chunks = []; req.on('data', d => chunks.push(d));
    req.on('end', () => { fs.mkdirSync(path.join(root, dir), { recursive: true }); fs.writeFileSync(path.join(root, dir, name), Buffer.concat(chunks)); res.writeHead(200); res.end('ok'); });
    return;
  }
  // GET /__list?dir=동영상 → 그 폴더의 이미지 파일 이름 목록 (slice.html 이 사용). 프로젝트 안의 폴더만.
  if (req.method === 'GET' && req.url.startsWith('/__list')) {
    const dir = path.join(root, new URL(req.url, 'http://x').searchParams.get('dir') || '');
    let out = [];
    if (dir.startsWith(root)) { try { out = fs.readdirSync(dir).filter(n => /\.(png|jpe?g|webp|mp4|webm|mov)$/i.test(n)); } catch (e) { } }
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' }); return res.end(JSON.stringify(out));
  }
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.join(root, p);
  if (!file.startsWith(root)) { res.writeHead(403); return res.end('forbidden'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    const head = { 'Content-Type': types[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store', 'Accept-Ranges': 'bytes' };
    const m = /^bytes=(\d*)-(\d*)/.exec(req.headers.range || ''); // 영상 탐색(seek)에 Range 응답이 필요
    if (m) {
      const start = m[1] ? +m[1] : Math.max(0, data.length - +m[2]), end = m[1] && m[2] ? Math.min(+m[2], data.length - 1) : data.length - 1;
      res.writeHead(206, { ...head, 'Content-Range': `bytes ${start}-${end}/${data.length}`, 'Content-Length': end - start + 1 });
      return res.end(data.subarray(start, end + 1));
    }
    res.writeHead(200, { ...head, 'Content-Length': data.length });
    res.end(data);
  });
}).listen(port, () => console.log(`http://localhost:${port}`));
