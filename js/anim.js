'use strict';
// 동작 클립 모음 (키프레임). chars.js의 LF.sampleClip / LF.mirrorPose / ANIM 을 사용한다. 단위는 30fps 프레임.
// 근거: 참고 영상 5개(동영상/) + 사용자가 만든 스티커 시트 PNG 2장. 영상에 없는 동작(슬라이드·춤)은 애니메이션 원칙으로 만들었다.
// 규칙: 짧은 팔은 큰 머리에 가려진다 → 옆모습에서 ≲1.95, 정면에서 ≲2.45rad 까지만 보임. 정면에서 elbF는 안쪽(가슴·얼굴 쪽)으로 접힌다.
{
  const K = (f, o) => Object.assign({ f }, o);
  const PRO = { side: .9, faceX: .1 }; // 옆모습(진행 방향) 기본
  const reg = (name, clip) => { LF[name.toUpperCase()] = clip; ANIM[name] = clip; };

  // ---------- 걷기 (반복, 3/4 옆모습) ----------
  // 브라운이 뒤뚱뒤뚱 걸어 나가는 장면(사랑 배틀 4.9~5.5초)과 손잡고 걷는 시트: 무릎을 구부린 채 한 발씩, 몸이 살짝 앞으로 기울고 팔은 작게 엇갈려 흔든다.
  const W_A = K(4, { side: .6, faceX: .06, lean: .1, bob: .012, sy: .98, sx: 1.02, headRot: -.03, legF: .5, kneeF: .12, legB: -.4, kneeB: .3, armF: -.3, armB: .35, elbF: .35, elbB: .35 });
  const W_B = K(4, { side: .6, faceX: .06, lean: .12, bob: -.025, sy: 1.01, sx: 1, headRot: .02, legF: .05, kneeF: .1, legB: -.15, kneeB: 1.0, armF: 0, armB: 0, elbF: .35, elbB: .35 });
  reg('walk', { fps: 30, blend: .6, xfade: .12, keys: [W_A, W_B, LF.mirrorPose(W_A), LF.mirrorPose(W_B)] });

  // ---------- 슬라이드 (한 번 재생 후 낮은 자세 유지) ----------  (참고 영상 없음: 원칙으로 제작)
  // 몸을 확 낮추며 뒤로 젖히고 다리는 앞으로 쭉 뻗어 미끄러진다. 팔은 균형을 잡듯 앞으로.
  reg('slide', { fps: 30, blend: .6, xfade: .05, once: true, keys: [
    K(2, Object.assign({ lean: .35, bob: .06, sy: .82, sx: 1.12, headSy: .96, legF: 1.2, kneeF: .1, legB: .6, kneeB: .5, armF: 1.0, armB: .6, eyes: 'squint', mouth: 'grin' }, PRO)),
    K(8, Object.assign({ lean: -.3, bob: .12, sy: .72, sx: 1.18, headRot: -.08, legF: 1.4, kneeF: 0, legB: 1.25, kneeB: .15, armF: 1.5, armB: 1.2, elbF: .15, elbB: .15, eyes: 'squint', mouth: 'grin' }, PRO)),
  ] });

  // ---------- 피격 (한 번 재생: 충격 → 떨림 → 어지러운 상태 유지) ----------
  // 사랑 배틀(브라운이 하트에 맞고 휘청)·러닝 영상 끝(코니가 충격받아 몸이 늘어나고 입을 크게 벌림, 머리 위로 충격선)·시트(땀 흘리며 쓰러진 브라운)를 참고.
  const HR = { side: 0, armF: 2.3, elbF: .9, armB: -2.3, elbB: .9, eyes: 'squint', mouth: 'wavy', sweat: 2 };
  reg('hurt', { fps: 30, blend: .5, xfade: .04, once: true, keys: [
    K(2, Object.assign({}, HR, { lean: -.3, bob: .02, sy: .9, sx: 1.1, headSy: .88, headSx: 1.08, headRot: -.2 })),
    K(2, Object.assign({}, HR, { lean: -.15, bob: -.03, sy: 1.1, sx: .92, headSy: 1.06, headY: -.03, headRot: -.06, mouth: 'shout', shock: 1 })),
    K(1, Object.assign({}, HR, { lean: -.1, sy: 1.06, sx: .95, roll: .04, headRot: .05, mouth: 'shout', shock: 1 })),
    K(1, Object.assign({}, HR, { lean: -.1, sy: 1.06, sx: .95, roll: -.04, headRot: -.05, mouth: 'shout', shock: 1 })),
    K(1, Object.assign({}, HR, { lean: -.1, sy: 1.05, sx: .96, roll: .035, headRot: .05, mouth: 'shout', shock: .8 })),
    K(1, Object.assign({}, HR, { lean: -.1, sy: 1.05, sx: .96, roll: -.035, headRot: -.05, mouth: 'shout', shock: .8 })),
    K(10, Object.assign({}, HR, { lean: -.06, sy: 1, sx: 1, headRot: .03, eyes: 'swirl', mouth: 'wavy', shock: 0, armF: 1.7, armB: -1.7, elbF: .7, elbB: .7 })),
  ] });

  // ---------- 부끄러움 (반복, 정면) ----------
  // 시트: 손을 턱·볼에 모으고 눈을 감고 웃으며 볼이 붉어진다. 러닝 영상(체중계): 볼을 감싼 손. 몸을 배배 꼬며 고개를 좌우로 갸웃, 가끔 콩 뛴다.
  const SH = { armTop: 1, armF: -2.3, armB: -2.3, eyes: 'closed', mouth: 'grin', blush: 1 };
  reg('shy', { fps: 30, blend: 1, xfade: .12, keys: [
    K(9, Object.assign({}, SH, { roll: .05, headRot: .1, lean: .04, headY: .005 })),
    K(9, Object.assign({}, SH, { roll: 0, headRot: 0, bob: -.014, headY: -.005 })),
    K(9, Object.assign({}, SH, { roll: -.05, headRot: -.1, lean: -.04, headY: .005 })),
    K(9, Object.assign({}, SH, { roll: 0, headRot: 0, bob: -.014, headY: -.005 })),
  ] });

  // ---------- 뽀뽀 (반복, 마주 보는 옆모습) ----------
  // 시트: 몸을 앞으로 기울여 눈을 감고 입을 모아 볼에 입맞춤, 고개가 서로를 향해 기울고 한쪽 발끝이 살짝 든다. 하트는 게임 이펙트가 담당.
  const KS = Object.assign({ eyes: 'closed', mouth: 'kiss3', blush: 1, armF: .1, elbF: 0, armB: .06, elbB: 0, legF: .1, legB: -.15 }, PRO, { faceX: .18 });
  reg('kiss', { fps: 30, blend: 1, xfade: .15, keys: [
    K(12, Object.assign({}, KS, { lean: .22, headRot: .18, sy: 1, bob: 0 })),
    K(12, Object.assign({}, KS, { lean: .27, headRot: .23, sy: 1.02, sx: .99, bob: -.012, liftB: .18 })),
  ] });

  // ---------- 슬픔 (반복, 정면) ----------
  // 러닝 영상(체중계) 5.0초 전후: 머리가 어깨 쪽으로 푹 가라앉고 눈썹이 처지며 눈물이 맺힌다. 두 손은 볼 옆. 흐느끼듯 '움찔'.
  const SD = { side: 0, eyes: 'sad', mouth: 'wavy', tears: 1, earDroop: .9, armF: 1.5, elbF: 1.4, armB: -1.5, elbB: 1.4, lean: .03 };
  reg('sad', { fps: 30, blend: .8, xfade: .15, keys: [
    K(10, Object.assign({}, SD, { headY: .035, headSy: .95, headRot: -.06, sy: .97, bob: .01 })),
    K(3, Object.assign({}, SD, { headY: .055, headSy: .93, headRot: -.05, sy: .955, bob: .016 })),
    K(10, Object.assign({}, SD, { headY: .035, headSy: .95, headRot: .05, sy: .97, bob: .01 })),
    K(3, Object.assign({}, SD, { headY: .055, headSy: .93, headRot: .04, sy: .955, bob: .016 })),
  ] });

  // ---------- 손 흔들기 (반복, 정면) ----------  (참고: 시트의 웃는 표정·팔 벌림 / 영상에 정확한 장면 없음)
  // 팔을 들고 아래팔(팔꿈치)만 좌우로 흔들며 고개를 갸웃, 몸이 살짝 흔들린다.
  const WV = { side: 0, armF: 2.1, armB: -.12, eyes: 'happy', mouth: 'smile', bob: -.004 };
  reg('wave', { fps: 30, blend: .8, xfade: .12, keys: [
    K(6, Object.assign({}, WV, { elbF: .2, headRot: .06, roll: .015 })),
    K(6, Object.assign({}, WV, { elbF: 1.1, headRot: .02, roll: 0 })),
    K(6, Object.assign({}, WV, { elbF: .2, headRot: -.02, roll: -.015 })),
    K(6, Object.assign({}, WV, { elbF: 1.1, headRot: .06, roll: 0 })),
  ] });

  // ---------- 던지기 (한 번 재생) ----------
  // 사랑 배틀 0.2~1.2초: 코니가 하트를 머리 높이에 들고(예비동작) 팔을 휘두르며 반대쪽 무릎을 들어 올린다. 던진 뒤 활짝 웃는다.
  const TH = { side: .45, faceX: .06 };
  reg('throw', { fps: 30, blend: .6, xfade: .04, once: true, keys: [
    K(2, Object.assign({}, TH, { lean: -.08, armF: 2.0, elbF: 1.2, armB: -.2, liftB: .3, headRot: -.05, eyes: 'dot', mouth: 'o' })),
    K(2, Object.assign({}, TH, { lean: .12, armF: 1.3, elbF: .3, armB: -.1, liftB: .55, bob: -.02, headRot: .04, eyes: 'dot', mouth: 'o' })),
    K(3, Object.assign({}, TH, { lean: .22, armF: .7, elbF: 0, armB: 0, liftB: .35, headRot: .06, eyes: 'happy', mouth: 'smile' })),
    K(5, Object.assign({}, TH, { lean: .1, armF: .25, elbF: 0, armB: 0, liftB: 0, eyes: 'happy', mouth: 'smile' })),
  ] });

  // ---------- 춤 (반복, 정면) ----------  (참고 영상 없음: 요리 영상의 콧노래 흔들림 + 원칙)
  // 4박: 왼쪽으로 몸을 기울이며 한 팔 위 → 가운데로 내려앉음 → 오른쪽 → 가운데. 무릎을 번갈아 든다.
  const DN = { side: 0, eyes: 'happy', mouth: 'smile', blush: .3 };
  reg('dance', { fps: 30, blend: .6, xfade: .1, keys: [
    K(6, Object.assign({}, DN, { roll: -.07, headRot: .1, bob: -.03, armF: .7, armB: -2.0, liftF: .4 })),
    K(6, Object.assign({}, DN, { roll: 0, headRot: 0, bob: .03, sy: .95, sx: 1.04, armF: 1.4, armB: -1.4 })),
    K(6, Object.assign({}, DN, { roll: .07, headRot: -.1, bob: -.03, armF: 2.0, armB: -.7, liftB: .4 })),
    K(6, Object.assign({}, DN, { roll: 0, headRot: 0, bob: .03, sy: .95, sx: 1.04, armF: 1.4, armB: -1.4 })),
  ] });

  // ---------- 앉기 (반복, 정면) ----------
  // 시트·낚시 영상: 엉덩이를 대고 앉아 다리는 앞으로 짧게 보이고, 두 손으로 낚싯대를 가슴 앞에 쥐고 느긋하게 몸·고개를 살짝 흔든다.
  const ST = { side: 0, legLen: .45, legF: .75, legB: -.75, bob: 0, armF: 1.0, elbF: 1.0, armB: -.9, elbB: .9, eyes: 'dot', mouth: 'neutral' };
  reg('sit', { fps: 30, blend: 1, xfade: .2, keys: [
    K(18, Object.assign({}, ST, { sy: .9, headRot: 0 })),
    K(18, Object.assign({}, ST, { sy: .905, headRot: .06, roll: .01 })),
    K(18, Object.assign({}, ST, { sy: .9, headRot: 0 })),
    K(18, Object.assign({}, ST, { sy: .905, headRot: -.06, roll: -.01 })),
  ] });

  // ---------- 먹기 (반복, 정면) ----------
  // 러닝 영상(케이크)·아이스크림 영상·시트(도넛): 음식을 입 앞에 두 손으로 쥐고 크게 한 입 → 볼이 불룩하게 오물오물(머리가 좌우로 눌렸다 펴짐) → 꿀꺽, 행복.
  const EA = { side: 0, armTop: 1, armF: -2.0, armB: -2.0, blush: .5 };
  const E_CHEW_A = K(3, Object.assign({}, EA, { headSx: 1.06, headSy: .95, headRot: .08, eyes: 'happy', mouth: 'grin' }));
  const E_CHEW_B = K(3, Object.assign({}, EA, { headSx: .97, headSy: 1.04, headRot: .04, eyes: 'happy', mouth: 'neutral' }));
  reg('eat', { fps: 30, blend: .5, xfade: .12, keys: [
    K(6, Object.assign({}, EA, { headRot: .05, headSy: 1.02, eyes: 'dot', mouth: 'o' })),
    K(3, Object.assign({}, EA, { headRot: .1, headY: .01, headSy: .96, headSx: 1.04, eyes: 'happy', mouth: 'smile' })),
    E_CHEW_A, E_CHEW_B, E_CHEW_A, E_CHEW_B,
    K(5, Object.assign({}, EA, { sy: 1.03, headY: -.012, eyes: 'happy', mouth: 'smile', blush: 1 })),
  ] });

  // ---------- 운동 (역기, k = 0~1 로 게임이 힘쓰는 정도를 준다) ----------
  // 러닝 영상 1.0~2.8초: 힘을 줄수록 몸이 내려앉고 머리가 어깨로 눌리며 얼굴이 가로로 퍼지고, 눈을 찡그리고 입을 크게 벌리며 땀이 사방으로 튀고 바가 덜덜 떨린다.
  // 팔은 게임이 그리는 바(위로 올라감)를 따라 올라간다.
  ANIM.lift = (t, o) => {
    const k = clamp(o.k || 0, 0, 1);
    return { side: 0, bob: .04 * k, sy: 1 - .12 * k, sx: 1 + .08 * k, headSy: 1 - .15 * k, headSx: 1 + .1 * k, headY: .03 * k, roll: Math.sin(t * 38) * .014 * k * k,
      armF: lerp(1.3, 2.05, k), armB: -lerp(1.3, 2.05, k), elbF: .45 * k, elbB: .45 * k, liftF: 0, blush: k * .8,
      eyes: k > .45 ? 'squint' : 'dot', mouth: k > .65 ? 'shout' : k > .3 ? 'o' : 'neutral', sweat: k > .5 ? 2 : k > .2 ? 1 : 0 };
  };

  // ---------- 좋아서 어쩔 줄 모름 (반복, 정면) ----------
  // 사용자가 준 참고 그림: 둘이 나란히 붙어 서서 고개를 서로 쪽으로 기울이고, 두 손을 턱 앞에 모으고, 볼이 빨개져 활짝 웃는다.
  // 고개 기울임(headRot>0)은 상대 쪽 — 오른쪽 캐릭터는 좌우 반전되어 그려지므로 같은 값을 쓰면 서로를 향한다.
  const JY = { side: 0, look: -.6, armTop: 1, armF: -2.2, armB: -2.2, eyes: 'joy', mouth: 'joy', blush: 1, lean: .05, earSpread: 0 }; // look<0: 얼굴을 정면으로 (서로를 향해 돌아가면 상대 뒤로 가려짐)
  reg('joy', { fps: 30, blend: .8, xfade: .18, keys: [
    K(5, Object.assign({}, JY, { bob: 0, sy: 1, headRot: .12, roll: .025 })),
    K(5, Object.assign({}, JY, { bob: -.03, sy: 1.03, sx: .98, headRot: .16, roll: -.01, armF: -2.35, armB: -2.35 })),
    K(5, Object.assign({}, JY, { bob: .008, sy: .98, sx: 1.02, headRot: .12, roll: -.03 })),
    K(5, Object.assign({}, JY, { bob: -.03, sy: 1.03, sx: .98, headRot: .16, roll: .01, armF: -2.35, armB: -2.35 })),
  ] });

  // ---------- 손 맞잡고 돌기 (반복) ----------
  // 서로를 보며 두 팔을 앞으로 뻗어 가운데서 손을 맞잡고, 몸을 살짝 뒤로 젖혀(원심력) 폴짝폴짝 돈다.
  // 몸 방향(side)·팔 각도·얼굴은 장면(LF.hug)이 돌아가는 각도에 맞춰 덮어쓴다.
  const TW = { side: .9, armLen: 1.7, armF: 1.5, armB: 1.5, elbF: 0, elbB: 0, lean: -.12, eyes: 'joy', mouth: 'joy', blush: 1 };
  const TW_A = K(5, Object.assign({}, TW, { legF: .5, kneeF: .5, legB: -.35, kneeB: .2, bob: -.03, headRot: -.04 }));
  const TW_B = K(5, Object.assign({}, TW, { legF: .05, kneeF: .1, legB: -.2, kneeB: 1.0, bob: -.01, headRot: -.02 }));
  reg('twirl', { fps: 30, blend: .7, xfade: .12, keys: [TW_A, TW_B, LF.mirrorPose(TW_A), LF.mirrorPose(TW_B)] });

  // ---------- 환호·점프 보강: 시트의 점프 포즈(팔을 양옆으로 활짝, 한쪽 무릎만 높이) ----------
  const ch = LF.CHEER.keys;
  for (const kf of ch) if (kf.liftF > .5) { kf.liftF = .75; kf.liftB = .05; kf.armF = 2.1; kf.armB = -2.1; }
}
