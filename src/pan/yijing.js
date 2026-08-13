'use strict';
/**
 * 六爻/梅花易数起卦层
 * 支持：时间起卦（年支数+农历月日时）、数字起卦（梅花易数）。
 * 输出：上卦/下卦/动爻/本卦（六十四卦名与释义）。
 */
const { Solar } = require('lunar-javascript');

// 先天八卦数：卦 → 数
const GUA_NUM = { 乾: 1, 兑: 2, 离: 3, 震: 4, 巽: 5, 坎: 6, 艮: 7, 坤: 8 };
// 余数 → 卦
const NUM_GUA = { 1: '乾', 2: '兑', 3: '离', 4: '震', 5: '巽', 6: '坎', 7: '艮', 0: '坤' };
const ZHI_NUM = { 子: 1, 丑: 2, 寅: 3, 卯: 4, 辰: 5, 巳: 6, 午: 7, 未: 8, 申: 9, 酉: 10, 戌: 11, 亥: 12 };
const HOUR_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 六十四卦表：行=上卦（先天序），列=下卦（先天序）
const HEX_TABLE = [
  ['乾为天', '泽天夬', '火天大有', '雷天大壮', '风天小畜', '水天需', '山天大畜', '地天泰'],
  ['天泽履', '兑为泽', '火泽睽', '雷泽归妹', '风泽中孚', '水泽节', '山泽损', '地泽临'],
  ['天火同人', '泽火革', '离为火', '雷火丰', '风火家人', '水火既济', '山火贲', '地火明夷'],
  ['天雷无妄', '泽雷随', '火雷噬嗑', '震为雷', '风雷益', '水雷屯', '山雷颐', '地雷复'],
  ['天风姤', '泽风大过', '火风鼎', '雷风恒', '巽为风', '水风井', '山风蛊', '地风升'],
  ['天水讼', '泽水困', '火水未济', '雷水解', '风水涣', '坎为水', '山水蒙', '地水师'],
  ['天山遁', '泽山咸', '火山旅', '雷山小过', '风山渐', '水山蹇', '艮为山', '地山谦'],
  ['天地否', '泽地萃', '火地晋', '雷地豫', '风地观', '水地比', '山地剥', '坤为地'],
];

const HEX_MEANING = {
  乾为天: '刚健自强，大吉之象。', 泽天夬: '果断决断，除去障碍。', 火天大有: '大有收获，光明盛大。', 雷天大壮: '声势壮大，宜守正不妄动。',
  风天小畜: '小有积蓄，蓄势待发。', 水天需: '等待时机，守正待时。', 山天大畜: '大蓄养，厚积薄发。', 地天泰: '天地交泰，亨通安泰。',
  天泽履: '如履薄冰，谨慎前行。', 兑为泽: '喜悦交流，和悦相处。', 火泽睽: '背离分歧，求同存异。', 雷泽归妹: '归嫁之象，重在协调。',
  风泽中孚: '诚信立身，中正守信。', 水泽节: '节制有度，适可而止。', 山泽损: '减损自省，损己利人。', 地泽临: '临近督导，顺势而为。',
  天火同人: '同心协力，志同道合。', 泽火革: '变革革新，除旧布新。', 离为火: '光明依附，明丽向上。', 雷火丰: '丰盛盛大，把握时机。',
  风火家人: '家和万事兴，各安其位。', 水火既济: '事已成就，守成防变。', 山火贲: '文饰美化，表里如一。', 地火明夷: '光明受伤，韬光养晦。',
  天雷无妄: '无妄之灾，守正免咎。', 泽雷随: '随顺时势，随遇而安。', 火雷噬嗑: '咬合破阻，明断是非。', 震为雷: '震动奋起，临危不惧。',
  风雷益: '增益进步，损上益下。', 水雷屯: '万事开头难，宜稳建基。', 山雷颐: '颐养之道，慎言节食。', 地雷复: '一阳来复，生机重现。',
  天风姤: '不期而遇，防微杜渐。', 泽风大过: '非常之时，须行非常之举。', 火风鼎: '鼎新革故，稳重求成。', 雷风恒: '恒久之道，贵在坚持。',
  巽为风: '柔顺谦逊，渐进渗透。', 水风井: '井养不穷，修己养人。', 山风蛊: '积弊整顿，拨乱反正。', 地风升: '上升进步，积小成大。',
  天水讼: '争讼不和，宜退避调解。', 泽水困: '困顿守志，处困而亨。', 火水未济: '事未成，慎终如始。', 雷水解: '解除困难，险难消散。',
  风水涣: '涣散疏解，聚心重建。', 坎为水: '险陷重重，行险用柔。', 山水蒙: '蒙昧启蒙，虚心求教。', 地水师: '兴师动众，师出有名。',
  天山遁: '退避隐遁，以退为进。', 泽山咸: '感应相合，两情相悦。', 火山旅: '旅行漂泊，安定为上。', 雷山小过: '小有过越，宜柔宜慎。',
  风山渐: '循序渐进，稳步发展。', 水山蹇: '险阻艰难，见险能止。', 艮为山: '静止安止，知止不殆。', 地山谦: '谦虚受益，满招损。',
  天地否: '闭塞不通，俭德避难。', 泽地萃: '荟萃聚集，团结人心。', 火地晋: '晋升进取，光明渐盛。', 雷地豫: '愉悦和乐，豫备有度。',
  风地观: '观察省思，观风知俗。', 水地比: '亲比和睦，择善而从。', 山地剥: '剥落衰败，顺势养晦。', 坤为地: '厚德载物，柔顺包容。',
};

function hourZhiNum(hour) { return HOUR_ZHI.indexOf(HOUR_ZHI[Math.floor(((Number(hour) + 1) % 24) / 2)]); }

function findHexagon(upperGua, lowerGua) {
  const u = GUA_NUM[upperGua] - 1;
  const l = GUA_NUM[lowerGua] - 1;
  const name = HEX_TABLE[u][l];
  return { name, meaning: HEX_MEANING[name] || '' };
}

/**
 * 起卦
 * @param {object} input { method: 'time'|'numbers', year,month,day,hour, num1, num2 }
 */
function castHexagram(input) {
  let upper, lower, moving;
  if (input.method === 'numbers') {
    const n1 = Number(input.num1 || 0);
    const n2 = Number(input.num2 || 0);
    if (!n1 || !n2) throw new Error('数字起卦需提供两个非零数字');
    upper = n1 % 8;
    lower = n2 % 8;
    moving = (n1 + n2) % 6;
  } else {
    const { year, month, day, hour = 0 } = input;
    if (!year || !month || !day) throw new Error('缺少起卦时间');
    const solar = Solar.fromYmdHms(Number(year), Number(month), Number(day), Number(hour), 0, 0);
    const lunar = solar.getLunar();
    const yZhiNum = ZHI_NUM[lunar.getYearZhi()];
    const lMonth = Math.abs(lunar.getMonth());
    const lDay = lunar.getDay();
    const hNum = hourZhiNum(hour) + 1;
    const s1 = yZhiNum + lMonth + lDay;
    const s2 = s1 + hNum;
    upper = s1 % 8;
    lower = s2 % 8;
    moving = s2 % 6;
  }
  const upperGua = NUM_GUA[upper];
  const lowerGua = NUM_GUA[lower];
  const movingLine = moving === 0 ? 6 : moving;
  const hex = findHexagon(upperGua, lowerGua);
  return {
    meta: { system: 'yijing', method: input.method || 'time', input: input.method === 'numbers' ? `${input.num1}、${input.num2}` : `${input.year}-${input.month}-${input.day} ${input.hour || 0}时` },
    upperGua,
    lowerGua,
    movingLine,
    hexagon: hex.name,
    meaning: hex.meaning,
    note: '本卦已出（互卦/变卦留待进阶版本）；动爻' + movingLine + '爻提示变化之机。',
  };
}

module.exports = { castHexagram, HEX_TABLE, HEX_MEANING };
