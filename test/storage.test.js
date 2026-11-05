'use strict';

/**
 * 驗證紀錄數量上限：換片時會把最舊的紀錄刪掉，不會無限累積。
 */

const { setup } = require('./harness');
const { check, done } = require('./assert');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CAP = 300;
const SEEDED = 305;

const ctx = setup({
  href: 'https://www.youtube.com/watch?v=vid000',
  duration: 600,
  data: {}
});

ctx.load();

function keys() {
  return Object.keys(ctx.state.data).filter((k) => k.indexOf('v:') === 0);
}

(async () => {
  await sleep(600);

  // 模擬長期使用後累積的紀錄，vid000 最舊、vid304 最新
  const base = Date.now();
  for (let i = 0; i < SEEDED; i += 1) {
    const id = 'vid' + String(i).padStart(3, '0');
    ctx.state.data['v:' + id] = {
      id,
      t: 100,
      d: 600,
      title: '影片 ' + i,
      channel: '',
      url: 'https://www.youtube.com/watch?v=' + id,
      updatedAt: base - (SEEDED - i) * 1000
    };
  }
  ctx.state.data.settings = { enabled: true };

  check('起始有 305 筆', keys().length === SEEDED, `${keys().length} 筆`);

  ctx.fire('yt-navigate-start');
  ctx.navigate('https://www.youtube.com/watch?v=newvid', 600);
  ctx.fire('yt-navigate-finish');
  await sleep(900);

  const remaining = keys();
  check(`換片後裁切到 ${CAP} 筆`, remaining.length === CAP, `${remaining.length} 筆`);

  const removed = [];
  for (let i = 0; i < 5; i += 1) {
    const id = 'vid' + String(i).padStart(3, '0');
    if (!remaining.includes('v:' + id)) removed.push(id);
  }
  check('最舊的 5 筆被移除', removed.length === 5, removed.join(', '));

  check('最新的紀錄保留', remaining.includes('v:vid304'));
  check('設定沒有被誤刪', !!ctx.state.data.settings);

  done();
})();
