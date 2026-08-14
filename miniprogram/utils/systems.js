// 测算体系元数据：每个体系需要的输入字段 + 对应后端端点
// 字段 key 与后端 /api/* 接收的参数名保持一致，便于 buildBody 自动构造请求体
const SYSTEMS = [
  { key: 'bazi',         name: '八字排盘', endpoint: '/api/bazi',         fields: ['year', 'month', 'day', 'hour', 'minute', 'gender'] },
  { key: 'ziwei',        name: '紫微斗数', endpoint: '/api/ziwei',        fields: ['year', 'month', 'day', 'hour', 'minute', 'gender'] },
  { key: 'zodiac',       name: '生肖运势', endpoint: '/api/zodiac',       fields: ['year', 'month', 'day'] },
  { key: 'daily',        name: '每日运势', endpoint: '/api/daily',        fields: ['year'] },
  { key: 'numerology',   name: '数字命理', endpoint: '/api/numerology',   fields: ['year', 'month', 'day'] },
  { key: 'tarot',        name: '塔罗占卜', endpoint: '/api/tarot',        fields: ['count', 'question'] },
  { key: 'yijing',       name: '六爻起卦', endpoint: '/api/yijing',       fields: ['method', 'year', 'month', 'day', 'hour', 'num1', 'num2'] },
  { key: 'qimen',        name: '奇门择吉', endpoint: '/api/qimen',        fields: ['year', 'month', 'day'] },
  { key: 'fengshui',     name: '风水八宅', endpoint: '/api/fengshui',     fields: ['year', 'gender'] },
  { key: 'relationship', name: '关系合盘', endpoint: '/api/relationship', fields: ['yearA', 'yearB'] },
  { key: 'annual',       name: '年运',     endpoint: '/api/annual',       fields: ['year', 'targetYear'] },
  { key: 'monthly',      name: '月运',     endpoint: '/api/monthly',      fields: ['year', 'targetYear', 'targetMonth'] },
  { key: 'xingzhan',     name: '星盘占星', endpoint: '/api/xingzhan',     fields: ['year', 'month', 'day', 'hour', 'minute'] }
];

// 字段定义：label 展示名、type 输入类型、placeholder/picker 选项
const FIELD_DEFS = {
  year:         { label: '出生年', type: 'number', placeholder: '如 1990' },
  month:        { label: '出生月', type: 'number', placeholder: '1-12' },
  day:          { label: '出生日', type: 'number', placeholder: '1-31' },
  hour:         { label: '出生时(24h)', type: 'number', placeholder: '0-23' },
  minute:       { label: '出生分', type: 'number', placeholder: '0-59' },
  gender:       { label: '性别', type: 'picker', options: ['male', 'female'], labels: ['男', '女'] },
  count:        { label: '抽牌数', type: 'picker', options: [1, 3], labels: ['1 张', '3 张（过去/现在/未来）'] },
  question:     { label: '你的问题（可选）', type: 'text', placeholder: '想问的事' },
  method:       { label: '起卦方式', type: 'picker', options: ['time', 'numbers'], labels: ['时间起卦', '数字起卦'] },
  num1:         { label: '数字1（数字起卦时填，1-8）', type: 'number', placeholder: '如 7' },
  num2:         { label: '数字2（数字起卦时填，1-8）', type: 'number', placeholder: '如 5' },
  yearA:        { label: '甲方出生年', type: 'number', placeholder: '如 1990' },
  yearB:        { label: '乙方出生年', type: 'number', placeholder: '如 1992' },
  targetYear:   { label: '目标年（默认今年）', type: 'number', placeholder: '如 2026' },
  targetMonth:  { label: '目标月（默认当月）', type: 'number', placeholder: '1-12' }
};

// 数字型字段集合（构造请求体时转 Number）
const NUMBER_KEYS = ['year', 'month', 'day', 'hour', 'minute', 'count', 'num1', 'num2', 'targetYear', 'targetMonth', 'yearA', 'yearB'];

function buildBody(sysKey, values) {
  // 关系合盘需要 { a: { year }, b: { year } } 嵌套结构
  if (sysKey === 'relationship') {
    return { a: { year: Number(values.yearA) }, b: { year: Number(values.yearB) } };
  }
  // 六爻起卦：时间起卦需年月日时；数字起卦需两个数字（按所选方式构造，忽略另一组）
  if (sysKey === 'yijing') {
    if (values.method === 'numbers') {
      return { method: 'numbers', num1: Number(values.num1), num2: Number(values.num2) };
    }
    return {
      method: 'time',
      year: Number(values.year),
      month: Number(values.month),
      day: Number(values.day),
      hour: Number(values.hour || 0)
    };
  }
  const body = {};
  Object.keys(values).forEach((k) => {
    const v = values[k];
    if (v === '' || v === undefined || v === null) return;
    body[k] = NUMBER_KEYS.indexOf(k) >= 0 ? Number(v) : v;
  });
  return body;
}

module.exports = { SYSTEMS, FIELD_DEFS, buildBody };
