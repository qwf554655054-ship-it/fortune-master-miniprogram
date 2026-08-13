const { request } = require('../../utils/api.js');

Page({
  data: {
    tab: 'history',   // history | favorites
    history: [],
    favorites: [],
    error: ''
  },

  onShow() {
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

  goAbout() {
    wx.navigateTo({ url: '/pages/about/about' });
  }
});
