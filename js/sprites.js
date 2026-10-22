'use strict';
// 스프라이트(그림 프레임) 동작: 힉스필드 등으로 만든 달리기 시트를 dev/slice.html 로 잘라 넣으면, 해당 캐릭터·동작만 그림으로 그린다.
// 이미지/데이터가 없으면 아무 일도 안 하고 기존 벡터 캐릭터가 그려진다. 데이터는 js/sprites_data.js (slice.html 이 자동으로 기록).
//
// LF.SPRITES['cony_run'] = { src, n, w, h, fx, fy, ref, cycle, size, flip }
//   src: 가로로 이어 붙인 프레임 PNG / n: 프레임 수 / w,h: 한 프레임 크기(px) / fx,fy: 발 중심(땅에 닿는 점) / ref: 캐릭터 키(px)
//   cycle: 한 주기(초, 속도 14 기준) / size: 크기 보정(1=기본) / 그림은 오른쪽을 보고 있다고 가정
LF.sprites = {
  base: '', imgs: {},
  // 캐릭터 키(리그 단위, 귀 포함). 게임에서 s(=128 등)를 곱한 높이로 그린다.
  H: { cony: 1.19, brown: 1.04 },
  get(kind, anim) {
    const d = LF.SPRITES && LF.SPRITES[kind + '_' + anim];
    if (!d) return null;
    let im = this.imgs[d.src];
    if (!im) { im = this.imgs[d.src] = new Image(); im.src = this.base + d.src + '?v=' + (d.v || 0); }
    return im.complete && im.naturalWidth ? { d, im } : null;
  },
  // 클립 시간(A.ph)으로 프레임을 고른다
  frame(A, d) { const ph = A.ph || 0, u = ((ph % d.cycle) + d.cycle) % d.cycle / d.cycle; return Math.min(d.n - 1, Math.floor(u * d.n)); },
};

// 그렸으면 true. LF.drawActor 맨 앞에서 호출된다.
LF.drawSprite = (c, A, x, y, s, o = {}) => {
  const sp = LF.sprites.get(A.kind, A.anim);
  if (!sp) return false;
  const d = sp.d, dir = o.dir != null ? o.dir : A.dir, k = s * LF.sprites.H[A.kind] * (d.size || 1) / d.ref, i = LF.sprites.frame(A, d);
  const imp = A.imp || 0; // 착지 충격: 발을 기준으로 눌림
  c.save();
  c.translate(x, y);
  if (o.alpha != null) c.globalAlpha *= o.alpha;
  c.scale(dir, 1);
  if (o.rot) { c.translate(0, -.45 * s); c.rotate(o.rot * dir); c.translate(0, .45 * s); }
  if (imp) c.scale(1 + .12 * imp, 1 - .2 * imp);
  c.drawImage(sp.im, i * d.w, 0, d.w, d.h, -d.fx * k, -d.fy * k, d.w * k, d.h * k);
  c.restore();
  return true;
};
