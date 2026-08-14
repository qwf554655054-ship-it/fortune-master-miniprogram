const { SYSTEMS } = require('../../utils/systems.js');

Page({
  data: {
    systems: SYSTEMS
  },

  goCalc(e) {
    const key = e.currentTarget.dataset.key;
    wx.navigateTo({ url: '/pages/calc/calc?system=' + key });
  },

  // 分享给好友
  onShareAppMessage() {
    return {
      title: '命理测算 · 趣味参考，仅供娱乐',
      path: '/pages/index/index'
    };
  }
});
