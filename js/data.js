'use strict';
// 스테이지/대사 데이터 — 규칙과 그리기에서 분리 (나중에 Flutter로 옮길 때 그대로 재사용)
// flow: run(달리기) kiss(뽀뽀) workout(운동) cook(요리) catch(하트 받기) fish(낚시) daily(대화)
// run.tier: 등장 패턴 난이도(1~5), drops: 낙하물, skin: 장애물 모양
LF.STAGES = [
  { id: 1, name: '꽃길 산책', theme: 'flowers', desc: '벚꽃 흩날리는 길. 구덩이와 덤불을 넘어 첫 하트를 전해요!', flow: ['run'],
    run: { len: 12000, speed: 470, tier: 2, skin: { low: 'bush', tall: 'fence', over: 'branch', roll: 'ball', fly: 'bee' } } },
  { id: 2, name: '공원 소풍', theme: 'park', desc: '나뭇가지는 슬라이드로! 도착하면 두근두근 뽀뽀 타임.', flow: ['run', 'kiss'],
    run: { len: 14000, speed: 490, tier: 2, skin: { low: 'rock', tall: 'fence', over: 'branch', roll: 'ball', fly: 'bee' } } },
  { id: 3, name: '놀이공원', theme: 'fair', desc: '굴러오는 공과 떠다니는 발판! 하늘에서 떨어지는 하트를 받아요.', flow: ['run', 'catch'],
    run: { len: 16000, speed: 510, tier: 3, skin: { low: 'cone', tall: 'boxes', over: 'banner', roll: 'ball', fly: 'balloon' } } },
  { id: 4, name: '러브 짐', theme: 'gym', desc: '리듬 운동으로 체력을 키우고(목숨 +1) 질주!', flow: ['workout', 'run'],
    run: { len: 17000, speed: 520, tier: 3, skin: { low: 'dumbbell', tall: 'boxes', over: 'bar', roll: 'ball', fly: 'bee' } } },
  { id: 5, name: '쿠킹 데이', theme: 'kitchen', desc: '레시피를 기억해 쿠키를 굽자(하트 자석). 부엌은 미끄러워요!', flow: ['cook', 'run'],
    run: { len: 18000, speed: 535, tier: 3, skin: { low: 'cake', tall: 'jars', over: 'bar', roll: 'egg', fly: 'bee' } } },
  { id: 6, name: '비 오는 날', theme: 'rain', desc: '질투 구름이 날아다녀요. 우산 아래 둘만의 대화.', flow: ['run', 'daily'], daily: 'rain',
    run: { len: 19000, speed: 550, tier: 4, skin: { low: 'hydrant', tall: 'lamp', over: 'banner', roll: 'ball', fly: 'cloud' } } },
  { id: 7, name: '겨울 마을', theme: 'snow', desc: '고드름이 떨어지고 눈덩이가 굴러와요. 눈송이 하트를 받아요!', flow: ['run', 'catch'],
    run: { len: 20000, speed: 565, tier: 4, drops: 'icicle', skin: { low: 'snowman', tall: 'fence', over: 'branch', roll: 'snowball', fly: 'bird' } } },
  { id: 8, name: '야시장', theme: 'market', desc: '좁은 발판을 건너 낚시 노점으로! 황금 물고기를 노려요.', flow: ['run', 'fish'],
    run: { len: 22000, speed: 580, tier: 5, skin: { low: 'crate', tall: 'lamp', over: 'banner', roll: 'ball', fly: 'bird' } } },
  { id: 9, name: '별똥별 밤', theme: 'night', desc: '별똥별이 쏟아지는 밤. 별빛 아래 두 번째 뽀뽀.', flow: ['run', 'kiss'],
    run: { len: 23000, speed: 600, tier: 5, drops: 'meteor', skin: { low: 'rock', tall: 'lamp', over: 'banner', roll: 'ball', fly: 'cloud' } } },
  { id: 10, name: '고백 대작전', theme: 'final', desc: '모든 장애물이 총출동! 끝까지 달려 사랑을 쟁취하세요.', flow: ['workout', 'run', 'daily', 'kiss'], daily: 'final', final: true,
    run: { len: 26000, speed: 620, tier: 5, drops: 'meteor', skin: { low: 'cake', tall: 'boxes', over: 'banner', roll: 'ball', fly: 'bee' } } },
];

// 대화 (상대 Q가 말하고 주인공 P가 고른다). v: 마음 점수
LF.DAILY = {
  rain: { title: '비 오는 하굣길', rounds: [
    { q: '비가 오네… 우산이 하나뿐이야.', ch: [
      { t: '같이 쓰자! 가까이 와~', v: 1, r: '그, 그래! 두근두근…', m: 'shy' }, { t: '너 써, 난 괜찮아!', v: .55, r: '안 돼, 감기 걸려!', m: 'surprise' }, { t: '그냥 뛰어가자!', v: .3, r: '으앗, 젖는다~!', m: 'hurt' }] },
    { q: '어깨가 다 젖었잖아… 괜찮아?', ch: [
      { t: '더 가까이 붙으면 돼', v: 1, r: '이렇게 하니까 따뜻해…', m: 'shy' }, { t: '우산을 네 쪽으로 할게', v: .7, r: '{P}, 마음씨 최고야!', m: 'cheer' }, { t: '으으, 차가워!', v: .25, r: '내 겉옷 줄게…', m: 'sad' }] },
    { q: '비 그치면 뭐 할까?', ch: [
      { t: '무지개 보러 가자!', v: 1, r: '좋아! 손잡고 가자~', m: 'cheer' }, { t: '따뜻한 코코아 마시자', v: .8, r: '마시멜로도 넣자!', m: 'eat' }, { t: '집에 가서 잘래…', v: .15, r: '벌써…?', m: 'pout' }] },
  ] },
  final: { title: '드디어, 고백의 순간', rounds: [
    { q: '{P}… 사실 할 말이 있어.', ch: [
      { t: '나도 할 말 있어!', v: 1, r: '어? 혹시 같은 말…?', m: 'surprise' }, { t: '응, 천천히 말해줘', v: .8, r: '가, 가슴이 터질 것 같아…', m: 'shy' }, { t: '배고파…', v: .1, r: '…지금 그게 중요해?!', m: 'pout' }] },
    { q: '내 마음… 받아줄래?', ch: [
      { t: '응! 기꺼이!', v: 1, r: '으아아 행복해!!', m: 'cheer' }, { t: '하트를 더 주면 생각해볼게', v: .55, r: '그럼 하트 백 개 줄게!', m: 'surprise' }, { t: '음… 생각해볼게', v: .3, r: '기다릴게, 얼마든지…', m: 'sad' }] },
    { q: '우리, 앞으로도 쭉 함께할래?', ch: [
      { t: '당연하지, 영원히!', v: 1, r: '사랑해! 진짜 진짜 사랑해!', m: 'cheer' }, { t: '그럴까? 헤헤', v: .7, r: '약속이다!', m: 'shy' }, { t: '비밀~', v: .35, r: '치, 궁금하게 만들기야?', m: 'pout' }] },
  ] },
};

LF.INGR = [
  { id: 'egg', name: '달걀' }, { id: 'milk', name: '우유' }, { id: 'flour', name: '밀가루' },
  { id: 'butter', name: '버터' }, { id: 'berry', name: '딸기' }, { id: 'choco', name: '초콜릿' },
  { id: 'sugar', name: '설탕' }, { id: 'cheese', name: '치즈' }, { id: 'honey', name: '꿀' }, { id: 'banana', name: '바나나' },
]; // 재료 10가지 (기억력 쿠키 굽기)
