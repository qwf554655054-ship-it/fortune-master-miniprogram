// 浏览器桩：Node 'process'（llm.js 读取 process.env.* 判断是否有 LLM key，演示态下无 key → 走规则解读）
'use strict';
module.exports = { env: {}, platform: 'browser', argv: [], cwd: function () { return '/'; }, version: '' };
