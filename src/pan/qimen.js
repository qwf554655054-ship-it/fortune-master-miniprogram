'use strict';
/**
 * 奇门遁甲排盘层（演示简化版）
 * 说明：完整奇门需节气定局、旬首符头、三元置闰、值符值使与门星神旋转。
 * 本版为「演示版」：按节气判阴阳遁、按日干支近似定局数，输出九宫八门图与吉凶方位，
 * 供体验与 AI 框架解读使用，不作精确断事依据。
 */
const { Solar } = require('lunar-javascript');

const JIEQI_YANG = ['冬至', '小寒', '大寒', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨', '立夏', '小满', '芒种'];

// 24 节气近似日期（月,日）
const JIEQI_APPROX = [
  ['小寒', 1, 6], ['大寒', 1, 20], ['立春', 2, 4], ['雨水', 2, 19], ['惊蛰', 3, 6], ['春分', 3, 21],
  ['清明', 4, 5], ['谷雨', 4, 20], ['立夏', 5, 6], ['小满', 5, 21], ['芒种', 6, 6], ['夏至', 6, 21],
  ['小暑', 7, 7], ['大暑', 7, 23], ['立秋', 8, 8], ['处暑', 8, 23], ['白露', 9, 8], ['秋分', 9, 23],
  ['寒露', 10, 8], ['霜降', 10, 23], ['立冬', 11, 7], ['小雪', 11, 22], ['大雪', 12, 7], ['冬至', 12, 22],
];

// 按公历日期返回最近已过的节气名（近似）
function approxJieQi(year, month, day) {
  let cur = '冬至'; // 年初未到小寒时视为上年冬至
  for (const [name, m, d] of JIEQI_APPROX) {
    if (m < month || (m === month && d <= day)) cur = name;
  }
  return cur;
}

// 九宫：宫数 → 方位/五行/门（原始位）
const PALACE = {
  1: { pos: '北', door: '休门', lucky: true },
  2: { pos: '西南', door: '死门', lucky: false },
  3: { pos: '东', door: '伤门', lucky: false },
  4: { pos: '东南', door: '杜门', lucky: false },
  5: { pos: '中', door: '—', lucky: false },
  6: { pos: '西北', door: '开门', lucky: true },
  7: { pos: '西', door: '惊门', lucky: false },
  8: { pos: '东北', door: '生门', lucky: true },
  9: { pos: '南', door: '景门', lucky: false },
};

/**
 * 奇门排盘（演示版）
 * @param {object} input { year, month, day, hour? }
 */
function calculateQimen(input) {
  const { year, month, day } = input;
  if (!year || !month || !day) throw new Error('缺少日期');
  const solar = Solar.fromYmd(Number(year), Number(month), Number(day));
  const lunar = solar.getLunar();
  const jieQi = approxJieQi(Number(year), Number(month), Number(day));

  // 阴阳遁：冬至→夏至 阳遁；夏至→冬至 阴遁
  const yangDun = JIEQI_YANG.includes(jieQi);
  // 局数（近似）：日干支序号 mod 9 + 1，仅演示
  const dayGZ = lunar.getDayInGanZhi();
  const dayIndex = (['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'].indexOf(dayGZ.charAt(0)) * 6
    + ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'].indexOf(dayGZ.charAt(1))) % 60;
  const ju = (dayIndex % 9) + 1;

  // 八门吉凶方位（演示：吉门三处）
  const palaces = Object.entries(PALACE).map(([num, p]) => ({ num: Number(num), ...p }));
  const luckyDoors = palaces.filter((p) => p.lucky && p.door !== '—').map((p) => `${p.door}(${p.pos})`);
  const badDoors = palaces.filter((p) => !p.lucky && p.door !== '—').map((p) => `${p.door}(${p.pos})`);

  return {
    meta: {
      system: 'qimen',
      date: `${solar.getYear()}-${String(solar.getMonth()).padStart(2, '0')}-${String(solar.getDay()).padStart(2, '0')}`,
      jieQi: jieQi || '（未知节气）',
    },
    yinYangDun: yangDun ? '阳遁' : '阴遁',
    ju,
    dayGanZhi: dayGZ,
    luckyDoors,
    badDoors,
    note: '演示简化版：局数为日干支近似，未含值符值使与门星旋转。仅供娱乐体验。',
  };
}

module.exports = { calculateQimen };
