// 浏览器桩：Node 'fs'（仅用于打包演示，知识层在浏览器端不会被实际调用）
'use strict';
module.exports = {
  readFileSync: function () { return ''; },
  readFile: function (p, enc, cb) { if (typeof enc === 'function') { enc(null, ''); } else if (typeof cb === 'function') { cb(null, ''); } },
  readdirSync: function () { return []; },
  existsSync: function () { return false; },
  writeFileSync: function () {},
  appendFileSync: function () {},
  statSync: function () { return { isFile: function () { return true; }, isDirectory: function () { return false; } }; },
  mkdirSync: function () {},
  unlinkSync: function () {},
  promises: { readFile: function () { return Promise.resolve(''); }, writeFile: function () { return Promise.resolve(); } },
};
