const { SYSTEMS, FIELD_DEFS, buildBody } = require('../../utils/systems.js');
const { request } = require('../../utils/api.js');

Page({
  data: {
    sys: null,
    fields: [],        // 当前体系需要渲染的字段定义
    values: {},        // 用户输入值
    pickerIndex: {},   // picker 选中下标
    result: null,      // 解读段落数组（普通解读）
    chart: null,       // 排盘结果（用于收藏/深度解读）
    loading: false,
    error: '',
    memberTier: 'free', // 当前会员等级（控制深度解读入口）
    toast: '',          // 轻提示
    favorited: false    // 是否已收藏
  },

  onLoad(query) {
    const sys = SYSTEMS.find((s) => s.key === query.system) || SYSTEMS[0];
    const fields = sys.fields.map((k) => Object.assign({ key: k }, FIELD_DEFS[k]));
    const values = {};
    const pickerIndex = {};
    fields.forEach((f) => {
      if (f.type === 'picker') {
        values[f.key] = f.options[0];
        pickerIndex[f.key] = 0;
      } else {
        values[f.key] = '';
      }
    });
    this.setData({ sys, fields, values, pickerIndex, result: null, chart: null, error: '', favorited: false });
    wx.setNavigationBarTitle({ title: sys.name });
    this.loadMemberTier();
  },

  // 拉取会员等级，决定深度解读入口是否展示
  loadMemberTier() {
    request('/api/membership', 'GET')
      .then((m) => this.setData({ memberTier: (m && m.tier) || 'free' }))
      .catch(() => this.setData({ memberTier: 'free' }));
  },

  onInput(e) {
    const key = e.currentTarget.dataset.key;
    const values = Object.assign({}, this.data.values);
    values[key] = e.detail.value;
    this.setData({ values });
  },

  onPickerChange(e) {
    const key = e.currentTarget.dataset.key;
    const idx = Number(e.detail.value);
    const field = this.data.fields.find((f) => f.key === key);
    const values = Object.assign({}, this.data.values);
    const pickerIndex = Object.assign({}, this.data.pickerIndex);
    values[key] = field.options[idx];
    pickerIndex[key] = idx;
    this.setData({ values, pickerIndex });
  },

  onSubmit() {
    this.setData({ loading: true, error: '', result: null, chart: null, favorited: false });
    const sysKey = this.data.sys.key;
    const body = buildBody(sysKey, this.data.values);

    request(this.data.sys.endpoint, 'POST', body)
      .then((chart) => {
        // 保存排盘结果，供收藏与深度解读复用
        this.setData({ chart });
        return request('/api/reading', 'POST', { system: sysKey, data: chart });
      })
      .then((reading) => {
        // 测算成功后自动写一条历史（失败不影响结果展示）
        try {
          request('/api/user/history', 'POST', {
            system: sysKey,
            title: this.data.sys.name,
            summary: (reading.sections[0] && reading.sections[0].content ? reading.sections[0].content : '').slice(0, 50)
          }).catch(function () {});
        } catch (e) { /* ignore */ }
        this.setData({ result: reading.sections, loading: false });
      })
      .catch((err) => {
        this.setData({ error: (err && err.message) || '出错了，请稍后再试', loading: false });
      });
  },

  // 收藏当前结果
  onFavorite() {
    if (!this.data.chart) return;
    const sysKey = this.data.sys.key;
    const summary = (this.data.result && this.data.result[0] && this.data.result[0].content ? this.data.result[0].content : '').slice(0, 50);
    request('/api/user/favorites', 'POST', {
      system: sysKey,
      title: this.data.sys.name,
      summary: summary
    })
      .then(() => this.setData({ favorited: true, toast: '已收藏到「我的」' }))
      .catch((err) => this.setData({ error: (err && err.message) || '收藏失败' }));
  },

  // 深度解读（会员专享）
  onDeep() {
    if (this.data.memberTier === 'vip') {
      // 已是会员：直接请求深度解读
      this.requestDeep();
    } else {
      // 非会员：提示并引导到会员中心
      this.setData({ toast: '开通会员可解锁「深度延展」专属解读' });
      setTimeout(() => {
        wx.navigateTo({ url: '/pages/member/member' });
      }, 800);
    }
  },

  requestDeep() {
    if (!this.data.chart) return;
    const sysKey = this.data.sys.key;
    this.setData({ loading: true, error: '' });
    request('/api/reading', 'POST', { system: sysKey, data: this.data.chart, deep: true })
      .then((reading) => {
        // 仅追加「深度延展」段落，避免与普通解读重复
        const deepSections = (reading.sections || []).filter((s) => s.title && s.title.indexOf('深度延展') >= 0);
        this.setData({
          result: (this.data.result || []).concat(deepSections),
          loading: false,
          toast: '已解锁会员专享·深度延展'
        });
      })
      .catch((err) => {
        // 兜底：若会员状态与服务端不一致返回 403，引导开通
        if ((err && err.message && err.message.indexOf('会员') >= 0) || (err && /403/.test(err.message))) {
          this.setData({ toast: '开通会员可解锁「深度延展」专属解读', loading: false });
          setTimeout(() => wx.navigateTo({ url: '/pages/member/member' }), 800);
        } else {
          this.setData({ error: (err && err.message) || '深度解读失败', loading: false });
        }
      });
  },

  // 分享给好友
  onShareAppMessage() {
    const name = this.data.sys ? this.data.sys.name : '命理测算';
    return {
      title: name + ' · 趣味参考，仅供娱乐',
      path: '/pages/index/index'
    };
  }
});
