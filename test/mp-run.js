'use strict';
/**
 * 小程序端到端测试 harness
 * 说明：微信小程序页面依赖 wx / getApp / Page 等全局，无法直接在 Node 运行。
 * 本 harness 用最小 mock 替身这些全局，并把所有 wx.request 路由到「真实后端」handleApi，
 * 从而验证：页面渲染字段 / buildBody 构造 / 测算+自动历史 / 收藏 / 深度解读鉴权 / 会员升降级 /
 * 设置持久化 等完整数据流，覆盖核心功能与边界场景。
 */
const assert = require('assert');
const fs = require('fs');
// 清空持久化存储，保证每次运行互不污染（store 按 clientId 落地到 data/user.json）
try { fs.unlinkSync('data/user.json'); } catch (e) { /* 文件不存在则忽略 */ }
const { handleApi } = require('../src/routes/api.js');
const { SYSTEMS, FIELD_DEFS, buildBody } = require('../miniprogram/utils/systems.js');

// ---------- mock 全局 ----------
const mem = new Map();                 // 模拟 wx 本地存储
let CLIENT_ID = 'mp-test';             // 当前场景 clientId（按场景切换以隔离 store）
const navCalls = [];                   // 记录 navigateTo / switchTab 调用
const appGlobal = { apiBase: 'http://mock', clientId: CLIENT_ID };

global.wx = {
  getStorageSync: (k) => (mem.has(k) ? mem.get(k) : ''),
  setStorageSync: (k, v) => mem.set(k, v),
  request: (opts) => {
    let path = opts.url || '';
    if (path.indexOf(appGlobal.apiBase) === 0) path = path.slice(appGlobal.apiBase.length);
    const ctx = { method: opts.method || 'POST', headers: Object.assign({}, opts.header) };
    if (!ctx.headers['x-client-id']) ctx.headers['x-client-id'] = CLIENT_ID;
    Promise.resolve()
      .then(() => handleApi(path, opts.data, ctx))
      .then((res) => { if (opts.success) opts.success({ statusCode: res.status, data: res.json }); })
      .catch((err) => { if (opts.fail) opts.fail({ errMsg: err.message }); });
  },
  navigateTo: (o) => navCalls.push(o),
  switchTab: (o) => navCalls.push(o),
  showToast: () => {},
  setNavigationBarTitle: () => {}
};
global.getApp = () => ({ globalData: appGlobal });
global.App = () => {};
global.Page = (def) => { global.__lastPage = def; };
global.__lastPage = null;

// 捕获各页面定义
require('../miniprogram/pages/index/index.js');   const indexDef = global.__lastPage;
require('../miniprogram/pages/calc/calc.js');      const calcDef = global.__lastPage;
require('../miniprogram/pages/records/records.js');const recordsDef = global.__lastPage;
require('../miniprogram/pages/member/member.js');  const memberDef = global.__lastPage;
require('../miniprogram/pages/settings/settings.js');const settingsDef = global.__lastPage;

function makePage(def) {
  const inst = Object.assign({}, def);
  inst.data = JSON.parse(JSON.stringify(def.data || {}));
  inst.setData = function (patch) { Object.assign(this.data, patch); };
  return inst;
}
function setClient(id) { CLIENT_ID = id; appGlobal.clientId = id; navCalls.length = 0; }
const tick = () => new Promise((r) => setTimeout(r, 50));

// 各数字字段的样本值（用于正常测算）
const SAMPLES = {
  year: '1990', month: '5', day: '20', hour: '14', minute: '30',
  yearA: '1990', yearB: '1992', targetYear: '2026', targetMonth: '8'
};

function fillValues(inst, sysKey) {
  const sys = SYSTEMS.find((s) => s.key === sysKey);
  sys.fields.forEach((k) => {
    if (FIELD_DEFS[k].type === 'picker') return; // picker 已在 onLoad 设默认值
    if (SAMPLES[k] !== undefined) {
      inst.onInput({ currentTarget: { dataset: { key: k } }, detail: { value: SAMPLES[k] } });
    }
  });
}

// ---------- 测试运行器 ----------
let pass = 0, fail = 0;
async function test(name, fn) {
  try { await fn(); pass++; console.log('  \u2713', name); }
  catch (e) { fail++; console.log('  \u2717', name, '\n       ', e.message); }
}

async function main() {
  console.log('\n=== 小程序端到端测试 ===\n');

  // 1) 体系元数据完整性
  await test('SYSTEMS 共 13 个体系且字段定义齐全', () => {
    assert.strictEqual(SYSTEMS.length, 13, '应有 13 个体系');
    const keys = new Set();
    SYSTEMS.forEach((s) => {
      assert.ok(s.key && s.name && s.endpoint && Array.isArray(s.fields), '体系字段不完整: ' + s.key);
      assert.ok(!keys.has(s.key), '体系 key 重复: ' + s.key); keys.add(s.key);
      s.fields.forEach((f) => assert.ok(FIELD_DEFS[f], '字段 ' + f + ' 缺少定义（体系 ' + s.key + '）'));
    });
  });

  // 2) buildBody：关系合盘嵌套结构
  await test('buildBody 关系合盘生成 {a:{year},b:{year}} 嵌套', () => {
    const b = buildBody('relationship', { yearA: '1990', yearB: '1992' });
    assert.deepStrictEqual(b, { a: { year: 1990 }, b: { year: 1992 } });
  });

  // 3) buildBody：数字转换 + 空值跳过
  await test('buildBody 数字字段转 Number 且跳过空值', () => {
    const b = buildBody('bazi', { year: '1990', month: '5', day: '', hour: '14', minute: '30', gender: 'male' });
    assert.strictEqual(b.year, 1990);
    assert.strictEqual(b.month, 5);
    assert.strictEqual(b.day, undefined, '空值应被跳过');
    assert.strictEqual(b.gender, 'male');
  });

  // 3b) buildBody：六爻按起卦方式分别构造
  await test('buildBody 六爻时间起卦含年月日时、数字起卦仅含两数', () => {
    const t = buildBody('yijing', { method: 'time', year: '1990', month: '5', day: '20', hour: '14', num1: '', num2: '' });
    assert.deepStrictEqual(t, { method: 'time', year: 1990, month: 5, day: 20, hour: 14 });
    const n = buildBody('yijing', { method: 'numbers', year: '', month: '', day: '', hour: '', num1: '7', num2: '5' });
    assert.deepStrictEqual(n, { method: 'numbers', num1: 7, num2: 5 });
  });

  // 4) index 页面渲染 13 个体系
  await test('首页 index 加载 13 个体系', () => {
    const p = makePage(indexDef);
    assert.strictEqual(p.data.systems.length, 13);
    assert.ok(typeof p.onShareAppMessage === 'function');
    const sm = p.onShareAppMessage();
    assert.ok(sm.title && sm.path, '分享参数应含 title/path');
  });

  // 5) calc onLoad：每个体系字段正确渲染
  await test('calc onLoad 各体系字段/初值正确（含未知体系回退）', () => {
    SYSTEMS.forEach((s) => {
      setClient('c-load-' + s.key);
      const p = makePage(calcDef);
      p.onLoad({ system: s.key });
      assert.strictEqual(p.data.sys.key, s.key, '系统不匹配: ' + s.key);
      assert.strictEqual(p.data.fields.length, s.fields.length, '字段数量不匹配: ' + s.key);
      // picker 字段有默认值 + pickerIndex，输入字段初值为空
      s.fields.forEach((k) => {
        if (FIELD_DEFS[k].type === 'picker') {
          assert.strictEqual(p.data.pickerIndex[k], 0, 'picker 初值下标应为 0: ' + k);
          assert.ok(p.data.values[k] !== '' && p.data.values[k] !== undefined, 'picker 应有默认选项: ' + k);
        } else {
          assert.strictEqual(p.data.values[k], '', '输入字段初值应为空: ' + k);
        }
      });
    });
    // 未知体系回退到 SYSTEMS[0]
    const p2 = makePage(calcDef);
    p2.onLoad({ system: 'not_exist' });
    assert.strictEqual(p2.data.sys.key, SYSTEMS[0].key, '未知体系应回退到第一个体系');
  });

  // 6) calc onSubmit 正常测算：返回解读 + 自动写历史
  await test('calc onSubmit 正常测算并返回解读段落', async () => {
    setClient('c-bazi-1');
    const p = makePage(calcDef);
    p.onLoad({ system: 'bazi' });
    await tick();
    fillValues(p, 'bazi');
    p.onSubmit();
    await tick();
    assert.ok(Array.isArray(p.data.result) && p.data.result.length > 0, '应返回解读段落');
    assert.ok(p.data.chart && typeof p.data.chart === 'object', '应保存排盘结果 chart');
    assert.strictEqual(p.data.loading, false, 'loading 应复位');
    assert.strictEqual(p.data.error, '', '正常流程不应有 error');
    // 验证自动历史已写入
    const hist = await handleApi('/api/user/history', null, { method: 'GET', headers: { 'x-client-id': 'c-bazi-1' } });
    assert.ok(hist.json.ok && hist.json.data.length >= 1, '应自动写入至少一条历史');
    assert.strictEqual(hist.json.data[0].system, 'bazi');
  });

  // 7) 边界：缺参提交应报错且不崩溃
  await test('边界：缺少必填字段提交返回错误（不崩溃）', async () => {
    setClient('c-err-1');
    const p = makePage(calcDef);
    p.onLoad({ system: 'bazi' }); // 不填任何值
    p.onSubmit();
    await tick();
    assert.ok(p.data.error, '应产生错误提示');
    assert.strictEqual(p.data.result, null, '出错时 result 应为 null');
    assert.strictEqual(p.data.loading, false, 'loading 应复位');
  });

  // 8) calc 收藏功能
  await test('calc 收藏：点击收藏后写入收藏夹', async () => {
    setClient('c-fav-1');
    const p = makePage(calcDef);
    p.onLoad({ system: 'zodiac' });
    await tick();
    fillValues(p, 'zodiac');
    p.onSubmit();
    await tick();
    assert.ok(p.data.result, '应先测算成功');
    p.onFavorite();
    await tick();
    assert.strictEqual(p.data.favorited, true, '收藏状态应为 true');
    const fav = await handleApi('/api/user/favorites', null, { method: 'GET', headers: { 'x-client-id': 'c-fav-1' } });
    assert.ok(fav.json.ok && fav.json.data.length >= 1, '收藏夹应有记录');
    assert.strictEqual(fav.json.data[0].system, 'zodiac');
  });

  // 9) 深度解读：免费用户被引导开通
  await test('深度解读：免费用户点击引导开通（toast + 跳会员）', async () => {
    setClient('c-deep-free');
    const p = makePage(calcDef);
    p.onLoad({ system: 'bazi' });
    await tick();
    assert.strictEqual(p.data.memberTier, 'free', '初始应为免费');
    fillValues(p, 'bazi');
    p.onSubmit();
    await tick();
    p.onDeep();
    assert.ok(p.data.toast && p.data.toast.indexOf('会员') >= 0, '应提示开通会员');
    // 800ms 后 switchTab（不阻塞测试，仅确认会被调度）
  });

  // 10) 深度解读：VIP 成功返回「深度延展」
  await test('深度解读：VIP 用户成功返回深度延展段落', async () => {
    setClient('c-deep-vip');
    // 先把该用户升级为 vip
    await handleApi('/api/membership/upgrade', { plan: 'yearly' }, { method: 'POST', headers: { 'x-client-id': 'c-deep-vip' } });
    const p = makePage(calcDef);
    p.onLoad({ system: 'bazi' });
    await tick();
    assert.strictEqual(p.data.memberTier, 'vip', 'onLoad 应拉取到 vip 状态');
    fillValues(p, 'bazi');
    p.onSubmit();
    await tick();
    const before = p.data.result.length;
    p.onDeep();
    await tick();
    assert.ok(p.data.result.length > before, '应追加深度解读段落');
    assert.ok(p.data.result.some((s) => s.title && s.title.indexOf('深度延展') >= 0), '应包含「深度延展」段落');
  });

  // 11) 深度解读：会员态与服务端不一致（403）兜底引导
  await test('深度解读：会员态误判触发 403 兜底引导', async () => {
    setClient('c-deep-403'); // 未升级后端
    const p = makePage(calcDef);
    p.onLoad({ system: 'bazi' });
    await tick();
    p.setData({ memberTier: 'vip' }); // 强制为 vip 以进入 requestDeep
    fillValues(p, 'bazi');
    p.onSubmit();
    await tick();
    p.onDeep();
    await tick();
    assert.ok(p.data.toast && p.data.toast.indexOf('会员') >= 0, '403 兜底应提示开通会员');
  });

  // 12) records 加载 + 删除历史
  await test('records 历史加载与删除', async () => {
    setClient('c-rec-1');
    await handleApi('/api/user/history', { system: 'bazi', title: '八字', summary: '测试' }, { method: 'POST', headers: { 'x-client-id': 'c-rec-1' } });
    const p = makePage(recordsDef);
    p.onShow();
    await tick();
    assert.ok(p.data.history.length >= 1, '应加载到历史');
    const id = p.data.history[0].id;
    const lenBefore = p.data.history.length;
    p.delHistory({ currentTarget: { dataset: { id } } });
    await tick();
    assert.strictEqual(p.data.history.length, lenBefore - 1, '删除后历史应减少');
  });

  // 13) records 收藏加载与删除
  await test('records 收藏加载与删除', async () => {
    setClient('c-rec-2');
    await handleApi('/api/user/favorites', { system: 'tarot', title: '塔罗', summary: '测试' }, { method: 'POST', headers: { 'x-client-id': 'c-rec-2' } });
    const p = makePage(recordsDef);
    p.onShow();
    await tick();
    assert.ok(p.data.favorites.length >= 1, '应加载到收藏');
    const id = p.data.favorites[0].id;
    const lenBefore = p.data.favorites.length;
    p.delFavorite({ currentTarget: { dataset: { id } } });
    await tick();
    assert.strictEqual(p.data.favorites.length, lenBefore - 1, '删除后收藏应减少');
  });

  // 14) member 加载与升级
  await test('member 免费态加载 + 升级为 VIP', async () => {
    setClient('c-mem-1');
    const p = makePage(memberDef);
    p.onShow();
    await tick();
    assert.strictEqual(p.data.member.tier, 'free', '初始应为免费');
    p.upgrade({ currentTarget: { dataset: { plan: 'yearly' } } });
    await tick();
    assert.strictEqual(p.data.member.tier, 'vip', '升级后应为 VIP');
    assert.strictEqual(p.data.member.plan, 'yearly');
  });

  // 15) settings 保存并持久化到 storage + 全局 apiBase 同步
  await test('settings 保存后端地址并持久化', () => {
    setClient('c-set-1');
    const p = makePage(settingsDef);
    p.onLoad();
    p.onInput({ detail: { value: 'https://api.example.com/' } }); // 末尾斜杠会被清理
    p.save();
    assert.strictEqual(mem.get('apiBase'), 'https://api.example.com', '存储应去掉末尾斜杠');
    assert.strictEqual(appGlobal.apiBase, 'https://api.example.com', '全局 apiBase 应同步');
    assert.strictEqual(p.data.saved, true);
  });

  // 16) settings 连通性自检（后端在线）
  await test('settings 连通性检测：后端在线应返回成功', async () => {
    setClient('c-set-2');
    const p = makePage(settingsDef);
    p.onLoad();
    p.onInput({ detail: { value: 'http://mock' } });
    p.save();
    p.test();
    await tick();
    assert.ok(p.data.status && p.data.status.indexOf('连接成功') >= 0, '应提示连接成功');
  });

  // 17) settings 空地址校验
  await test('settings 空地址应拒绝保存', () => {
    setClient('c-set-3');
    const p = makePage(settingsDef);
    p.onLoad();
    p.onInput({ detail: { value: '   ' } });
    p.save();
    assert.ok(p.data.error, '空地址应报错');
    assert.strictEqual(p.data.saved, false);
  });

  // 18) 全部 13 体系均可端到端测算（批量冒烟）
  await test('批量：13 个体系均可正常测算出解读', async () => {
    for (const s of SYSTEMS) {
      setClient('c-smoke-' + s.key);
      const p = makePage(calcDef);
      p.onLoad({ system: s.key });
      await tick();
      fillValues(p, s.key);
      p.onSubmit();
      await tick();
      assert.ok(Array.isArray(p.data.result) && p.data.result.length > 0, '体系 ' + s.key + ' 应返回解读');
    }
  });

  console.log(`\n结果：通过 ${pass} / 失败 ${fail}\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error('harness error:', e); process.exit(2); });
