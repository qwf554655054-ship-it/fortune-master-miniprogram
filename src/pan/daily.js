'use strict';
/**
 * 每日运势层
 * 出生生肖 + 指定日期（默认今天）的日干支，判定冲合关系与简易评级。
 */
const { Solar } = require('lunar-javascript');

const ZODIAC_BRANCH = { 鼠: '子', 牛: '丑', 虎: '寅', 兔: '卯', 龙: '辰', 蛇: '巳', 马: '午', 羊: '未', 猴: '申', 鸡: '酉', 狗: '戌', 猪: '亥' };
const BRANCH_ZODIAC = Object.fromEntries(Object.entries(ZODIAC_BRANCH).map(([k, v]) => [v, k]));
const CHONG = { 子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅', 卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳' };
const HE = { 子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯', 辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午' };
const LUCKY_COLOR = { 木: '青绿', 火: '红紫', 土: '黄棕', 金: '白金银', 水: '黑蓝' };

function dayWuxing(zhi) {
  return { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' }[zhi];
}

/**
 * 计算每日运势
 * @param {object} input { year: 出生年份, date?: 'YYYY-MM-DD'（默认今天） }
 */
function calculateDaily(input) {
  const { year } = input;
  if (!year) throw new Error('缺少出生年份');
  // 用年中参考日取该农历年的生肖（按年份口径，1990 → 马，符合大众认知）
  const birthZodiac = Solar.fromYmd(Number(year), 6, 1).getLunar().getYearShengXiao();
  const birthBranch = ZODIAC_BRANCH[birthZodiac];

  let solar;
  if (input.date) {
    const [yy, mm, dd] = input.date.split('-').map(Number);
    solar = Solar.fromYmd(yy, mm, dd);
  } else {
    const now = new Date();
    solar = Solar.fromYmd(now.getFullYear(), now.getMonth() + 1, now.getDate());
  }
  const lunar = solar.getLunar();
  const dayGZ = lunar.getDayInGanZhi();
  const dayZhi = dayGZ.charAt(1);
  const dayZodiac = BRANCH_ZODIAC[dayZhi];
  const chongZodiac = BRANCH_ZODIAC[CHONG[dayZhi]];

  let relation = '平稳';
  let rating = '平';
  let detail = '今日与你生肖无特殊冲合，按部就班即可。';
  if (birthBranch === dayZhi) {
    relation = '值日';
    rating = '吉';
    detail = '今日是你的本气之日，状态在线，适合推进重要事务。';
  } else if (CHONG[birthBranch] === dayZhi) {
    relation = '冲煞';
    rating = '慎';
    detail = '今日冲你的生肖，宜稳不宜急，重要决策可缓，注意出行与口舌。';
  } else if (HE[birthBranch] === dayZhi) {
    relation = '六合';
    rating = '优';
    detail = '今日与你生肖六合，贵人缘佳，合作、沟通、情感皆宜。';
  }

  return {
    meta: {
      system: 'daily',
      birthYear: Number(year),
      date: `${solar.getYear()}-${String(solar.getMonth()).padStart(2, '0')}-${String(solar.getDay()).padStart(2, '0')}`,
      lunarDate: `${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
    },
    birthZodiac,
    dayGanZhi: dayGZ,
    dayZodiac,
    chongZodiac,
    relation,
    rating,
    detail,
    luckyColor: LUCKY_COLOR[dayWuxing(dayZhi)],
    luckyNumber: (dayZhi.length * 3 + birthBranch.length * 5) % 10, // 简易趣味数字
  };
}

module.exports = { calculateDaily };
