'use strict';

/**
 * 檢查 Markdown 內的相對連結是否都存在。
 * 文件互相引用，改檔名時很容易漏改其中一邊。
 */

const fs = require('fs');
const path = require('path');
const { check, done } = require('./assert');

const ROOT = path.resolve(__dirname, '..');

function markdownFiles(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) markdownFiles(full, acc);
    else if (entry.name.endsWith('.md')) acc.push(full);
  }
  return acc;
}

const files = markdownFiles(ROOT);
const broken = [];

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const links = [...text.matchAll(/\]\(([^)\s]+)\)/g)].map((m) => m[1]);

  for (const link of links) {
    if (/^(https?:|mailto:|#)/.test(link)) continue;
    const target = link.split('#')[0];
    if (!target) continue;
    const resolved = path.resolve(path.dirname(file), target);
    if (!fs.existsSync(resolved)) {
      broken.push(`${path.relative(ROOT, file)} → ${link}`);
    }
  }
}

check('Markdown 內沒有失效的相對連結', broken.length === 0, broken.join('; ') || `${files.length} 個檔案`);
check('README 有中英文兩版', fs.existsSync(path.join(ROOT, 'README.md')) && fs.existsSync(path.join(ROOT, 'README.zh-TW.md')));
check(
  '隱私政策有中英文兩版',
  fs.existsSync(path.join(ROOT, 'PRIVACY.md')) && fs.existsSync(path.join(ROOT, 'PRIVACY.zh-TW.md'))
);

done();
