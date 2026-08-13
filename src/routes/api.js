'use strict';
/**
 * API 路由层
 * 处理 /api/* 请求，调用排盘层与解读层，返回 JSON。
 */
const { calculateBAZI } = require('../pan/bazi');
const { calculateZodiac } = require('../pan/zodiac');
const { drawTarot } = require('../pan/tarot');
const { calculateZiwei } = require('../pan/ziwei');
const { calculateNumerology } = require('../pan/numerology');
const { calculateDaily } = require('../pan/daily');
const { generateReading } = require('../ai/interpreter');

function ok(data) { return { status: 200, json: { ok: true, data } }; }
function fail(status, msg) { return { status, json: { ok: false, error: msg } }; }

async function handleApi(path, body) {
  try {
    if (path === '/api/health') return ok({ status: 'up', time: new Date().toISOString() });

    if (path === '/api/bazi' || path === '/api/fortune/bazi') {
      const chart = calculateBAZI(body || {});
      return ok(chart);
    }
    if (path === '/api/zodiac' || path === '/api/fortune/zodiac') {
      const z = calculateZodiac(body || {});
      return ok(z);
    }
    if (path === '/api/tarot' || path === '/api/fortune/tarot') {
      const t = drawTarot(body || {});
      return ok(t);
    }
    if (path === '/api/ziwei' || path === '/api/fortune/ziwei') {
      const z = calculateZiwei(body || {});
      return ok(z);
    }
    if (path === '/api/numerology' || path === '/api/fortune/numerology') {
      const n = calculateNumerology(body || {});
      return ok(n);
    }
    if (path === '/api/daily' || path === '/api/fortune/daily') {
      const d = calculateDaily(body || {});
      return ok(d);
    }
    if (path === '/api/reading' || path === '/api/fortune/reading') {
      if (!body || !body.system) return fail(400, '缺少 system 字段');
      const reading = await generateReading({ system: body.system, data: body.data, question: body.question });
      return ok(reading);
    }
    return fail(404, '未知接口: ' + path);
  } catch (e) {
    return fail(400, e.message || '处理失败');
  }
}

module.exports = { handleApi };
