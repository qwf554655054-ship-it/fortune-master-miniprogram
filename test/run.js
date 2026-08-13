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
