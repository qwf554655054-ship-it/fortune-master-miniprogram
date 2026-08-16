const { request } = require('../../utils/api.js');

Page({
  data: {
    nickname: '命理爱好者',
    avatarText: '命',
    memberText: '免费用户',
    tier: 'free'
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 });
    }
    this.loadMember();
  },

  loadMember() {
    request('/api/membership', 'GET')
      .then((m) => {
        const tier = (m && m.tier) || 'free';
        this.setData({ tier: tier, memberText: tier === 'vip' ? '💎 VIP 会员' : '免费用户' });
      })
      .catch(() => {});
  },

  // 会员中心：从一级 Tab 降级为二级入口（navigateTo）
  goMember() {
    wx.navigateTo({ url: '/pages/member/member' });
  },

  // 历史/收藏：switchTab 不支持参数，经 globalData 传 tab
  goRecords(e) {
    const app = getApp();
    if (app && app.globalData) app.globalData.recordsTab = e.currentTarget.dataset.tab;
    wx.switchTab({ url: '/pages/records/records' });
  },

  goPage(e) {
    wx.navigateTo({ url: e.currentTarget.dataset.url });
  }
});
