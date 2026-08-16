// 运势页：每日一签 + 生肖月运 + 星座运
// 数据通过 utils/fortune-api.js 获取：远程优先，失败回退本地确定性算法。
const api = require('../../utils/fortune-api.js');

Page({
  data: {
    date: '',
    draw: {},
    zodiacs: api.ZODIACS,
    signs: api.SIGNS,
    zodiacIndex: 0,
    signIndex: 0,
    zodiac: '鼠',
    sign: '白羊',
    zLuck: {},
    sLuck: {}
  },

  onLoad() {
    this.setData({ date: api.fmtDate() });
    this.refreshDaily();
    this.refreshZodiac(0);
    this.refreshHoroscope(0);
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
  },

  refreshDaily() {
    api.getDailySign().then((d) => this.setData({ draw: d })).catch(() => {});
  },

  refreshZodiac(i) {
    api.getZodiacLuck(i).then((l) => this.setData({ zLuck: l })).catch(() => {});
  },

  refreshHoroscope(i) {
    api.getHoroscope(i).then((l) => this.setData({ sLuck: l })).catch(() => {});
  },

  onZodiac(e) {
    const i = Number(e.detail.value);
    this.setData({ zodiacIndex: i, zodiac: api.ZODIACS[i] });
    this.refreshZodiac(i);
  },

  onSign(e) {
    const i = Number(e.detail.value);
    this.setData({ signIndex: i, sign: api.SIGNS[i] });
    this.refreshHoroscope(i);
  },

  onShareAppMessage() {
    return {
      title: '今日运势 · 命理测算',
      path: '/pages/fortune/fortune'
    };
  }
});
