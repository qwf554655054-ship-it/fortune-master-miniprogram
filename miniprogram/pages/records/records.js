const { request } = require('../../utils/api.js');

Page({
  data: {
    tab: 'history',   // history | favorites
    history: [],
    favorites: [],
    error: ''
  },

  onLoad() {
    // 支持从「我的」跳转时指定初始 tab（switchTab 不支持参数，经 globalData 传递）
    const app = getApp();
    if (app && app.globalData && app.globalData.recordsTab) {
      this.setData({ tab: app.globalData.recordsTab });
      app.globalData.recordsTab = '';
    }
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
    this.loadAll();
  },

  switchTab(e) {
    this.setData({ tab: e.currentTarget.dataset.tab });
  },

  loadAll() {
    Promise.all([
      request('/api/user/history', 'GET'),
      request('/api/user/favorites', 'GET')
    ]).then((res) => {
      this.setData({ history: res[0] || [], favorites: res[1] || [], error: '' });
    }).catch((err) => {
      this.setData({ error: (err && err.message) || '加载失败' });
    });
  },

  delHistory(e) {
    const id = e.currentTarget.dataset.id;
    request('/api/user/history/' + id, 'DELETE')
      .then(() => this.loadAll())
      .catch((err) => this.setData({ error: (err && err.message) || '删除失败' }));
  },

  delFavorite(e) {
    const id = e.currentTarget.dataset.id;
    request('/api/user/favorites/' + id, 'DELETE')
      .then(() => this.loadAll())
      .catch((err) => this.setData({ error: (err && err.message) || '删除失败' }));
  },

  goCalc() {
    wx.switchTab({ url: '/pages/index/index' });
  }
});
