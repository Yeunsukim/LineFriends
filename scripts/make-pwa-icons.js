// resources/ 의 아이콘 원본으로 PWA(홈 화면) 아이콘을 만든다. 사용: node scripts/make-pwa-icons.js
// sharp는 @capacitor/assets 가 함께 설치한 것을 쓴다.
const sharp = require('sharp'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..'), res = path.join(root, 'resources'), out = path.join(root, 'icons');
fs.mkdirSync(out, { recursive: true });
(async () => {
  const png = (file, size) => sharp(path.join(res, file)).resize(size, size).png().toFile(path.join(out, `${size}-${file.replace('icon-', '').replace('.png', '')}.png`));
  // 일반 아이콘 (배경 + 캐릭터가 한 장)
  for (const size of [192, 512]) await sharp(path.join(res, 'icon-only.png')).resize(size, size).png().toFile(path.join(out, `icon-${size}.png`));
  // iOS 홈 화면 아이콘: 180x180, 투명 없이 꽉 채움 (iOS가 모서리를 둥글게 깎음)
  await sharp(path.join(res, 'icon-only.png')).resize(180, 180).flatten({ background: '#ffd9ea' }).png().toFile(path.join(out, 'apple-touch-icon.png'));
  // 마스커블: 안드로이드가 원형·사각 등으로 잘라도 캐릭터가 남도록 배경 + 안전영역 안의 캐릭터를 합성
  const bg = await sharp(path.join(res, 'icon-background.png')).resize(512, 512).png().toBuffer();
  const fg = await sharp(path.join(res, 'icon-foreground.png')).resize(512, 512).png().toBuffer();
  await sharp(bg).composite([{ input: fg }]).png().toFile(path.join(out, 'icon-maskable-512.png'));
  console.log(fs.readdirSync(out).map(f => `${f} ${(fs.statSync(path.join(out, f)).size / 1024).toFixed(0)}KB`).join('\n'));
})();
