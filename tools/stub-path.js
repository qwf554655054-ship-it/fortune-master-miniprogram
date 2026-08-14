// 浏览器桩：Node 'path'（知识层加载时用到 path.join，演示态下不读真实文件）
'use strict';
function join() {
  return Array.prototype.slice.call(arguments)
    .filter(function (x) { return x !== null && x !== undefined && x !== ''; })
    .join('/')
    .replace(/\/{2,}/g, '/');
}
var p = {
  join: join,
  resolve: join,
  dirname: function (s) { s = String(s); var i = s.lastIndexOf('/'); return i < 0 ? '.' : s.slice(0, i); },
  basename: function (s) { s = String(s); var i = s.lastIndexOf('/'); return i < 0 ? s : s.slice(i + 1); },
  extname: function (s) { s = String(s); var i = s.lastIndexOf('.'); return i < 0 ? '' : s.slice(i); },
  sep: '/',
};
p.posix = p;
p.win32 = p;
module.exports = p;
