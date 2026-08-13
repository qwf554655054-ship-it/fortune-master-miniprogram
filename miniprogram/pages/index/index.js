const { SYSTEMS } = require('../../utils/systems.js');

Page({
  data: {
    systems: SYSTEMS
  },

  goCalc(e) {
    const key = e.currentTarget.dataset.key;
    wx.navigateTo({ url: '/pages/calc/calc?system=' + key });
  }
});
