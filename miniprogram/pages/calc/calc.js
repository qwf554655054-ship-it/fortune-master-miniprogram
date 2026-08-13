const { SYSTEMS, FIELD_DEFS, buildBody } = require('../../utils/systems.js');
const { request } = require('../../utils/api.js');

Page({
  data: {
    sys: null,
    fields: [],        // 当前体系需要渲染的字段定义
    values: {},        // 用户输入值
    pickerIndex: {},   // picker 选中下标
    result: null,      // 解读段落数组
    loading: false,
    error: ''
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
    this.setData({ sys, fields, values, pickerIndex });
    wx.setNavigationBarTitle({ title: sys.name });
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
    this.setData({ loading: true, error: '', result: null });
    const sysKey = this.data.sys.key;
    const body = buildBody(sysKey, this.data.values);

    request(this.data.sys.endpoint, 'POST', body)
      .then((chart) => request('/api/reading', 'POST', { system: sysKey, data: chart }))
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
  }
});
