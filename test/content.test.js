'use strict';

const { setup } = require('./harness');
const { check, done } = require('./assert');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ctx = setup({
  href: 'https://www.youtube.com/watch?v=abc123',
  duration: 600,
  data: {
    'v:abc123': {
      id: 'abc123',
      t: 300,
      d: 600,
      title: '測試影片標題',
      channel: '測試頻道',
      url: 'https://www.youtube.com/watch?v=abc123',
      updatedAt: Date.now() - 3600e3
    }
  }
});

ctx.load();

(async () => {
  await sleep(1800);
  check(
    '打開影片後跳到記錄的時間',
    Math.abs(ctx.state.video.currentTime - 300) < 1,
    `currentTime=${ctx.state.video.currentTime}`
  );

  ctx.state.video.currentTime = 320;
  ctx.state.video.paused = false;
  await sleep(3200);
  const saved = ctx.state.data['v:abc123'];
  check(
    '播放中自動記錄進度',
    saved && Math.abs(saved.t - 320) <= 2,
    saved ? `t=${saved.t}` : '沒有紀錄'
  );

  ctx.state.video.currentTime = 400;
  ctx.state.video.paused = true;
  ctx.setVisibility('hidden');
  await sleep(200);
  check(
    '切到背景時補寫進度',
    Math.abs(ctx.state.data['v:abc123'].t - 400) <= 1,
    `t=${ctx.state.data['v:abc123'].t}`
  );
  ctx.setVisibility('visible');

  ctx.player.classList.add('ad-showing');
  ctx.state.video.currentTime = 7;
  await sleep(3200);
  check('廣告播放中不覆蓋紀錄', ctx.state.data['v:abc123'].t >= 300, `t=${ctx.state.data['v:abc123'].t}`);
  ctx.player.classList.remove('ad-showing');

  ctx.state.video.currentTime = 330;
  ctx.fire('yt-navigate-start');
  ctx.navigate('https://www.youtube.com/watch?v=xyz789', 300);
  ctx.fire('yt-navigate-finish');
  await sleep(1500);
  check(
    '換片前寫入舊影片進度',
    Math.abs(ctx.state.data['v:abc123'].t - 330) <= 1,
    `t=${ctx.state.data['v:abc123'].t}`
  );
  check('沒有紀錄的影片從 0 開始', ctx.state.video.currentTime === 0, `currentTime=${ctx.state.video.currentTime}`);

  ctx.state.video.currentTime = 100;
  ctx.state.video.paused = false;
  await sleep(3200);
  check('第二支影片也被記錄', !!ctx.state.data['v:xyz789'], ctx.state.data['v:xyz789'] ? `t=${ctx.state.data['v:xyz789'].t}` : '無');

  ctx.fire('yt-navigate-start');
  ctx.navigate('https://www.youtube.com/watch?v=abc123', 600);
  ctx.fire('yt-navigate-finish');
  await sleep(1800);
  check(
    '再回到舊影片接續上次進度',
    Math.abs(ctx.state.video.currentTime - 330) < 2,
    `currentTime=${ctx.state.video.currentTime}`
  );

  ctx.state.video.currentTime = 590;
  ctx.state.video.paused = true;
  ctx.state.video.dispatch('pause');
  await sleep(300);
  check('接近片尾時清除紀錄', !ctx.state.data['v:abc123'], ctx.state.data['v:abc123'] ? '紀錄還在' : '已清除');

  done();
})();
