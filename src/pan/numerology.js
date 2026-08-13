'use strict';
/**
 * 数字命理层
 * 基于出生日期计算：生命灵数（主数）、天赋数、生日数、缺失数。
 */
const NUM_MEANING = {
  1: '开创与独立。天生领导者，行动力强，适合开疆拓土；注意避免独断。',
  2: '合作与平衡。温和细腻，擅长协调；需练习自我主张，避免过度依赖。',
  3: '表达与创造。有感染力、多才多艺；注意专注度，避免三分钟热度。',
  4: '稳健与秩序。务实可靠，适合长期积累；避免僵化与过度保守。',
  5: '自由与变化。热爱探索、适应力强；需自律，避免漂泊不定。',
  6: '责任与爱。顾家重情，责任感强；避免过度付出而忽略自己。',
  7: '探索与智慧。理性内省，擅长钻研；注意别陷入孤立与多疑。',
  8: '权力与成就。目标感强、善于掌控资源；需平衡野心与道德。',
  9: '智慧与完成。大爱利他、格局开阔；注意放下执念与过度理想化。',
  11: '灵性导师（主数）。直觉敏锐、具启示性；需稳定情绪，勿透支自我。',
  22: '建筑大师（主数）。能将理想落地为现实；责任重大，注意劳逸结合。',
  33: '大爱疗愈（主数）。能量纯净、愿服务他人；务必先照顾好自己。',
};

function reduceToMaster(n) {
  let s = n;
  while (s > 9 && s !== 11 && s !== 22 && s !== 33) {
    s = String(s).split('').reduce((a, b) => a + Number(b), 0);
  }
  return s;
}

function sumDigits(n) {
  return String(n).split('').reduce((a, b) => a + Number(b), 0);
}

/**
 * 计算数字命理
 * @param {object} input { year, month, day }
 */
function calculateNumerology(input) {
  const { year, month, day } = input;
  if (!year || !month || !day) throw new Error('缺少出生年月日');
  const y = String(Number(year));
  const m = String(Number(month)).padStart(2, '0');
  const d = String(Number(day)).padStart(2, '0');
  const digits = (y + m + d).split('').map(Number);

  const lifePath = reduceToMaster(digits.reduce((a, b) => a + b, 0));
  const talent = [reduceToMaster(Number(m) + Number(d)), reduceToMaster(Number(d) + Number(y))];
  const birthday = reduceToMaster(Number(d));
  const missing = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter((n) => !digits.includes(n));

  return {
    meta: { system: 'numerology', birth: { year: Number(year), month: Number(month), day: Number(day) } },
    lifePath: { number: lifePath, meaning: NUM_MEANING[lifePath] },
    talent: talent.map((n) => ({ number: n, meaning: NUM_MEANING[n] })),
    birthday: { number: birthday, meaning: NUM_MEANING[birthday] },
    missing,
  };
}

module.exports = { calculateNumerology, NUM_MEANING };
