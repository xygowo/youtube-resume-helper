'use strict';

/**
 * 商店截圖的版型與文案對得起來。
 * 佔位符打錯不會報錯，只會在圖上印出 {{token}}，所以要在產生前先檢查。
 */

const fs = require('fs');
const path = require('path');
const { check, done } = require('./assert');

const ROOT = path.resolve(__dirname, '..');
const SCREENS = path.join(ROOT, 'store', 'screens');

const copy = JSON.parse(fs.readFileSync(path.join(SCREENS, 'copy.json'), 'utf8'));
const locales = Object.keys(copy).sort();

check('copy.json 有三種語言', locales.join() === 'en,zh_CN,zh_TW', locales.join(', '));

const base = Object.keys(copy[locales[0]]).sort();
const mismatched = locales.filter((loc) => Object.keys(copy[loc]).sort().join() !== base.join());
check('各語言的文案鍵一致', mismatched.length === 0, mismatched.join(', ') || `${base.length} 個鍵`);

const templates = fs
  .readdirSync(SCREENS)
  .filter((f) => f.endsWith('.html'));

// popup 由腳本另外注入，不在 copy.json 內
const injected = new Set(['popup']);
const used = new Set();
const missing = [];

for (const file of templates) {
  const html = fs.readFileSync(path.join(SCREENS, file), 'utf8');
  for (const m of html.matchAll(/\{\{(\w+)\}\}/g)) {
    const token = m[1];
    used.add(token);
    if (injected.has(token)) continue;
    for (const loc of locales) {
      if (!(token in copy[loc])) missing.push(`${file}: ${loc} 缺少 ${token}`);
    }
  }
}

check('版型用到的佔位符都有對應文案', missing.length === 0, missing.join('; ') || `${used.size} 個佔位符`);

const stray = templates.filter((file) => {
  const html = fs.readFileSync(path.join(SCREENS, file), 'utf8').replace(/\{\{\w+\}\}/g, '');
  return html.indexOf('{{') >= 0;
});
check('版型沒有格式錯誤的佔位符', stray.length === 0, stray.join(', ') || 'OK');

done();
