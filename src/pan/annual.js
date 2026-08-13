'use strict';
/**
 * 年运/月运层（M5）
 * 生肖 + 目标年份（默认当年）的流年关系；并给出目标年 12 个月的逐月关系概要。
 * 分领域运势（事业/感情/健康/财运）由解读层结合知识生成。
 */
const { Solar } = require('lunar-javascript');
const { ZODIAC_BRANCH, BRANCH_ZODIAC, CHONG, HE } = require('./zodiac');

function zodiacOfYear(year) {
  return Solar.fromYmd(Number(year), 6, 1).getLunar().getYearShengXiao();
}

function relationOf(birthBranch, targetBranch) {
  if (birthBranch === targetBranch) return { relation: '值太岁（本命年）', score: 70, detail: '本命年，传统认为宜稳不宜动，注意健康与变动，可安太岁、佩红化解。' };
  if (CHONG[birthBranch] === targetBranch) return { relation: '冲太岁', score: 40, detail: '冲太岁之年，易有变动与冲突，重大决策宜缓，注意人际与出行安全。' };
  if (HE[birthBranch] === targetBranch) return { relation: '六合', score: 90, detail: '六合之年，贵人运佳，合作、姻缘、事业易有良机，宜主动把握。' };
  return { relation: '平稳', score: 65, detail: '今年与你的生肖无特殊刑冲，整体平稳，按部就班、稳步推进即可。' };
}

/**
 * 年运
 * @param {object} input { year: 出生年, targetYear?: 目标年（默认当年） }
 */
function calculateAnnual(input) {
  const { year } = input;
  if (!year) throw new Error('缺少出生年份');
  const targetYear = Number(input.targetYear) || new Date().getFullYear();
  const birthZodiac = zodiacOfYear(year);
  const birthBranch = ZODIAC_BRANCH[birthZodiac];
  const targetSolar = Solar.fromYmd(targetYear, 6, 1);
  const targetGanZhi = targetSolar.getLunar().getYearInGanZhi();
  const targetZodiac = zodiacOfYear(targetYear);
  const rel = relationOf(birthBranch, ZODIAC_BRANCH[targetZodiac]);

  // 12 个月逐月关系（用每月初一的月支）
  const months = [];
  for (let m = 1; m <= 12; m++) {
    const ml = Solar.fromYmd(targetYear, m, 1).getLunar();
    const mGZ = ml.getMonthInGanZhi();
    const mZhi = mGZ.charAt(1);
    const mRel = relationOf(birthBranch, mZhi);
    months.push({ month: m, ganZhi: mGZ, relation: mRel.relation, score: mRel.score });
  }
  const best = months.reduce((a, b) => (b.score > a.score ? b : a));
  const worst = months.reduce((a, b) => (b.score < a.score ? b : a));

  return {
    meta: { system: 'annual', birthYear: Number(year), targetYear, birthZodiac },
    birthZodiac,
    targetYear,
    targetGanZhi,
    targetZodiac,
    relation: rel.relation,
    score: rel.score,
    detail: rel.detail,
    months,
    bestMonth: best.month,
    worstMonth: worst.month,
  };
}

/**
 * 月运
 * @param {object} input { year: 出生年, targetYear?: 目标年, month?: 目标月（默认当月） }
 */
function calculateMonthly(input) {
  const { year } = input;
  if (!year) throw new Error('缺少出生年份');
  const targetYear = Number(input.targetYear) || new Date().getFullYear();
  const month = Number(input.month) || (new Date().getMonth() + 1);
  const birthZodiac = zodiacOfYear(year);
  const birthBranch = ZODIAC_BRANCH[birthZodiac];
  const ml = Solar.fromYmd(targetYear, month, 1).getLunar();
  const mGZ = ml.getMonthInGanZhi();
  const rel = relationOf(birthBranch, mGZ.charAt(1));

  return {
    meta: { system: 'monthly', birthYear: Number(year), birthZodiac, targetYear, month },
    birthZodiac,
    month,
    monthGanZhi: mGZ,
    relation: rel.relation,
    score: rel.score,
    detail: rel.detail,
  };
}

module.exports = { calculateAnnual, calculateMonthly, zodiacOfYear };
