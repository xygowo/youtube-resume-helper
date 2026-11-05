'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const dir = __dirname;
const files = fs
  .readdirSync(dir)
  .filter((name) => name.endsWith('.test.js'))
  .sort();

let failed = 0;

for (const file of files) {
  console.log(`\n── ${file} ${'─'.repeat(Math.max(0, 46 - file.length))}`);
  const result = spawnSync(process.execPath, [path.join(dir, file)], { stdio: 'inherit' });
  if (result.status !== 0) failed += 1;
}

console.log(`\n${files.length - failed}/${files.length} 個測試檔通過`);
process.exit(failed ? 1 : 0);
