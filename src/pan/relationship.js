'use strict';
/**
 * 关系合盘层
 * 两人生肖：六合/三合/六冲/六害/相刑 + 年干支五行生克 → 合盘评分与评语。
 */
const { Solar } = require('lunar-javascript');

const ZODIAC_BRANCH = { 鼠: '子', 牛: '丑', 虎: '寅', 兔: '卯', 龙: '辰', 蛇: '巳', 马: '午', 羊: '未', 猴: '申', 鸡: '酉', 狗: '戌', 猪: '亥' };
const BRANCH_ZODIAC = Object.fromEntries(Object.entries(ZODIAC_BRANCH).map(([k, v]) => [v, k]));
const LIUHE = { 子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯', 辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午' };
const SANHE = [['申', '子', '辰'], ['亥', '卯', '未'], ['寅', '午', '戌'], ['巳', '酉', '丑']];
const CHONG = { 子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅', 卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳' };
const HAI = { 子: '未', 未: '子', 丑: '午', 午: '丑', 寅: '巳', 巳: '寅', 卯: '辰', 辰: '卯', 申: '亥', 亥: '申', 酉: '戌', 戌: '酉' };
const XING = { 子: '卯', 卯: '子', 寅: '巳', 巳: '申', 申: '寅', 丑: '戌', 戌: '未', 未: '丑', 辰: '辰', 午: '午', 酉: '酉', 亥: '亥' };
const GAN_WUXING = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };

function zodiacOf(year) {
  return Solar.fromYmd(Number(year), 6, 1).getLunar().getYearShengXiao();
}

function yearWuxing(year) {
  return GAN_WUXING[Solar.fromYmd(Number(year), 6, 1).getLunar().getYearGan()];
}

function inSanhe(a, b) {
  return SANHE.some((g) => g.includes(a) && g.includes(b));
}

/**
 * 关系合盘
 * @param {object} input { a:{year}, b:{year} }
 */
function calculateRelationship(input) {
  const a = input.a || {};
  const b = input.b || {};
  if (!a.year || !b.year) throw new Error('缺少双方出生年份');
  const za = zodiacOf(a.year);
  const zb = zodiacOf(b.year);
  const ba = ZODIAC_BRANCH[za];
  const bb = ZODIAC_BRANCH[zb];

  let relation = '普通';
  let score = 60;
  let detail = '生肖之间无显著冲合，属普通组合，磨合靠日常相处。';
  if (ba === bb) {
    relation = '同生肖';
    score = 70;
    detail = '同生肖组合，性格相近、彼此容易理解，但需注意固执叠加。';
  } else if (LIUHE[ba] === bb) {
    relation = '六合';
    score = 92;
    detail = '生肖六合，是传统中最合的组合之一，默契与互补度俱佳。';
  } else if (inSanhe(ba, bb)) {
    relation = '三合';
    score = 86;
    detail = '生肖三合（如申子辰、亥卯未等），相处和谐、互相助益。';
  } else if (CHONG[ba] === bb) {
    relation = '六冲';
    score = 40;
    detail = '生肖六冲，观点碰撞较多，需更多包容与沟通艺术。';
  } else if (HAI[ba] === bb) {
    relation = '六害';
    score = 48;
    detail = '生肖六害，易有心结与误会，宜开诚布公。';
  } else if (XING[ba] === bb || XING[bb] === ba) {
    relation = '相刑';
    score = 45;
    detail = '生肖相刑，关系中易生争执摩擦，需各自克制。';
  }

  // 年干支五行生克
  const wa = yearWuxing(a.year);
  const wb = yearWuxing(b.year);
  const SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
  const KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
  let wuxingRel = '比和';
  let wuxingTip = `双方年命五行同为${wa}，比和相安。`;
  if (SHENG[wa] === wb || SHENG[wb] === wa) {
    wuxingRel = '相生';
    wuxingTip = `双方年命五行（${wa}与${wb}）相生，彼此滋养、互补性强。`;
    score = Math.min(score + 6, 98);
  } else if (KE[wa] === wb || KE[wb] === wa) {
    wuxingRel = '相克';
    wuxingTip = `双方年命五行（${wa}与${wb}）相克，需在磨合中找平衡。`;
    score = Math.max(score - 5, 30);
  }

  return {
    meta: { system: 'relationship', a: { year: Number(a.year), zodiac: za }, b: { year: Number(b.year), zodiac: zb } },
    a: { year: Number(a.year), zodiac: za },
    b: { year: Number(b.year), zodiac: zb },
    relation,
    score,
    detail,
    wuxingRel,
    wuxingTip,
    note: '合盘仅供参考：生肖合盘只是关系的一个切面，真实契合度取决于三观、性格与日常经营。',
  };
}

module.exports = { calculateRelationship, zodiacOf };
