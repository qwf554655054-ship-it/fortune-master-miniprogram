// 服务设置：配置后端 API 基地址（正式发布必须换成 https 域名）
const { request } = require('../../utils/api.js');

Page({
  data: {
    apiBase: '',
    saved: false,
    error: '',
    status: ''   // 连通性自检结果
  },

  onLoad() {
    const saved = wx.getStorageSync('apiBase') || '';
    this.setData({ apiBase: saved });
  },

  onInput(e) {
    this.setData({ apiBase: e.detail.value, saved: false });
  },

  save() {
    let base = (this.data.apiBase || '').trim();
    if (!base) {
      this.setData({ error: '地址不能为空' });
      return;
    }
    // 去掉结尾斜杠，统一格式
    base = base.replace(/\/+$/, '');
    wx.setStorageSync('apiBase', base);
    const app = getApp();
    if (app && app.globalData) app.globalData.apiBase = base;
    this.setData({ saved: true, error: '', status: '已保存，下次请求生效' });
  },

  // 连通性自检：尝试拉取会员状态接口
  test() {
    this.setData({ status: '检测中…', error: '' });
    request('/api/membership', 'GET')
      .then((m) => this.setData({ status: '连接成功（后端在线，会员等级：' + ((m && m.tier) || 'free') + '）' }))
      .catch((err) => this.setData({ status: '', error: '连接失败：' + ((err && err.message) || '网络错误') + '。请检查地址与「不校验合法域名」设置。' }));
  }
});
