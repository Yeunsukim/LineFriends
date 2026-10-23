// 오프라인 캐시 (PWA).
// 방식: "캐시를 먼저 보여 주고, 뒤에서 새 파일을 받아 캐시를 갱신" (stale-while-revalidate)
//  → 인터넷이 없어도 실행되고, 게임을 고쳐서 다시 올리면 다음 실행 때 새 버전이 보인다.
// 저장소 루트를 그대로 배포(GitHub Pages)해도, www/ 를 배포해도 동작하도록 캐시 이름이 없어도 되게 했다.
// (scripts/build-www.js 로 www/ 를 만들면 아래 이름의 __BUILD__ 가 파일 해시로 바뀌어, 옛 캐시가 통째로 교체되기도 한다.)
const CACHE = 'loverun-__BUILD__';
const FILES = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css', 'vendor/three.min.js', 'fonts/Jua.ttf',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png',
  'js/core.js', 'js/chars.js', 'js/anim.js', 'js/sprites.js', 'js/sprites_data.js', 'js/engine.js', 'js/audio.js',
  'js/voice_data.js', 'js/world.js', 'js/world3d.js', 'js/data.js', 'js/run.js', 'js/mini.js', 'js/screens.js', 'js/main.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('loverun-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const hit = await cache.match(req, { ignoreSearch: true });
    // 뒤에서 최신 파일을 받아 캐시에 덮어쓴다 (브라우저 HTTP 캐시를 거치지 않게 no-cache). 실패(오프라인)는 무시.
    const refresh = fetch(req, { cache: 'no-cache' }).then(res => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
    if (hit) { e.waitUntil(refresh); return hit; }
    return (await refresh) || Response.error();
  }));
});
