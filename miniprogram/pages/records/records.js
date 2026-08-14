const { request } = require('../../utils/api.js');

Page({
  data: {
    tab: 'history',   // history | favorites
    history: [],
    favorites: [],
    member: { tier: 'free' },
    error: ''
  },

  onShow() {
    this.loadAll();
    this.loadMember();
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

  loadMember() {
    request('/api/membership', 'GET')
      .then((m) => this.setData({ member: m || { tier: 'free' } }))
      .catch(() => this.setData({ member: { tier: 'free' } }));
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
  },

  goAbout() {
    wx.navigateTo({ url: '/pages/about/about' });
  },

  goSettings() {
    wx.navigateTo({ url: '/pages/settings/settings' });
  },

  goMember() {
    wx.switchTab({ url: '/pages/member/member' });
  }
});
