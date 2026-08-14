'use strict';
/**
 * 演示版测算引擎入口（浏览器打包用）。
 * 把 13 个排盘函数 + 规则解读层 暴露为 window.FortuneLocal.handleApi，
 * 让前端 dist/app.js 通过 fetch 拦截走本地计算，无需后端服务。
 */
const { generateReading } = require('../src/ai/interpreter');
const { calculateBAZI } = require('../src/pan/bazi');
const { calculateZiwei } = require('../src/pan/ziwei');
const { calculateZodiac } = require('../src/pan/zodiac');
const { calculateDaily } = require('../src/pan/daily');
const { calculateNumerology } = require('../src/pan/numerology');
const { drawTarot } = require('../src/pan/tarot');
const { castHexagram } = require('../src/pan/yijing');
const { calculateQimen } = require('../src/pan/qimen');
const { calculateFengshui } = require('../src/pan/fengshui');
const { calculateRelationship } = require('../src/pan/relationship');
const { calculateAnnual, calculateMonthly } = require('../src/pan/annual');
const { calculateXingzhan } = require('../src/pan/xingzhan');

const PAN = {
  bazi: calculateBAZI,
  ziwei: calculateZiwei,
  zodiac: calculateZodiac,
  daily: calculateDaily,
  numerology: calculateNumerology,
  tarot: drawTarot,
  yijing: castHexagram,
  qimen: calculateQimen,
  fengshui: calculateFengshui,
  relationship: calculateRelationship,
  annual: calculateAnnual,
  monthly: calculateMonthly,
  xingzhan: calculateXingzhan,
};

function ok(data) { return { status: 200, json: { ok: true, data: data } }; }
function fail(status, error) { return { status: status, json: { ok: false, error: error } }; }

async function handleApi(path, body, ctx) {
  body = body || {};
  ctx = ctx || {};
  const method = (ctx.method || 'POST').toUpperCase();
  let p = String(path).replace('/fortune', '');

  if (p === '/api/health') return ok({ ok: true, time: Date.now() });

  if (p === '/api/membership') {
    return ok({
      tier: 'free', demo: true,
      plans: [
        { key: 'monthly', name: '月度会员', price: 19.9 },
        { key: 'yearly', name: '年度会员', price: 199 },
      ],
    });
  }
  if (p === '/api/membership/upgrade') {
    return ok({ tier: 'vip', plan: body.plan || 'monthly', demo: true, expireAt: null });
  }

  if (p === '/api/reading') {
    try {
      const reading = await generateReading({ system: body.system, data: body.data, question: body.question, deep: !!body.deep });
      return ok(reading);
    } catch (e) { return fail(400, e.message); }
  }

  if (p.indexOf('/api/user/') === 0) {
    // 演示态：历史/收藏不持久化（不读 file）
    if (method === 'GET') return ok([]);
    return ok({ id: 'demo-' + Date.now(), createdAt: Date.now() });
  }

  if (p.indexOf('/api/') === 0) {
    const key = p.slice('/api/'.length);
    const fn = PAN[key];
    if (!fn) return fail(404, '未知接口: ' + p);
    try { return ok(fn(body)); } catch (e) { return fail(400, e.message); }
  }
  return fail(404, '未知接口: ' + p);
}

const api = { handleApi: handleApi };
if (typeof window !== 'undefined') window.FortuneLocal = api;
if (typeof module !== 'undefined' && module.exports) module.exports = api;
