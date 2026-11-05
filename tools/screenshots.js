'use strict';

/**
 * 產生 Chrome Web Store 用的圖檔。
 *
 * 用法：
 *   node tools/screenshots.js
 *   CHROME_PATH="/path/to/chrome" node tools/screenshots.js
 *   PREVIEW_LOCALE=en node tools/screenshots.js   # 用英文介面渲染，確認版面
 *
 * 會先渲染工具列面板（含假的觀看記錄），再合成三張 1280x800 截圖
 * 與兩張宣傳圖。輸出到 store/。
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const STORE = path.join(ROOT, 'store');
const TMP = path.join(STORE, 'tmp');

const CANDIDATES = {
  win32: [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
  ],
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
  ],
  linux: ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser']
};

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const list = CANDIDATES[process.platform] || [];
  const found = list.find((p) => fs.existsSync(p));
  if (!found) {
    console.error('找不到 Chrome，請設定環境變數 CHROME_PATH');
    process.exit(1);
  }
  return found;
}

const CHROME = findChrome();
const PROFILE = path.join(os.tmpdir(), 'resume-helper-shots');

function url(file) {
  return 'file:///' + path.resolve(file).split(path.sep).join('/').replace(/ /g, '%20');
}

function run(args) {
  return execFileSync(CHROME, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function baseArgs(extra) {
  return [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    `--user-data-dir=${PROFILE}`,
    ...extra
  ];
}

function shoot(file, out, width, height, scale) {
  run(
    baseArgs([
      `--window-size=${width},${height}`,
      `--force-device-scale-factor=${scale}`,
      '--virtual-time-budget=2500',
      `--screenshot=${out}`,
      url(file)
    ])
  );
  const kb = (fs.statSync(out).size / 1024).toFixed(0);
  console.log(`  ${path.relative(ROOT, out)}  ${kb} KB`);
}

/* ---------- 1. 工具列面板 ---------- */

const RECORDS = [
  ['a1', '2026 新手攝影入門：從構圖到打光', 754, 2900, 2 * 3600e3],
  ['a2', '用 Node.js 寫一個 CLI 工具', 485, 1361, 26 * 3600e3],
  ['a3', '淺談 Web Performance 與 Core Web Vitals', 1510, 3093, 3 * 86400e3],
  ['a4', '居家咖啡沖煮：手沖參數怎麼調', 228, 980, 16 * 86400e3]
];

function buildPopupPreview() {
  const html = fs.readFileSync(path.join(ROOT, 'popup', 'popup.html'), 'utf8');
  const now = Date.now();

  const data = { settings: { enabled: true } };
  for (const [id, title, t, d, ago] of RECORDS) {
    data[`v:${id}`] = {
      id,
      t,
      d,
      title,
      channel: '',
      url: `https://www.youtube.com/watch?v=${id}`,
      updatedAt: now - ago
    };
  }

  const LOCALE = process.env.PREVIEW_LOCALE || 'zh_TW';
  const locale = JSON.parse(fs.readFileSync(path.join(ROOT, '_locales', LOCALE, 'messages.json'), 'utf8'));

  const stub = `<script>(function () {
    var M = ${JSON.stringify(locale)};
    var getMessage = function (key, subs) {
      var entry = M[key];
      if (!entry) return '';
      var list = subs === undefined ? [] : (Array.isArray(subs) ? subs : [subs]);
      var out = entry.message;
      var ph = entry.placeholders || {};
      Object.keys(ph).forEach(function (name) {
        var index = Number(String(ph[name].content).replace('$', '')) - 1;
        out = out.split('$' + name + '$').join(list[index] === undefined ? '' : list[index]);
      });
      return out;
    };
    Object.defineProperty(window, 'chrome', { configurable: true, value: {
      storage: { local: {
        get: function () { return Promise.resolve(${JSON.stringify(data)}); },
        set: function () { return Promise.resolve(); },
        remove: function () { return Promise.resolve(); }
      } },
      tabs: { create: function () {} },
      i18n: { getMessage: getMessage, getUILanguage: function () { return '${LOCALE}'; } }
    } });
  })();</script>`;

  const finish = `<script>
    const swap = () => {
      document.querySelectorAll('.thumb img').forEach((img, i) => {
        const src = '../store/screens/thumbs/t' + ((i % 4) + 1) + '.png';
        if (!img.src.endsWith(src)) img.src = src;
      });
    };
    setInterval(swap, 60);
    setTimeout(() => {
      document.title = 'H=' + Math.ceil(document.documentElement.scrollHeight);
    }, 800);
  </script>`;

  // 放在 popup/ 內，讓 ../icons 之類的相對路徑維持正確。
  // 替換一律用函式回傳：字串替換會把 $' 之類的樣板當成特殊語法。
  const out = path.join(ROOT, 'popup', '__preview.html');
  fs.writeFileSync(
    out,
    html
      .replace('<script src="popup.js"></script>', () => stub + '<script src="popup.js"></script>')
      .replace('</body>', () => finish + '</body>')
  );
  return out;
}

function measureHeight(file, width) {
  const dom = run(baseArgs([`--window-size=${width},120`, '--virtual-time-budget=2000', '--dump-dom', url(file)]));
  const m = dom.match(/<title>H=(\d+)<\/title>/);
  return m ? parseInt(m[1], 10) : 430;
}

/* ---------- main ---------- */

fs.mkdirSync(TMP, { recursive: true });
console.log('渲染工具列面板…');
const preview = buildPopupPreview();
const popupHeight = measureHeight(preview, 384);
console.log(`  內容高度 ${popupHeight}px`);
shoot(preview, path.join(TMP, 'popup.png'), 384, popupHeight, 2);

console.log('合成截圖…');
shoot(path.join(STORE, 'screens', '01-hero.html'), path.join(STORE, 'screenshot-1.png'), 1280, 800, 1);
shoot(path.join(STORE, 'screens', '02-toast.html'), path.join(STORE, 'screenshot-2.png'), 1280, 800, 1);
shoot(path.join(STORE, 'screens', '03-flow.html'), path.join(STORE, 'screenshot-3.png'), 1280, 800, 1);
shoot(path.join(STORE, 'screens', 'promo-440x280.html'), path.join(STORE, 'promo-440x280.png'), 440, 280, 1);
shoot(path.join(STORE, 'screens', 'marquee-1400x560.html'), path.join(STORE, 'marquee-1400x560.png'), 1400, 560, 1);

if (!process.env.DEBUG) fs.rmSync(preview, { force: true });
console.log('完成。');
