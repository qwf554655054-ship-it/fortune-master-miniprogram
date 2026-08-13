'use strict';
/**
 * 简易测试运行器（零依赖）
 * 运行：node test/run.js
 */
const assert = require('assert');
const { calculateBAZI } = require('../src/pan/bazi');
const { calculateZodiac } = require('../src/pan/zodiac');
const { drawTarot } = require('../src/pan/tarot');
const { calculateZiwei } = require('../src/pan/ziwei');
const { calculateNumerology } = require('../src/pan/numerology');
const { calculateDaily } = require('../src/pan/daily');
const { castHexagram } = require('../src/pan/yijing');
const { calculateQimen } = require('../src/pan/qimen');
const { calculateFengshui } = require('../src/pan/fengshui');
const { calculateRelationship } = require('../src/pan/relationship');
const { generateReading } = require('../src/ai/interpreter');

let pass = 0, fail = 0;
async function test(name, fn) {
  try { await fn(); console.log('  ✓ ' + name); pass++; }
  catch (e) { console.log('  ✗ ' + name + ' -> ' + e.message); fail++; }
}

async function main() {
  console.log('运行命理测算小程序测试...\n');

  await test('八字排盘：四柱正确（1990-05-20 14:30 男）', () => {
    const c = calculateBAZI({ year: 1990, month: 5, day: 20, hour: 14, minute: 30, gender: 'male' });
    assert.strictEqual(c.fourPillars[0].ganzhi, '庚午');
    assert.strictEqual(c.fourPillars[1].ganzhi, '辛巳');
    assert.strictEqual(c.fourPillars[2].ganzhi, '乙酉');
    assert.strictEqual(c.fourPillars[3].ganzhi, '癸未');
    assert.strictEqual(c.dayMaster.gan, '乙');
    assert.strictEqual(c.dayMaster.wuxing, '木');
  });

  await test('八字排盘：五行统计与日主强度存在', () => {
    const c = calculateBAZI({ year: 1990, month: 5, day: 20, hour: 14, gender: 'male' });
    const sum = Object.values(c.wuxingTally).reduce((a, b) => a + b, 0);
    assert.ok(sum > 0, '五行计数应为正');
    assert.ok(['偏强', '偏弱', '中和'].includes(c.dayMasterStrength));
    assert.ok(c.daYun.length >= 6, '大运应至少有 6 步');
  });

  await test('八字排盘：性别女时大运方向反向', () => {
    const m = calculateBAZI({ year: 1990, month: 5, day: 20, hour: 14, gender: 'male' });
    const f = calculateBAZI({ year: 1990, month: 5, day: 20, hour: 14, gender: 'female' });
    assert.notStrictEqual(m.daYun[0].ganzhi, f.daYun[0].ganzhi);
  });

  await test('生肖运势：1990 年生为马，返回关系', () => {
    const z = calculateZodiac({ year: 1990, month: 5, day: 20 });
    assert.strictEqual(z.shengXiao, '马');
    assert.ok(['本命年', '冲太岁', '六合', '平稳'].includes(z.relation));
    assert.ok(z.relationDetail.length > 0);
  });

  await test('塔罗：抽 3 张返回 过去/现在/未来', () => {
    const t = drawTarot({ count: 3, question: '测试' });
    assert.strictEqual(t.cards.length, 3);
    assert.deepStrictEqual(t.cards.map((c) => c.position), ['过去', '现在', '未来']);
    t.cards.forEach((c) => assert.ok(c.name && c.orientation && c.meaning));
  });

  await test('紫微：十四主星齐全且十二宫完整', () => {
    const z = calculateZiwei({ year: 1990, month: 5, day: 20, hour: 14, gender: 'male' });
    assert.strictEqual(z.palaces.length, 12);
    assert.ok(/局$/.test(z.xingWuju), '五行局格式应为 X局');
    assert.ok(z.mingGong.ganzhi.length === 2);
    const stars = Object.keys(z.stars);
    assert.strictEqual(stars.length, 14, '应安放 14 颗主星');
    ['紫微', '天府', '天机', '七杀', '破军'].forEach((s) => assert.ok(stars.includes(s)));
    // 主星分布恰好覆盖 12 宫
    const zhiSet = new Set(Object.values(z.stars));
    assert.ok(zhiSet.size >= 10, '主星应散布于多个宫位');
  });

  await test('数字命理：1990-05-20 生命灵数为 8', () => {
    const n = calculateNumerology({ year: 1990, month: 5, day: 20 });
    assert.strictEqual(n.lifePath.number, 8);
    assert.ok(n.lifePath.meaning.length > 0);
    assert.ok(n.talent.length === 2);
  });

  await test('每日运势：返回冲合关系与评级', () => {
    const d = calculateDaily({ year: 1990 });
    assert.strictEqual(d.birthZodiac, '马');
    assert.ok(['优', '吉', '平', '慎'].includes(d.rating));
    assert.ok(d.dayGanZhi.length === 2);
    assert.ok(d.detail.length > 0);
  });

  await test('解读层：新体系（紫微/数秘/日运）均返回段落', async () => {
    const z = calculateZiwei({ year: 1990, month: 5, day: 20, hour: 14 });
    const rz = await generateReading({ system: 'ziwei', data: z });
    assert.ok(rz.sections.length >= 3, '紫微解读至少 3 段');
    const n = calculateNumerology({ year: 1990, month: 5, day: 20 });
    const rn = await generateReading({ system: 'numerology', data: n });
    assert.ok(rn.sections.length >= 3);
    const d = calculateDaily({ year: 1990 });
    const rd = await generateReading({ system: 'daily', data: d });
    assert.ok(rd.sections.length >= 1);
  });

  await test('六爻：时间起卦返回卦名与动爻', () => {
    const y = castHexagram({ year: 1990, month: 5, day: 20, hour: 14, method: 'time' });
    assert.ok(y.hexagon.length >= 3, '应为三字以上卦名');
    assert.ok(y.movingLine >= 1 && y.movingLine <= 6);
    assert.ok(['乾', '兑', '离', '震', '巽', '坎', '艮', '坤'].includes(y.upperGua));
    assert.ok(y.meaning.length > 0);
  });

  await test('六爻：数字起卦可用', () => {
    const y = castHexagram({ method: 'numbers', num1: 7, num2: 5 });
    assert.strictEqual(y.upperGua, '艮');
    assert.strictEqual(y.lowerGua, '巽');
    assert.ok(y.hexagon.length >= 3);
  });

  await test('奇门：返回阴阳遁/局数/吉凶门', () => {
    const q = calculateQimen({ year: 2026, month: 8, day: 13 });
    assert.ok(['阳遁', '阴遁'].includes(q.yinYangDun));
    assert.ok(q.ju >= 1 && q.ju <= 9);
    assert.ok(q.luckyDoors.length >= 3);
    assert.ok(q.badDoors.length >= 4);
  });

  await test('风水：1990 男命为坎（东四命）', () => {
    const f = calculateFengshui({ year: 1990, gender: 'male' });
    assert.strictEqual(f.mingGua.num, 1);
    assert.strictEqual(f.mingGua.group, '东四命');
    assert.ok(f.goodDirections.length >= 4);
    assert.ok(f.badDirections.length >= 4);
  });

  await test('关系合盘：马(1990)×猴(1992) 生肖普通、年命相生', () => {
    const r = calculateRelationship({ a: { year: 1990 }, b: { year: 1992 } });
    assert.strictEqual(r.a.zodiac, '马');
    assert.strictEqual(r.b.zodiac, '猴');
    assert.strictEqual(r.relation, '普通');
    assert.strictEqual(r.wuxingRel, '相生');
    assert.strictEqual(r.score, 66); // 60 基础 + 6 年命相生
    assert.ok(r.wuxingTip.length > 0);
  });

  await test('解读层：M2 新体系（易/奇门/风水/合盘）均返回段落', async () => {
    const y = castHexagram({ year: 1990, month: 5, day: 20, hour: 14, method: 'time' });
    const ry = await generateReading({ system: 'yijing', data: y });
    assert.ok(ry.sections.length >= 2);
    const q = calculateQimen({ year: 2026, month: 8, day: 13 });
    const rq = await generateReading({ system: 'qimen', data: q });
    assert.ok(rq.sections.length >= 2);
    const f = calculateFengshui({ year: 1990, gender: 'male' });
    const rf = await generateReading({ system: 'fengshui', data: f });
    assert.ok(rf.sections.length >= 3);
    const rel = calculateRelationship({ a: { year: 1990 }, b: { year: 1992 } });
    const rr = await generateReading({ system: 'relationship', data: rel });
    assert.ok(rr.sections.length >= 2);
  });

  await test('解读层：八字规则解读生成结构化段落', async () => {
    const c = calculateBAZI({ year: 1990, month: 5, day: 20, hour: 14, gender: 'male' });
    const r = await generateReading({ system: 'bazi', data: c });
    assert.strictEqual(r.source, 'rule');
    assert.ok(r.sections.length >= 5);
    assert.ok(r.sections.some((s) => s.title === '总断'));
  });

  await test('解读层：生肖/塔罗均返回段落', async () => {
    const z = calculateZodiac({ year: 1990, month: 5, day: 20 });
    const rz = await generateReading({ system: 'zodiac', data: z });
    assert.ok(rz.sections.length >= 1);
    const t = drawTarot({ count: 1 });
    const rt = await generateReading({ system: 'tarot', data: t });
    assert.ok(rt.sections.length >= 1);
  });

  console.log(`\n结果：通过 ${pass} / 失败 ${fail}`);
  process.exit(fail === 0 ? 0 : 1);
}

main();
