'use strict';
/**
 * 风水择时层（八宅简版）
 * 按出生年求本命卦（东四命/西四命），给出八宅吉凶方位；并可结合当日干支给出择日提示。
 */
const { Solar } = require('lunar-javascript');

// 命卦数 → 名称与东西四命
const MING_GUA = {
  1: { name: '坎', group: '东四命' },
  2: { name: '坤', group: '西四命' },
  3: { name: '震', group: '东四命' },
  4: { name: '巽', group: '东四命' },
  5: { name: '中（男寄坤/女寄艮）', group: '西四命' },
  6: { name: '乾', group: '西四命' },
  7: { name: '兑', group: '西四命' },
  8: { name: '艮', group: '西四命' },
  9: { name: '离', group: '东四命' },
};

// 八宅吉凶方位：命卦 → {吉:[...], 凶:[...]}（方位名）
const BAZHAI = {
  坎: { 吉: ['东南(生气)', '东(天医)', '南(延年)', '北(伏位)'], 凶: ['西南(绝命)', '东北(五鬼)', '西北(六煞)', '西(祸害)'] },
  坤: { 吉: ['东北(生气)', '西(天医)', '西北(延年)', '西南(伏位)'], 凶: ['东(绝命)', '东南(五鬼)', '北(六煞)', '南(祸害)'] },
  震: { 吉: ['南(生气)', '北(天医)', '东南(延年)', '东(伏位)'], 凶: ['西(绝命)', '西北(五鬼)', '东北(六煞)', '西南(祸害)'] },
  巽: { 吉: ['北(生气)', '南(天医)', '东(延年)', '东南(伏位)'], 凶: ['西北(绝命)', '西(五鬼)', '西南(六煞)', '东北(祸害)'] },
  乾: { 吉: ['西(生气)', '东北(天医)', '西南(延年)', '西北(伏位)'], 凶: ['南(绝命)', '东(五鬼)', '东南(六煞)', '北(祸害)'] },
  兑: { 吉: ['西北(生气)', '西南(天医)', '东北(延年)', '西(伏位)'], 凶: ['东(绝命)', '南(五鬼)', '北(六煞)', '东南(祸害)'] },
  艮: { 吉: ['西南(生气)', '西北(天医)', '西(延年)', '东北(伏位)'], 凶: ['北(绝命)', '南(五鬼)', '东(六煞)', '东南(祸害)'] },
  离: { 吉: ['东(生气)', '东南(天医)', '北(延年)', '南(伏位)'], 凶: ['西北(绝命)', '西(五鬼)', '西南(六煞)', '东北(祸害)'] },
};

function mingGuaNum(year, gender) {
  const yy = Number(year) % 100;
  if (gender === 'female') {
    return ((yy - 4) % 9 + 9) % 9 || 9;
  }
  return ((100 - yy) % 9 + 9) % 9 || 9;
}

/**
 * 风水（八宅）分析
 * @param {object} input { year, gender, date? }
 */
function calculateFengshui(input) {
  const { year, gender = 'male' } = input;
  if (!year) throw new Error('缺少出生年份');
  const num = mingGuaNum(year, gender);
  const guaName = MING_GUA[num].name.split('（')[0];
  const zh = BAZHAI[guaName];

  let dateInfo = null;
  if (input.date) {
    const [yy, mm, dd] = input.date.split('-').map(Number);
    const lunar = Solar.fromYmd(yy, mm, dd).getLunar();
    const chong = { 子: '马', 丑: '羊', 寅: '猴', 卯: '鸡', 辰: '狗', 巳: '猪', 午: '鼠', 未: '牛', 申: '虎', 酉: '兔', 戌: '龙', 亥: '蛇' };
    dateInfo = {
      date: input.date,
      dayGanZhi: lunar.getDayInGanZhi(),
      chong: chong[lunar.getDayInGanZhi().charAt(1)],
    };
  }

  return {
    meta: { system: 'fengshui', birthYear: Number(year), gender: gender === 'female' ? '女' : '男' },
    mingGua: { num, name: MING_GUA[num].name, group: MING_GUA[num].group },
    goodDirections: zh.吉,
    badDirections: zh.凶,
    dateInfo,
    note: '八宅简版：方位吉凶为传统说法，供娱乐与自我觉察；装修动土请咨询专业人士。',
  };
}

module.exports = { calculateFengshui, mingGuaNum };
