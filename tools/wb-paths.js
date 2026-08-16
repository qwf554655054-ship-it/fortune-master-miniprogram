'use strict';
/**
 * 统一输出路径解析与重定向。
 *
 * 目标：所有「缓存 / 日志 / 临时文件 / 构建产物」都写入「项目本地目录」
 *       或「用户指定的其他磁盘路径(WB_OUTPUT_ROOT)」，绝不写入 C 盘
 *       AppData / Temp / ProgramData。
 *
 * 用法：
 *   node tools/wb-paths.js env    # 打印可 eval 的 shell 导出语句（供 .sh 脚本注入环境）
 *   node tools/wb-paths.js json   # 打印解析后的绝对路径（调试用）
 *   node tools/wb-paths.js cleanup# 清理临时目录（脚本 EXIT 时调用）
 *   在 JS 中 require 后调用 resolve/applyToProcess。
 */
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');

function loadConfig() {
  const cfgPath = path.join(PROJECT_ROOT, 'wb.config.json');
  const def = { outputRoot: '.wb-output', dirs: { cache: 'cache', logs: 'logs', temp: 'tmp', build: 'dist' } };
  try {
    const user = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    return {
      outputRoot: user.outputRoot || def.outputRoot,
      dirs: Object.assign({}, def.dirs, user.dirs || {}),
    };
  } catch (e) {
    return def;
  }
}

function resolve(cfg) {
  const outputRoot = process.env.WB_OUTPUT_ROOT
    ? path.resolve(process.env.WB_OUTPUT_ROOT)
    : path.resolve(PROJECT_ROOT, cfg.outputRoot || '.wb-output');
  const d = cfg.dirs || {};
  return {
    projectRoot: PROJECT_ROOT,
    outputRoot,
    CACHE_DIR: path.join(outputRoot, d.cache || 'cache'),
    LOG_DIR: path.join(outputRoot, d.logs || 'logs'),
    TEMP_DIR: path.join(outputRoot, d.temp || 'tmp'),
    BUILD_DIR: path.resolve(PROJECT_ROOT, d.build || 'dist'),
  };
}

function ensureDirs(p) {
  for (const k of ['CACHE_DIR', 'LOG_DIR', 'TEMP_DIR']) {
    fs.mkdirSync(p[k], { recursive: true });
  }
  return p;
}

// 把重定向写入当前进程环境变量（子进程继承；也影响当前 Node 后续 os.tmpdir 读取）
function applyToProcess(p) {
  process.env.npm_config_cache = p.CACHE_DIR;
  process.env.npm_config_loglevel = 'error';
  process.env.TEMP = p.TEMP_DIR;
  process.env.TMP = p.TEMP_DIR;
  if (process.platform !== 'win32') process.env.TMPDIR = p.TEMP_DIR;
  process.env.WB_LOG_DIR = p.LOG_DIR;
  process.env.WB_BUILD_DIR = p.BUILD_DIR;
  process.env.WB_OUTPUT_ROOT = p.outputRoot;
  return p;
}

function envLines(p) {
  // Git Bash / MinGW 下反斜杠会被当成转义符，导出时统一转成正斜杠（node / npm / esbuild 均兼容）
  const fwd = (s) => String(s).replace(/\\/g, '/');
  const lines = [
    `export WB_OUTPUT_ROOT=${fwd(p.outputRoot)}`,
    `export npm_config_cache=${fwd(p.CACHE_DIR)}`,
    `export npm_config_loglevel=error`,
    `export TEMP=${fwd(p.TEMP_DIR)}`,
    `export TMP=${fwd(p.TEMP_DIR)}`,
    `export WB_LOG_DIR=${fwd(p.LOG_DIR)}`,
    `export WB_BUILD_DIR=${fwd(p.BUILD_DIR)}`,
  ];
  if (process.platform !== 'win32') lines.push(`export TMPDIR=${fwd(p.TEMP_DIR)}`);
  return lines.join('\n');
}

function main() {
  const p = applyToProcess(ensureDirs(resolve(loadConfig())));
  const mode = process.argv[2] || 'env';
  if (mode === 'env') {
    process.stdout.write(envLines(p) + '\n');
  } else if (mode === 'json') {
    process.stdout.write(JSON.stringify(p, null, 2) + '\n');
  } else if (mode === 'cleanup') {
    try {
      fs.rmSync(p.TEMP_DIR, { recursive: true, force: true });
      process.stdout.write('[wb-paths] cleaned temp: ' + p.TEMP_DIR + '\n');
    } catch (e) {
      process.stdout.write('[wb-paths] cleanup failed: ' + e.message + '\n');
    }
  }
}

if (require.main === module) main();

module.exports = { loadConfig, resolve, ensureDirs, applyToProcess, envLines };
