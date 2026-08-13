'use strict';
/**
 * 星盘 / 西方占星（M6 之后新增的第 13 个体系）
 * 基于 astronomy-engine 计算出生时刻十大行星的地心黄道经度，得出：
 *  - 各行星落入的星座与度数
 *  - 行星顺/逆状态
 *  - 主要相位（合/六分/四分/三分/对冲）
 * 说明：上升/宫位需出生地经纬度，本版暂未纳入（不影响行星落座与相位）。
 *       出生时间按输入的本地民用时以 UTC 解释；精确占星需时区，误差主要影响的月亮落座。
 */
const A = require('astronomy-engine');

const ZODIAC = ['白羊', '金牛', '双子', '巨蟹', '狮子', '处女', '天秤', '天蝎', '射手', '摩羯', '水瓶', '双鱼'];
const PLANETS = [
  { key: 'sun', name: '太阳', body: 'Sun' },
  { key: 'moon', name: '月亮', body: 'Moon' },
  { key: 'mercury', name: '水星', body: 'Mercury' },
  { key: 'venus', name: '金星', body: 'Venus' },
  { key: 'mars', name: '火星', body: 'Mars' },
  { key: 'jupiter', name: '木星', body: 'Jupiter' },
  { key: 'saturn', name: '土星', body: 'Saturn' },
  { key: 'uranus', name: '天王星', body: 'Uranus' },
  { key: 'neptune', name: '海王星', body: 'Neptune' },
  { key: 'pluto', name: '冥王星', body: 'Pluto' },
];

// 行星地心黄道经度（0-360）。Sun 不能用 EclipticLongitude（会抛错），统一走 GeoVector→Ecliptic。
function eclipticLongitude(body, date) {
  const vec = A.GeoVector(A.Body[body], date, false);
  return ((A.Ecliptic(vec).elon % 360) + 360) % 360;
}

function normalize180(d) {
  let x = ((d % 360) + 360) % 360;
  if (x > 180) x -= 360;
  return x;
}

function signOf(lon) {
  const idx = Math.floor(lon / 30) % 12;
  return { index: idx, name: ZODIAC[idx], degree: +(lon % 30).toFixed(2) };
}

const ASPECT_DEFS = [
  { type: '合相', angle: 0, orb: 6 },
  { type: '六分相', angle: 60, orb: 4 },
  { type: '四分相', angle: 90, orb: 6 },
  { type: '三分相', angle: 120, orb: 6 },
  { type: '对冲', angle: 180, orb: 6 },
];

/**
 * 计算星盘
 * @param {object} input { year, month, day, hour, minute }
 */
function calculateXingzhan(input) {
  const { year, month, day } = input;
  if (!year || !month || !day) throw new Error('请填写完整的出生日期');
  const hour = Number(input.hour) || 0;
  const minute = Number(input.minute) || 0;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), hour, minute));

  const planets = PLANETS.map((p) => {
    const lon = eclipticLongitude(p.body, date);
    const lonTomorrow = eclipticLongitude(p.body, new Date(date.getTime() + 86400000));
    const delta = normalize180(lonTomorrow - lon);
    const s = signOf(lon);
    return {
      key: p.key,
      name: p.name,
      sign: s.name,
      signIndex: s.index,
      longitude: +lon.toFixed(2),
      degreeInSign: s.degree,
      retrograde: delta < 0, // 经度较昨日减小 → 逆行
    };
  });

  // 相位：两两比较
  const aspects = [];
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const diff = Math.abs(normalize180(planets[i].longitude - planets[j].longitude));
      for (const def of ASPECT_DEFS) {
        const orb = Math.abs(diff - def.angle);
        if (orb <= def.orb) {
          aspects.push({
            a: planets[i].name,
            b: planets[j].name,
            aSign: planets[i].sign,
            bSign: planets[j].sign,
            type: def.type,
            angle: +diff.toFixed(1),
            orb: +orb.toFixed(1),
          });
          break;
        }
      }
    }
  }
  // 按 orb 升序（越紧密越强）
  aspects.sort((x, y) => x.orb - y.orb);

  const sun = planets.find((p) => p.key === 'sun');
  const moon = planets.find((p) => p.key === 'moon');

  return {
    meta: { system: 'xingzhan', year: Number(year), month: Number(month), day: Number(day), hour, minute },
    planets,
    aspects,
    sunSign: sun.sign,
    moonSign: moon.sign,
    note: '本结果为基于出生时刻的趣味星盘推演，仅供娱乐与自我觉察。上升/宫位需出生地信息，未在本次纳入；精确的占星还需结合时区与地点。',
  };
}

module.exports = { calculateXingzhan, ZODIAC, PLANETS };
