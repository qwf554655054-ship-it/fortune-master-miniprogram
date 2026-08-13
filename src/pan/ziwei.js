'use strict';
/**
 * 紫微斗数排盘层（简版核心）
 * 自研安星：命宫/身宫（寅起正月、逆/顺数生时）、五虎遁定天干、
 * 命宫纳音定五行局、局数+生日定紫微、天府对宫、十四主星安放、十二宫。
 * 说明：本版仅安十四主星与十二宫，辅星（左辅右弼/文昌文曲/禄存等）留待后续版本。
 */
const { Solar } = require('lunar-javascript');

const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 五虎遁：年干 → 寅月天干索引（丙=2,戊=4,庚=6,壬=8,甲=0）
const WUHU = { 甲: 2, 乙: 4, 丙: 6, 丁: 8, 戊: 0, 己: 2, 庚: 4, 辛: 6, 壬: 8, 癸: 0 };

// 六十甲子纳音五行（依序 甲子..癸亥，每字一五行）
const NAYIN60 =
  '金金火火木木土土金金火火水水土土金金木木水水土土火火木木水水金金火火木木土土金金' +
  '火火水水土土金金木木水水土土火火木木水水';
const JU = { 水: 2, 木: 3, 金: 4, 土: 5, 火: 6 }; // 五行→局数
const JU_START = { 2: 1, 3: 2, 4: 2, 5: 3, 6: 3 }; // 局数→紫微起始地支序（丑=1,寅=2,卯=3）

const PALACE_NAMES = ['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄', '迁移', '仆役', '官禄', '田宅', '福德', '父母'];

// 时辰序（子0..亥11）
function hourIndex(hour) {
  return Math.floor((((Number(hour) + 1) % 24) / 2)) % 12;
}

// 由干支索引组合求六十甲子序号（ganIndex≡i mod 10, zhiIndex≡i mod 12）
function pairIndex(g, z) {
  const k = ((((g - z) / 2) % 6) + 6) % 6;
  return (g + 10 * k) % 60;
}

function ganZhiAt(ganIdx, zhiIdx) {
  return GAN[((ganIdx % 10) + 10) % 10] + ZHI[((zhiIdx % 12) + 12) % 12];
}

/**
 * 计算紫微斗数命盘（简版）
 */
function calculateZiwei(input) {
  const { year, month, day, hour = 0, gender = 'male' } = input;
  if (!year || !month || !day) throw new Error('缺少出生年月日');
  const solar = Solar.fromYmdHms(Number(year), Number(month), Number(day), Number(hour), 0, 0);
  const lunar = solar.getLunar();
  const lMonth = Math.abs(lunar.getMonth());
  const lDay = lunar.getDay();
  const hIdx = hourIndex(hour);
  const yearGan = lunar.getYearGan();
  const yinGanIdx = WUHU[yearGan];

  // 命宫地支：寅(2)起正月顺数生月，再逆数生时
  const mingZhiIdx = (((2 + (lMonth - 1) - hIdx) % 12) + 12) % 12;
  const mingGanIdx = ((yinGanIdx + (mingZhiIdx - 2)) % 10 + 10) % 10;
  // 身宫：寅起正月顺数生月，再顺数生时
  const shenZhiIdx = (((2 + (lMonth - 1) + hIdx) % 12) + 12) % 12;
  const shenGanIdx = ((yinGanIdx + (shenZhiIdx - 2)) % 10 + 10) % 10;

  // 命宫纳音 → 五行局
  const mingNayin = NAYIN60[pairIndex(mingGanIdx, mingZhiIdx)];
  const ju = JU[mingNayin];

  // 紫微：起始宫 + floor((生日-1)/局数) 步进
  const ziweiZhiIdx = (JU_START[ju] + Math.floor((lDay - 1) / ju)) % 12;
  const ziweiGanIdx = ((yinGanIdx + (ziweiZhiIdx - 2)) % 10 + 10) % 10;
  // 天府：紫微的对宫偏移公式
  const tianfuZhiIdx = (((ziweiZhiIdx + 4 - 2 * (ziweiZhiIdx % 6)) % 12) + 12) % 12;

  // 十四主星安放
  const ziweiSystem = ['紫微', '天机', '太阳', '武曲', '天同', '廉贞']; // 自紫微逆时针
  const tianfuSystem = ['天府', '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', '破军']; // 自天府顺时针
  const starZhi = {};
  ziweiSystem.forEach((s, i) => { starZhi[s] = (((ziweiZhiIdx - i) % 12) + 12) % 12; });
  tianfuSystem.forEach((s, i) => { starZhi[s] = (((tianfuZhiIdx + i) % 12) + 12) % 12; });

  // 十二宫（命宫起逆时针）
  const palaces = PALACE_NAMES.map((name, k) => {
    const zhiIdx = (((mingZhiIdx - k) % 12) + 12) % 12;
    const ganIdx = ((yinGanIdx + (zhiIdx - 2)) % 10 + 10) % 10;
    const mainStars = Object.entries(starZhi).filter(([, z]) => z === zhiIdx).map(([n]) => n);
    return { name, ganzhi: ganZhiAt(ganIdx, zhiIdx), gan: GAN[ganIdx], zhi: ZHI[zhiIdx], mainStars };
  });
  const zhiToPalace = {};
  palaces.forEach((p) => { zhiToPalace[p.zhi] = p.name; });
  const stars = {};
  Object.entries(starZhi).forEach(([n, z]) => { stars[n] = zhiToPalace[ZHI[z]] || ZHI[z]; });

  return {
    meta: {
      system: 'ziwei',
      birth: { year: Number(year), month: Number(month), day: Number(day), hour: Number(hour) },
      gender: gender === 'female' ? '女' : '男',
      lunarDate: `${lunar.getYearInGanZhi()}年 ${lunar.getMonthInChinese()}月 ${lunar.getDayInChinese()}`,
    },
    xingWuju: `${mingNayin}${ju}局`,
    mingGong: { ganzhi: ganZhiAt(mingGanIdx, mingZhiIdx), gan: GAN[mingGanIdx], zhi: ZHI[mingZhiIdx] },
    shenGong: { ganzhi: ganZhiAt(shenGanIdx, shenZhiIdx), gan: GAN[shenGanIdx], zhi: ZHI[shenZhiIdx] },
    ziweiAt: ganZhiAt(ziweiGanIdx, ziweiZhiIdx),
    palaces,
    stars,
    note: '简版紫微：仅安十四主星与十二宫，辅星留待后续版本。',
  };
}

module.exports = { calculateZiwei };
