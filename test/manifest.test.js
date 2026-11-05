'use strict';

/**
 * 檢查 manifest 與打包相關的靜態條件。
 * 這些是 Chrome Web Store 上架時會被打回的常見原因。
 */

const fs = require('fs');
const path = require('path');
const { check, done } = require('./assert');

const ROOT = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p));
const exists = (p) => fs.existsSync(path.join(ROOT, p));

const manifest = JSON.parse(read('manifest.json').toString('utf8'));
const pkg = JSON.parse(read('package.json').toString('utf8'));

function pngSize(buf) {
  const signature = buf.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

check('manifest_version 為 3', manifest.manifest_version === 3);
check('名稱不超過 45 字元', manifest.name.length <= 45, `${manifest.name.length} 字元`);
check('說明不超過 132 字元', manifest.description.length <= 132, `${manifest.description.length} 字元`);
check('版本號格式正確', /^\d+(\.\d+){0,3}$/.test(manifest.version), manifest.version);
check('版本號與 package.json 一致', manifest.version === pkg.version, `${manifest.version} / ${pkg.version}`);

for (const size of [16, 32, 48, 128]) {
  const rel = manifest.icons[size];
  const ok = rel && exists(rel);
  if (!ok) {
    check(`icon ${size} 存在`, false, rel || '未宣告');
    continue;
  }
  const dim = pngSize(read(rel));
  check(`icon ${size} 為 ${size}x${size} PNG`, dim && dim.width === size && dim.height === size, dim ? `${dim.width}x${dim.height}` : '不是 PNG');
}

check('有宣告 popup', !!manifest.action.default_popup && exists(manifest.action.default_popup));

const script = manifest.content_scripts[0];
check('content script 檔案存在', script.js.every(exists), script.js.join(', '));
check(
  'content script 只在 YouTube 執行',
  script.matches.every((m) => m.indexOf('youtube.com') > 0),
  script.matches.join(', ')
);

const allowed = ['storage'];
check(
  '權限維持最小集合',
  manifest.permissions.every((p) => allowed.indexOf(p) >= 0),
  manifest.permissions.join(', ')
);
check('沒有多餘的 host_permissions', !manifest.host_permissions);

const popupHtml = read(manifest.action.default_popup).toString('utf8');
const refs = [...popupHtml.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
const popupDir = path.dirname(path.join(ROOT, manifest.action.default_popup));
check(
  'popup 引用的資源都存在',
  refs.every((r) => fs.existsSync(path.resolve(popupDir, r))),
  refs.join(', ')
);

done();
