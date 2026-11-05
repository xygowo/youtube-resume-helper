'use strict';

const results = [];

function check(label, ok, detail) {
  results.push(!!ok);
  const mark = ok ? 'PASS' : 'FAIL';
  console.log(`${mark}  ${label}${detail ? `  (${detail})` : ''}`);
}

function done() {
  const failed = results.filter((r) => !r).length;
  console.log(`\n${results.length - failed}/${results.length} 通過`);
  process.exit(failed ? 1 : 0);
}

module.exports = { check, done };
