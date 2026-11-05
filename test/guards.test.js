'use strict';

const { setup } = require('./harness');
const { check, done } = require('./assert');
const { FakeEl } = require('./harness');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const record = {
  id: 'abc123',
  t: 300,
  d: 600,
  title: '測試影片標題',
  channel: '測試頻道',
  url: 'https://www.youtube.com/watch?v=abc123',
  updatedAt: Date.now()
};

const ctx = setup({
  // 分享連結自帶時間，應該以網址為準
  href: 'https://www.youtube.com/watch?v=abc123&t=45s',
  duration: 600,
  data: { 'v:abc123': record }
});

ctx.load();

(async () => {
  await sleep(1600);
  check('網址自帶 t= 時不跳轉', ctx.state.video.currentTime === 0, `currentTime=${ctx.state.video.currentTime}`);

  // 先離開目前影片，讓 content script 重置狀態
  ctx.fire('yt-navigate-start');
  ctx.navigate('https://www.youtube.com/watch?v=other999', 600);
  ctx.fire('yt-navigate-finish');
  await sleep(500);

  // 再回到有紀錄的影片，但使用者在續播前先點了播放器
  ctx.state.data['v:abc123'] = { ...record };
  ctx.fire('yt-navigate-start');
  ctx.navigate('https://www.youtube.com/watch?v=abc123', 600);
  ctx.fire('yt-navigate-finish');

  await sleep(60);
  const inside = new FakeEl('div');
  inside.owner = ctx.player;
  (ctx.listeners['pointerdown'] || []).forEach((fn) => fn({ type: 'pointerdown', target: inside }));

  await sleep(1600);
  check('使用者先互動則不跳轉', ctx.state.video.currentTime === 0, `currentTime=${ctx.state.video.currentTime}`);

  done();
})();
