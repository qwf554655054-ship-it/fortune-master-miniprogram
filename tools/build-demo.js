'use strict';
/**
 * 构建纯静态演示站：
 *  1) 用 esbuild 把测算引擎（13 体系 + 规则解读）打成浏览器可运行的 engine.js
 *     - 把 Node 内置 fs/path/process 别名替换为浏览器桩（知识层不会被调用）
 *  2) 复制 public/ 的 index.html / style.css / app.js
 *  3) 注入 engine.js + shim.js 脚本
 *  4) 手写 shim.js：拦截所有 /api/* fetch 请求，转成本地计算
 *
 * 输出目录由 wb.config.json 的 build 项 / 环境变量 WB_BUILD_DIR 决定（默认 dist，项目本地）。
 * 在 require esbuild 之前注入 TEMP 重定向，确保 esbuild 的临时文件不写入 C 盘。
 */
const path = require('path');
const wb = require('./wb-paths');
const P = wb.applyToProcess(wb.ensureDirs(wb.resolve(wb.loadConfig())));
const esbuild = require('esbuild');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const DIST = P.BUILD_DIR;

const SHIM = `(function () {
  if (window.__fortuneShim) return;
  window.__fortuneShim = true;
  var realFetch = window.fetch ? window.fetch.bind(window) : null;
  window.fetch = function (url, opts) {
    opts = opts || {};
    var u = typeof url === 'string' ? url : (url && url.url) || '';
    if (u.indexOf('/api/') >= 0 && window.FortuneLocal && window.FortuneLocal.handleApi) {
      var p = u.split('?')[0];
      var body = {};
      if (opts.body) { try { body = JSON.parse(opts.body); } catch (e) { body = {}; } }
      var method = (opts.method || 'GET').toUpperCase();
      var res = window.FortuneLocal.handleApi(p, body, { method: method, headers: opts.headers || {} });
      var pr = (res && typeof res.then === 'function') ? res : Promise.resolve(res);
      return pr.then(function (r) {
        return new Response(JSON.stringify(r.json), { status: r.status, headers: { 'Content-Type': 'application/json' } });
      });
    }
    if (realFetch) return realFetch(url, opts);
    return Promise.reject(new Error('fetch 不可用'));
  };
})();
`;

async function main() {
  if (!fs.existsSync(DIST)) fs.mkdirSync(DIST, { recursive: true });

  await esbuild.build({
    entryPoints: [path.join(ROOT, 'tools', 'demo-entry.js')],
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['es2018'],
    outfile: path.join(DIST, 'engine.js'),
    alias: {
      fs: path.join(ROOT, 'tools', 'stub-fs.js'),
      path: path.join(ROOT, 'tools', 'stub-path.js'),
      process: path.join(ROOT, 'tools', 'stub-process.js'),
    },
    logLevel: 'info',
  });
  console.log('[build] engine.js bundled');

  // 复制前端资源
  fs.copyFileSync(path.join(ROOT, 'public', 'index.html'), path.join(DIST, 'index.html'));
  fs.copyFileSync(path.join(ROOT, 'public', 'style.css'), path.join(DIST, 'style.css'));
  fs.copyFileSync(path.join(ROOT, 'public', 'app.js'), path.join(DIST, 'app.js'));

  // 复制法律页（隐私政策 / 用户协议）：同时作为小程序上架所需的隐私政策托管地址
  for (const legal of ['privacy.html', 'agreement.html']) {
    const srcLegal = path.join(ROOT, 'public', legal);
    if (fs.existsSync(srcLegal)) fs.copyFileSync(srcLegal, path.join(DIST, legal));
  }

  // 注入 engine.js + shim.js（必须在 app.js 之前）
  let html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
  const tag = '<script src="/app.js"></script>';
  if (html.indexOf(tag) >= 0) {
    html = html.replace(tag, '<script src="/engine.js"></script>\n  <script src="/shim.js"></script>\n  <script src="/app.js"></script>');
  } else {
    html = html.replace('</body>', '<script src="/engine.js"></script>\n  <script src="/shim.js"></script>\n</body>');
  }
  fs.writeFileSync(path.join(DIST, 'index.html'), html);

  fs.writeFileSync(path.join(DIST, 'shim.js'), SHIM);
  console.log('[build] dist/ ready:', fs.readdirSync(DIST).join(', '));
}

main().catch((e) => { console.error(e); process.exit(1); });
