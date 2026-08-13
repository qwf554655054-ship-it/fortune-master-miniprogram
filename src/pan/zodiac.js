'use strict';
/**
 * 生肖运势层
 * 由出生年（生肖）与当前流年干支派生出运势关系（本命/冲/合/刑/害/破）与概览。
 * 更细的解读由 AI 解读层结合知识库生成。
 */
const { Solar, EightChar, Lunar } = require('lunar-javascript');

const ZODIAC = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const ZODIAC_BRANCH = { 鼠: '子', 牛: '丑', 虎: '寅', 兔: '卯', 龙: '辰', 蛇: '巳', 马: '午', 羊: '未', 猴: '申', 鸡: '酉', 狗: '戌', 猪: '亥' };
const BRANCH_ZODIAC = Object.fromEntries(Object.entries(ZODIAC_BRANCH).map(([k, v]) => [v, k]));
// 六冲（地支相冲）
const CHONG = { 子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅', 卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳' };
// 六合
const HE = { 子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯', 辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午' };

function currentYearGanZhi() {
  const now = new Date();
  const solar = Solar.fromYmd(now.getFullYear(), 1, 1);
  const eight = EightChar.fromLunar(solar.getLunar());
  return eight.getYear();
}

/**
 * 计算生肖运势
 * @param {object} input { year, month, day }
 */
function calculateZodiac(input) {
  const { year } = input;
  if (!year) throw new Error('缺少出生年份');
  const solar = Solar.fromYmd(Number(year), Number(input.month || 1), Number(input.day || 1));
  const shengXiao = solar.getLunar().getYearShengXiao();
  const birthBranch = ZODIAC_BRANCH[shengXiao];

  const curGZ = currentYearGanZhi();
  const curYear = new Date().getFullYear();
  const curSolar = Solar.fromYmd(curYear, 1, 1);
  const curShengXiao = curSolar.getLunar().getYearShengXiao();
  const curBranch = ZODIAC_BRANCH[curShengXiao];

  let relation = '平稳';
  let relationDetail = '今年与你的生肖无特殊刑冲，运势相对平稳。';
  if (shengXiao === curShengXiao) {
    relation = '本命年';
    relationDetail = '值太岁（本命年），传统认为宜静不宜动，注意健康与变动，可佩红或安太岁化解。';
  } else if (CHONG[birthBranch] === curBranch) {
    relation = '冲太岁';
    relationDetail = '冲太岁之年，易有变动、冲突，重大决策宜缓，注意人际关系与出行安全。';
  } else if (HE[birthBranch] === curBranch) {
    relation = '六合';
    relationDetail = '六合之年，贵人运佳，合作、姻缘、事业易有良机，宜把握。';
  }

  const age = curYear - Number(year);

  return {
    meta: { system: 'zodiac', birthYear: Number(year), currentYear: curYear },
    shengXiao,
    birthBranch,
    currentYearGanZhi: curGZ,
    currentZodiac: curShengXiao,
    age,
    relation,
    relationDetail,
  };
}

module.exports = { calculateZodiac, ZODIAC, ZODIAC_BRANCH, BRANCH_ZODIAC, CHONG, HE };
