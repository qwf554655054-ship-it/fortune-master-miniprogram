const { request } = require('../../utils/api.js');

Page({
  data: {
    member: { tier: 'free' },
    plans: [
      { key: 'monthly', label: '月度会员', price: '¥19.9 / 月' },
      { key: 'yearly', label: '年度会员', price: '¥199 / 年' }
    ],
    error: '',
    toast: ''
  },

  onShow() {
    this.loadMembership();
  },

  loadMembership() {
    request('/api/membership', 'GET')
      .then((m) => this.setData({ member: m || { tier: 'free' }, error: '' }))
      .catch((err) => this.setData({ error: (err && err.message) || '加载失败' }));
  },

  upgrade(e) {
    const plan = e.currentTarget.dataset.plan;
    this.setData({ toast: '开通中…' });
    request('/api/membership/upgrade', 'POST', { plan })
      .then((m) => {
        this.setData({ member: m, toast: '演示开通成功（本地模拟，未真实扣费）' });
        this.loadMembership();
      })
      .catch((err) => this.setData({ error: (err && err.message) || '开通失败', toast: '' }));
  }
});
