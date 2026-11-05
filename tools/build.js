'use strict';

/**
 * 打包成 Chrome Web Store 可上傳的 zip。
 * 只包含執行時需要的檔案，測試與文件不會進到套件裡。
 *
 * 用法：npm run build
 */

const fs = require('fs');
const path = require('path');
const { createZip } = require('./zip');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'dist');
const INCLUDE = ['manifest.json', 'content', 'popup', 'icons', '_locales', 'LICENSE'];

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

if (manifest.version !== pkg.version) {
  console.error(`版本不一致：manifest ${manifest.version} / package.json ${pkg.version}`);
  process.exit(1);
}

function collect(relative) {
  const abs = path.join(ROOT, relative);
  if (!fs.existsSync(abs)) return [];
  const stat = fs.statSync(abs);
  if (stat.isFile()) return [relative];
  return fs
    .readdirSync(abs)
    .sort()
    .flatMap((entry) => collect(path.posix.join(relative, entry)));
}

const names = INCLUDE.flatMap(collect).sort();
if (!names.includes('manifest.json')) {
  console.error('找不到 manifest.json');
  process.exit(1);
}

const files = names.map((name) => ({ name, data: fs.readFileSync(path.join(ROOT, name)) }));
const zip = createZip(files);

fs.mkdirSync(OUT_DIR, { recursive: true });
const target = path.join(OUT_DIR, `youtube-resume-helper-${manifest.version}.zip`);
fs.writeFileSync(target, zip);

console.log(`打包完成：${path.relative(ROOT, target)}`);
console.log(`版本 ${manifest.version}，${files.length} 個檔案，${(zip.length / 1024).toFixed(1)} KB`);
for (const name of names) console.log(`  ${name}`);
