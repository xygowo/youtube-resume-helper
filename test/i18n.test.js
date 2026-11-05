'use strict';

/**
 * 檢查 i18n 檔案：語言齊全、鍵一致、程式與 HTML 用到的鍵都存在。
 */

const fs = require('fs');
const path = require('path');
const { check, done } = require('./assert');

const ROOT = path.resolve(__dirname, '..');
const LOCALES = path.join(ROOT, '_locales');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const manifest = JSON.parse(read('manifest.json'));
const defaultLocale = manifest.default_locale;

check('manifest 有宣告 default_locale', typeof defaultLocale === 'string' && defaultLocale.length > 0, defaultLocale);
check('_locales 目錄存在', fs.existsSync(LOCALES));

const locales = fs
  .readdirSync(LOCALES, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

check('預設語言有對應的資料夾', locales.includes(defaultLocale), locales.join(', '));

const tables = {};
for (const locale of locales) {
  const file = path.join(LOCALES, locale, 'messages.json');
  let data = null;
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    check(`${locale}/messages.json 可解析`, false, err.message);
    continue;
  }
  tables[locale] = data;
  const empty = Object.entries(data).filter(([, v]) => !v || typeof v.message !== 'string' || !v.message.trim());
  check(`${locale} 的訊息都有內容`, empty.length === 0, empty.map(([k]) => k).join(', ') || `${Object.keys(data).length} 則`);
}

const base = tables[defaultLocale] || {};
const baseKeys = Object.keys(base).sort();

for (const locale of Object.keys(tables)) {
  if (locale === defaultLocale) continue;
  const keys = Object.keys(tables[locale]).sort();
  const missing = baseKeys.filter((k) => !keys.includes(k));
  const extra = keys.filter((k) => !baseKeys.includes(k));
  check(`${locale} 與 ${defaultLocale} 的鍵一致`, missing.length === 0 && extra.length === 0, `缺少 ${missing.join(', ') || '無'}；多出 ${extra.join(', ') || '無'}`);
}

// manifest 內的 __MSG_xxx__
const msgRefs = [...read('manifest.json').matchAll(/__MSG_([A-Za-z0-9_]+)__/g)].map((m) => m[1]);
check(
  'manifest 的 __MSG_ 參照都存在',
  msgRefs.every((k) => base[k]),
  msgRefs.join(', ')
);

// HTML 的 data-i18n / data-i18n-title
const html = read('popup/popup.html');
const htmlRefs = [
  ...[...html.matchAll(/data-i18n="([^"]+)"/g)].map((m) => m[1]),
  ...[...html.matchAll(/data-i18n-title="([^"]+)"/g)].map((m) => m[1])
];
check(
  'popup.html 的 data-i18n 鍵都存在',
  htmlRefs.every((k) => base[k]),
  htmlRefs.filter((k) => !base[k]).join(', ') || htmlRefs.join(', ')
);

// JS 內的 getMessage('x') 與 t('x')
const jsFiles = ['content/content.js', 'popup/popup.js'];
const jsRefs = [];
for (const file of jsFiles) {
  const src = read(file);
  for (const m of src.matchAll(/getMessage\(\s*['"]([A-Za-z0-9_]+)['"]/g)) jsRefs.push([file, m[1]]);
  for (const m of src.matchAll(/\bt\(\s*['"]([A-Za-z0-9_]+)['"]/g)) jsRefs.push([file, m[1]]);
}
const missingJs = jsRefs.filter(([, key]) => !base[key]);
check(
  'JS 用到的訊息鍵都存在',
  missingJs.length === 0,
  missingJs.map(([f, k]) => `${f}:${k}`).join(', ') || `${jsRefs.length} 處`
);

// 佔位符宣告與使用要對得起來
const placeholderIssues = [];
for (const locale of Object.keys(tables)) {
  for (const [key, entry] of Object.entries(tables[locale])) {
    const used = [...String(entry.message).matchAll(/\$([A-Za-z0-9_]+)\$/g)].map((m) => m[1]);
    const declared = Object.keys(entry.placeholders || {});
    for (const name of used) {
      if (!declared.includes(name)) placeholderIssues.push(`${locale}/${key}: 使用 $${name}$ 但未宣告`);
    }
    for (const name of declared) {
      if (!used.includes(name)) placeholderIssues.push(`${locale}/${key}: 宣告 ${name} 但未使用`);
    }
  }
}
check('佔位符宣告與使用一致', placeholderIssues.length === 0, placeholderIssues.join('; ') || 'OK');

// 反向檢查：沒被任何檔案引用的鍵，通常是改名後留下的孤兒
const sources = ['manifest.json', 'popup/popup.html', 'content/content.js', 'popup/popup.js']
  .map((f) => read(f))
  .join('\n');
const unused = baseKeys.filter((k) => sources.indexOf(k) < 0);
check('所有訊息鍵都有被使用', unused.length === 0, unused.join(', ') || `${baseKeys.length} 則`);

// 商店的長度限制是逐語言計算的
const tooLong = [];
for (const [locale, table] of Object.entries(tables)) {
  if (table.extName && table.extName.message.length > 45) tooLong.push(`${locale} 名稱 ${table.extName.message.length}`);
  if (table.extDescription && table.extDescription.message.length > 132) tooLong.push(`${locale} 說明 ${table.extDescription.message.length}`);
}
check('各語言的名稱與說明符合長度限制', tooLong.length === 0, tooLong.join(', ') || 'OK');

done();
