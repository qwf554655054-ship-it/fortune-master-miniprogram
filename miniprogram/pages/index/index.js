const { SYSTEMS } = require('../../utils/systems.js');
const { request } = require('../../utils/api.js');

Page({
  data: {
    // P0（八字/紫微）已在大 CTA 卡高亮，宫格展示其余体系
    others: SYSTEMS.filter((s) => s.key !== 'bazi' && s.key !== 'ziwei'),
    recent: []
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
    this.loadRecent();
  },

  loadRecent() {
    request('/api/user/history', 'GET')
      .then((list) => this.setData({ recent: (list || []).slice(0, 3) }))
      .catch(() => this.setData({ recent: [] }));
  },

  goSystem(e) {
    const key = e.currentTarget.dataset.key;
    wx.navigateTo({ url: '/pages/calc/calc?system=' + key });
  },

  onShareAppMessage() {
    return {
      title: '命理测算 · 趣味参考，仅供娱乐',
      path: '/pages/index/index'
    };
  }
});
