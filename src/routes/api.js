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
const { castHexagram } = require('../pan/yijing');
const { calculateQimen } = require('../pan/qimen');
const { calculateFengshui } = require('../pan/fengshui');
const { calculateRelationship } = require('../pan/relationship');
const { calculateAnnual, calculateMonthly } = require('../pan/annual');
const { calculateXingzhan } = require('../pan/xingzhan');
const store = require('../store');
const { generateReading } = require('../ai/interpreter');

function ok(data) { return { status: 200, json: { ok: true, data } }; }
function fail(status, msg) { return { status, json: { ok: false, error: msg } }; }

async function handleApi(path, body, ctx = {}) {
  const method = ctx.method || 'POST';
  const clientId = (ctx.headers && ctx.headers['x-client-id']) || 'anon';
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
    if (path === '/api/yijing' || path === '/api/fortune/yijing') {
      const y = castHexagram(body || {});
      return ok(y);
    }
    if (path === '/api/qimen' || path === '/api/fortune/qimen') {
      const q = calculateQimen(body || {});
      return ok(q);
    }
    if (path === '/api/fengshui' || path === '/api/fortune/fengshui') {
      const f = calculateFengshui(body || {});
      return ok(f);
    }
    if (path === '/api/relationship' || path === '/api/fortune/relationship') {
      const r = calculateRelationship(body || {});
      return ok(r);
    }
    if (path === '/api/annual' || path === '/api/fortune/annual') {
      const a = calculateAnnual(body || {});
      return ok(a);
    }
    if (path === '/api/monthly' || path === '/api/fortune/monthly') {
      const m = calculateMonthly(body || {});
      return ok(m);
    }
    if (path === '/api/xingzhan' || path === '/api/fortune/xingzhan') {
      const x = calculateXingzhan(body || {});
      return ok(x);
    }
    // 用户存储：历史 / 收藏（clientId 经 X-Client-Id 头传递）
    if (path === '/api/user/history' && method === 'GET') return ok(store.listHistory(clientId));
    if (path === '/api/user/history' && method === 'POST') return ok(store.addHistory(clientId, body || {}));
    if (path.startsWith('/api/user/history/') && method === 'DELETE') {
      const id = path.split('/').pop();
      return ok(store.deleteHistory(clientId, id));
    }
    if (path === '/api/user/favorites' && method === 'GET') return ok(store.listFavorites(clientId));
    if (path === '/api/user/favorites' && method === 'POST') return ok(store.addFavorite(clientId, body || {}));
    if (path.startsWith('/api/user/favorites/') && method === 'DELETE') {
      const id = path.split('/').pop();
      return ok(store.deleteFavorite(clientId, id));
    }
    if (path === '/api/reading' || path === '/api/fortune/reading') {
      if (!body || !body.system) return fail(400, '缺少 system 字段');
      const deep = !!body.deep;
      if (deep) {
        const m = store.getMembership(clientId);
        if (!m || m.tier !== 'vip') return fail(403, '深度解读为会员专享，请先开通会员');
      }
      const reading = await generateReading({ system: body.system, data: body.data, question: body.question, deep });
      return ok(reading);
    }
    // ===== 会员 / 商业化（本地演示，未接入真实支付）=====
    if (path === '/api/membership' && method === 'GET') return ok(store.getMembership(clientId));
    if (path === '/api/membership/upgrade' && method === 'POST') {
      const plan = (body && body.plan) || 'monthly';
      if (!store.PLANS[plan]) return fail(400, 'plan 仅支持 monthly / yearly');
      return ok(store.upgradeMembership(clientId, plan));
    }
    return fail(404, '未知接口: ' + path);
  } catch (e) {
    return fail(400, e.message || '处理失败');
  }
}

module.exports = { handleApi };
