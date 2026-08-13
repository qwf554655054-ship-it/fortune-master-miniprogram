'use strict';
/**
 * 八字排盘层
 * 基于 lunar-javascript 进行确定性排盘，输出结构化命盘 JSON。
 * 输入：公历出生年月日时分 + 性别；输出：四柱、五行、十神、大运、胎元命宫等。
 */
const { Solar, EightChar } = require('lunar-javascript');

const GAN_WUXING = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
const ZHI_WUXING = { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' };

const PILLAR_KEYS = [
  { key: 'year', name: '年柱' },
  { key: 'month', name: '月柱' },
  { key: 'day', name: '日柱' },
  { key: 'time', name: '时柱' },
];

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

/**
 * 计算八字命盘
 * @param {object} input { year, month, day, hour, minute, gender: 'male'|'female' }
 * @returns {object} 结构化命盘
 */
function calculateBAZI(input) {
  const { year, month, day, hour, minute = 0, gender = 'male' } = input;
  if (!year || !month || !day) throw new Error('缺少出生年月日');

  const solar = Solar.fromYmdHms(Number(year), Number(month), Number(day), Number(hour || 0), Number(minute || 0), 0);
  const lunar = solar.getLunar();
  const eight = EightChar.fromLunar(lunar);
  const genderNum = (gender === 'female' || gender === 0) ? 0 : 1;

  // 四柱
  const fourPillars = PILLAR_KEYS.map(({ key, name }) => {
    const ganzhi = eight['get' + cap(key)]();
    const gan = ganzhi.charAt(0);
    const zhi = ganzhi.charAt(1);
    return {
      name,
      ganzhi,
      gan,
      zhi,
      ganWuxing: GAN_WUXING[gan],
      zhiWuxing: ZHI_WUXING[zhi],
      nayin: eight['get' + cap(key) + 'NaYin'](),
      hideGan: eight['get' + cap(key) + 'HideGan']() || [],
      shiShenGan: eight['get' + cap(key) + 'ShiShenGan'](),
      shiShenZhi: eight['get' + cap(key) + 'ShiShenZhi']() || [],
      xunKong: eight['get' + cap(key) + 'XunKong'](),
      diShi: eight['get' + cap(key) + 'DiShi'](),
    };
  });

  const dayGan = eight.getDay().charAt(0);
  const dayMaster = {
    ganzhi: eight.getDay(),
    gan: dayGan,
    wuxing: GAN_WUXING[dayGan],
  };

  // 五行统计（天干4 + 地支本气4 + 藏干）
  const wuxingTally = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  fourPillars.forEach((pl) => {
    wuxingTally[pl.ganWuxing]++;
    wuxingTally[pl.zhiWuxing]++;
    pl.hideGan.forEach((g) => { if (GAN_WUXING[g]) wuxingTally[GAN_WUXING[g]]++; });
  });
  const total = Object.values(wuxingTally).reduce((a, b) => a + b, 0);
  const wuxingPercent = {};
  for (const k of Object.keys(wuxingTally)) wuxingPercent[k] = Math.round((wuxingTally[k] / total) * 100);
  // 最弱（缺）与最强
  const sorted = Object.entries(wuxingTally).sort((a, b) => a[1] - b[1]);
  const weakest = sorted[0];
  const strongest = sorted[sorted.length - 1];

  // 日主强弱（简化参考：同五行支持数 vs 克制耗泄数）
  const support = wuxingTally[dayMaster.wuxing];
  const strengthRef = support >= Math.ceil(total / 5 * 2) ? '偏强' : (support <= Math.floor(total / 5) ? '偏弱' : '中和');

  // 大运
  const yun = eight.getYun(genderNum, 1);
  const daYunRaw = yun.getDaYun();
  const daYun = daYunRaw
    .filter((d) => d.getGanZhi())
    .map((d, i) => ({
      index: i + 1,
      ganzhi: d.getGanZhi(),
      startAge: d.getStartAge(),
      endAge: d.getEndAge(),
      startYear: d.getStartYear(),
    }));
  const firstReal = daYunRaw.find((d) => d.getGanZhi());
  const qiYunAge = firstReal ? firstReal.getStartAge() : null;

  return {
    meta: {
      system: 'bazi',
      calendar: '公历',
      birth: { year: Number(year), month: Number(month), day: Number(day), hour: Number(hour || 0), minute: Number(minute || 0) },
      gender: genderNum === 1 ? '男' : '女',
      lunarDate: `${lunar.getYearInGanZhi()}年 ${lunar.getMonthInChinese()}月 ${lunar.getDayInChinese()}`,
      isLeapMonth: lunar.getMonth() < 0,
    },
    fourPillars,
    dayMaster,
    wuxingTally,
    wuxingPercent,
    fiveElements: { weakest: weakest[0], weakestCount: weakest[1], strongest: strongest[0], strongestCount: strongest[1] },
    dayMasterStrength: strengthRef,
    daYun,
    qiYunAge,
    taiYuan: eight.getTaiYuan(),
    mingGong: eight.getMingGong(),
    shenGong: eight.getShenGong(),
    shengXiao: lunar.getYearShengXiao(),
  };
}

module.exports = { calculateBAZI, GAN_WUXING, ZHI_WUXING };
