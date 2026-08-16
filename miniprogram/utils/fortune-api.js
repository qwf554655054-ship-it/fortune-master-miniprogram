// 运势数据层
// 设计：优先拉取后端接口，失败（无后端 / 超时 / 报错）自动回退本地确定性算法。
// 接入真实后端：把 BASE 改成你的接口地址（如 https://api.example.com），并把 USE_REMOTE 设为 true。
// 后端约定（GET）：
//   /fortune/daily-sign?date=YYYY-MM-DD  -> { no, title, text }
//   /fortune/zodiac?zodiac=鼠            -> { career, wealth, love, text }
//   /fortune/horoscope?sign=白羊         -> { career, wealth, love, text }

const BASE = '';
const USE_REMOTE = false;

const ZODIACS = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
const SIGNS = ['白羊', '金牛', '双子', '巨蟹', '狮子', '处女', '天秤', '天蝎', '射手', '摩羯', '水瓶', '双鱼'];

const DRAWS = [
  { no: 1, title: '上上签', text: '云开见月明，谋事多顺遂。今日宜主动出击，贵人已在途中。' },
  { no: 2, title: '上签', text: '春风得意马蹄疾，凡事可期。保持耐心，好事将近。' },
  { no: 3, title: '中上签', text: '稳中有进，不宜冒进。守正待时，自有回响。' },
  { no: 4, title: '中签', text: '平心静气，事缓则圆。今日宜内省，忌冲动。' },
  { no: 5, title: '中平签', text: '凡事平常心，得失随缘。细水长流方为上策。' },
  { no: 6, title: '中下签', text: '宜守不宜攻，谨防口舌。低调行事可保安稳。' },
  { no: 7, title: '下签', text: '事有波折，莫急莫躁。转机藏于耐心之后。' },
  { no: 8, title: '上上签', text: '时来运转，诸事亨通。把握今日的灵光一现。' },
  { no: 9, title: '上签', text: '人和则事成，合作生财。多与身边人同心。' },
  { no: 10, title: '中上签', text: '渐入佳境，积累见效。坚持既有方向。' },
  { no: 11, title: '中签', text: '动静皆宜，随缘而行。不必强求，顺其自然。' },
  { no: 12, title: '上签', text: '柳暗花明，困局自解。今日有意外之喜。' }
];

const LUCK_TEXTS = [
  '整体平顺，事业有贵人照拂，财运稳中有升，感情宜多沟通。',
  '今日能量充沛，适合推进搁置之事，注意劳逸结合。',
  '人际运佳，易得他人助力；财务上宜守不宜冒进。',
  '思绪清晰，利于规划与决策；感情需主动表达心意。',
  '平稳的一天，按部就班即可；小确幸藏在细节里。',
  '宜静心沉淀、复盘过往；避免与人口角，和气生财。',
  '机遇隐现，留心身边信息；感情有升温可能。',
  '行动力强，敢想敢做易有突破；注意健康管理。'
];

function pick(arr, seed) {
  return arr[((seed % arr.length) + arr.length) % arr.length];
}
function clamp(n) {
  return Math.max(45, Math.min(95, n));
}
function luckFor(base) {
  return {
    career: clamp(55 + (base % 30)),
    wealth: clamp(55 + ((base * 3) % 30)),
    love: clamp(55 + ((base * 7) % 30)),
    text: pick(LUCK_TEXTS, base)
  };
}
function daySeed() {
  const d = new Date();
  return d.getFullYear() * 372 + (d.getMonth() + 1) * 31 + d.getDate();
}
function fmtDate() {
  const d = new Date();
  const p = (n) => (n < 10 ? '0' + n : '' + n);
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

// —— 本地回退实现 ——
function localDailySign(seed) {
  return pick(DRAWS, seed);
}
function localZodiacLuck(seed) {
  return luckFor(seed);
}
function localHoroscope(seed) {
  return luckFor(seed + 5);
}

// —— 远程拉取封装 ——
function remote(path, params) {
  return new Promise((resolve, reject) => {
    if (!USE_REMOTE || !BASE) {
      reject(new Error('remote disabled'));
      return;
    }
    wx.request({
      url: BASE + path,
      data: params || {},
      method: 'GET',
      timeout: 5000,
      success: (res) => {
        if (res.statusCode === 200 && res.data) resolve(res.data);
        else reject(new Error('bad response ' + res.statusCode));
      },
      fail: reject
    });
  });
}

// —— 对外接口：远程优先，失败回退本地 ——
function getDailySign() {
  const seed = daySeed();
  return remote('/fortune/daily-sign', { date: fmtDate() }).catch(() => localDailySign(seed));
}
function getZodiacLuck(zodiacIndex) {
  const seed = daySeed() + zodiacIndex * 13;
  return remote('/fortune/zodiac', { zodiac: ZODIACS[zodiacIndex] }).catch(() => localZodiacLuck(seed));
}
function getHoroscope(signIndex) {
  const seed = daySeed() + signIndex * 17 + 5;
  return remote('/fortune/horoscope', { sign: SIGNS[signIndex] }).catch(() => localHoroscope(seed));
}

module.exports = { ZODIACS, SIGNS, getDailySign, getZodiacLuck, getHoroscope, fmtDate };
