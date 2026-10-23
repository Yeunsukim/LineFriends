// 배포용 파일만 www/ 로 복사한다. (dev/, 동영상/, 참고 영상 등은 제외)
//  - 웹(PWA)으로 올릴 때: www/ 폴더 전체를 호스팅에 올린다.
//  - 앱(Capacitor)은 www/ 를 android/ 로 복사해 감싼다 (npx cap sync).
// 사용: node scripts/build-www.js
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = path.resolve(__dirname, '..'), out = path.join(root, 'www');
const items = ['index.html', 'manifest.webmanifest', 'sw.js', 'css', 'js', 'vendor', 'fonts', 'icons', 'assets'];

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
let n = 0, bytes = 0; const hash = crypto.createHash('sha1');
function copy(src, dst) {
  const st = fs.statSync(src);
  if (st.isDirectory()) { fs.mkdirSync(dst, { recursive: true }); for (const f of fs.readdirSync(src).sort()) copy(path.join(src, f), path.join(dst, f)); }
  else { fs.copyFileSync(src, dst); n++; bytes += st.size; if (!src.endsWith('sw.js')) hash.update(path.relative(root, src)).update(fs.readFileSync(src)); }
}
for (const it of items) { const s = path.join(root, it); if (fs.existsSync(s)) copy(s, path.join(out, it)); }
// 서비스 워커의 캐시 이름에 파일 내용 해시를 넣는다 → 게임이 바뀌면 사용자 기기의 옛 캐시가 자동으로 교체됨
const swFile = path.join(out, 'sw.js'), build = hash.digest('hex').slice(0, 10);
fs.writeFileSync(swFile, fs.readFileSync(swFile, 'utf8').split('__BUILD__').join(build));
console.log(`www/ 준비 완료: 파일 ${n}개, ${(bytes / 1024 / 1024).toFixed(1)}MB (캐시 버전 ${build})`);
