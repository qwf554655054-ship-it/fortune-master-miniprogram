'use strict';
/**
 * 统一日志输出。
 * 日志写入「项目本地日志目录」(WB_LOG_DIR / .wb-output/logs)，绝不写入 C 盘 AppData。
 * 同时镜像到 stdout，兼容现有控制台查看与测试。
 */
const fs = require('fs');
const path = require('path');
const { resolve, ensureDirs, loadConfig } = require('./wb-paths');

const p = ensureDirs(resolve(loadConfig()));
const LOG_DIR = process.env.WB_LOG_DIR || p.LOG_DIR;
fs.mkdirSync(LOG_DIR, { recursive: true });
const LOG_FILE = path.join(LOG_DIR, 'app.log');

function ts() { return new Date().toISOString(); }

function write(level, args) {
  const msg = args.map((a) => {
    if (typeof a === 'string') return a;
    if (a && a.stack) return a.stack;
    try { return JSON.stringify(a); } catch (e) { return String(a); }
  }).join(' ');
  const line = `[${ts()}] [${level}] ${msg}`;
  process.stdout.write(line + '\n');
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch (_) { /* 忽略写入失败 */ }
}

module.exports = {
  log: (...a) => write('INFO', a),
  info: (...a) => write('INFO', a),
  warn: (...a) => write('WARN', a),
  error: (...a) => write('ERROR', a),
  LOG_FILE,
  LOG_DIR,
};
