'use strict';

/**
 * 產生 Chrome Web Store 用的圖檔。
 *
 * 用法：
 *   node tools/screenshots.js
 *   CHROME_PATH="/path/to/chrome" node tools/screenshots.js
 *
 * 輸出：
 *   store/screenshots/<語言>/1.png ~ 3.png   1280x800，商店可逐語言替換
 *   store/promo-440x280.png                  小型宣傳圖，所有語言共用
 *   store/marquee-1400x560.png               大型宣傳圖，所有語言共用
 *
 * 宣傳圖不含任何文字，因為商店只允許上傳一份；截圖的文字來自
 * store/screens/copy.json，範本內以 {{key}} 佔位。
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const STORE = path.join(ROOT, 'store');
const SCREENS = path.join(STORE, 'screens');
const TMP = path.join(STORE, 'tmp');
const OUT = path.join(STORE, 'screenshots');

const LANGS = [
  { id: 'zh-TW', locale: 'zh_TW' },
  { id: 'zh-CN', locale: 'zh_CN' },
  { id: 'en', locale: 'en' }
];

const SHOTS = [
  { template: '01-hero.html', name: '1.png' },
  { template: '02-toast.html', name: '2.png' },
  { template: '03-flow.html', name: '3.png' }
];

// 假的觀看紀錄：影片長度與觀看時間固定，標題依語言取自 copy.json
const RECORDS = [
  { t: 754, d: 2900, ago: 2 * 3600e3 },
  { t: 485, d: 1361, ago: 26 * 3600e3 },
  { t: 1510, d: 3093, ago: 3 * 86400e3 },
  { t: 228, d: 980, ago: 16 * 86400e3 }
];

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
  fs.mkdirSync(path.dirname(out), { recursive: true });
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

/* ---------- 工具列面板 ---------- */

function buildPopupPreview(lang) {
  const html = fs.readFileSync(path.join(ROOT, 'popup', 'popup.html'), 'utf8');
  const copy = JSON.parse(fs.readFileSync(path.join(SCREENS, 'copy.json'), 'utf8'));
  const locale = JSON.parse(fs.readFileSync(path.join(ROOT, '_locales', lang.locale, 'messages.json'), 'utf8'));
  const titles = copy[lang.locale].sampleVideos;
  const now = Date.now();

  const data = { settings: { enabled: true } };
  RECORDS.forEach((rec, i) => {
    const id = `a${i + 1}`;
    data[`v:${id}`] = {
      id,
      t: rec.t,
      d: rec.d,
      title: titles[i % titles.length],
      channel: '',
      url: `https://www.youtube.com/watch?v=${id}`,
      updatedAt: now - rec.ago
    };
  });

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
      i18n: { getMessage: getMessage, getUILanguage: function () { return '${lang.locale}'; } }
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
  const out = path.join(ROOT, 'popup', `__preview-${lang.id}.html`);
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

function renderPopup(lang) {
  const preview = buildPopupPreview(lang);
  const height = measureHeight(preview, 384);
  const out = path.join(TMP, `popup-${lang.id}.png`);
  shoot(preview, out, 384, height, 2);
  fs.rmSync(preview, { force: true });
  return path.basename(out);
}

/* ---------- 截圖合成 ---------- */

function fill(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => (key in values ? String(values[key]) : `{{${key}}}`));
}

function renderScreens(lang, popupFile) {
  const copy = JSON.parse(fs.readFileSync(path.join(SCREENS, 'copy.json'), 'utf8'))[lang.locale];
  const values = { ...copy, popup: popupFile };

  for (const shot of SHOTS) {
    const source = fs.readFileSync(path.join(SCREENS, shot.template), 'utf8');
    const tmp = path.join(TMP, `${lang.id}-${shot.template}`);
    fs.writeFileSync(tmp, fill(source, values));
    shoot(tmp, path.join(OUT, lang.id, shot.name), 1280, 800, 1);
  }
}

/* ---------- main ---------- */

fs.mkdirSync(TMP, { recursive: true });

for (const lang of LANGS) {
  console.log(`\n[${lang.id}] 渲染工具列面板與截圖…`);
  const popup = renderPopup(lang);
  renderScreens(lang, popup);
}

console.log('\n宣傳圖（所有語言共用，不含文字）…');
shoot(path.join(SCREENS, 'promo-440x280.html'), path.join(STORE, 'promo-440x280.png'), 440, 280, 1);
shoot(path.join(SCREENS, 'marquee-1400x560.html'), path.join(STORE, 'marquee-1400x560.png'), 1400, 560, 1);

console.log('\n完成。');
