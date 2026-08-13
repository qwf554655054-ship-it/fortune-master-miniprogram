'use strict';
// 前端逻辑：调用 /api 并渲染结果

const WUXING_COLOR = { 木: '#5a9a4e', 火: '#c0392b', 土: '#c79a4b', 金: '#9aa3ad', 水: '#2f6f9e' };

function el(id) { return document.getElementById(id); }

// tab 切换
document.querySelectorAll('.tab').forEach((t) => {
  t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((x) => x.classList.remove('active'));
    document.querySelectorAll('.panel').forEach((x) => x.classList.remove('active'));
    t.classList.add('active');
    el('panel-' + t.dataset.tab).classList.add('active');
  });
});

// 本地客户端标识（用于历史/收藏存储）
let clientId = localStorage.getItem('fm_client');
if (!clientId) { clientId = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('fm_client', clientId); }

const SYSTEM_LABEL = { bazi: '八字排盘', ziwei: '紫微斗数', zodiac: '生肖运势', daily: '每日运势', numerology: '数字命理', tarot: '塔罗占卜', yijing: '六爻起卦', qimen: '奇门择吉', fengshui: '风水八宅', relationship: '关系合盘', annual: '生肖年运', monthly: '月运' };

let lastRecord = null; // 最近一次成功测算的上下文（供收藏/分享）

async function apiFetch(url, opts) {
  opts = opts || {};
  opts.headers = Object.assign({}, opts.headers, { 'X-Client-Id': clientId });
  const r = await fetch(url, opts);
  return r.json();
}

async function postJSON(url, body) {
  const json = await apiFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  // 自动记录历史（除 user/reading/health 外）
  if (json.ok && url.startsWith('/api/') && !url.includes('/user/') && !url.includes('/reading') && !url.includes('/health')) {
    const sys = url.split('/')[2] || '';
    const label = SYSTEM_LABEL[sys] || sys;
    lastRecord = { system: sys, title: label, params: body };
    apiFetch('/api/user/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ system: sys, title: label, params: body }) }).catch(() => {});
    loadHistory();
  }
  return json;
}

function esc(s) { return String(s == null ? '' : s); }

function renderSections(container, sections) {
  sections.forEach((s) => {
    const c = document.createElement('div');
    c.className = 'card';
    c.innerHTML = `<h3>${esc(s.title)}</h3><p>${esc(s.content)}</p>`;
    container.appendChild(c);
  });
  // 操作条：收藏 + 八字分享图
  if (lastRecord && !container.dataset.actions) {
    container.dataset.actions = '1';
    const bar = document.createElement('div');
    bar.className = 'actions';
    const fav = document.createElement('button');
    fav.className = 'btn-small';
    fav.textContent = '☆ 收藏';
    fav.onclick = async () => {
      const summary = container.innerText.slice(0, 200);
      await apiFetch('/api/user/favorites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ system: lastRecord.system, title: lastRecord.title, summary }) });
      loadFavorites();
      fav.textContent = '✓ 已收藏';
      fav.disabled = true;
    };
    bar.appendChild(fav);
    if (lastRecord.system === 'bazi' && lastRecord.data) {
      const share = document.createElement('button');
      share.className = 'btn-small';
      share.textContent = '↗ 生成分享图';
      share.onclick = () => buildShareCard(lastRecord.data);
      bar.appendChild(share);
    }
    container.appendChild(bar);
  }
}

function renderError(container, msg) {
  container.innerHTML = `<div class="card"><p class="error">${esc(msg)}</p></div>`;
}

// ===== 八字 =====
el('bazi-btn').addEventListener('click', async () => {
  const out = el('bazi-result');
  out.innerHTML = '<div class="card"><p>排盘中…</p></div>';
  const date = el('bazi-date').value;
  const time = el('bazi-time').value || '00:00';
  if (!date) { renderError(out, '请选择出生日期'); return; }
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const gender = el('bazi-gender').value;
  try {
    const bazi = await postJSON('/api/bazi', { year, month, day, hour, minute, gender });
    if (!bazi.ok) { renderError(out, bazi.error); return; }
    const d = bazi.data;
    if (lastRecord) lastRecord.data = d; // 供分享图使用
    out.innerHTML = '';
    // 四柱
    const pc = document.createElement('div');
    pc.className = 'card';
    pc.innerHTML = `<h3>四柱八字</h3><div class="pillars">${d.fourPillars.map((p) => `
      <div class="pillar"><div class="pname">${p.name}</div><div class="pgan">${p.ganzhi}</div><div class="pwux">${p.ganWuxing}/${p.zhiWuxing}</div></div>`).join('')}</div>
      <p style="margin-top:8px">日主 ${d.dayMaster.gan}（${d.dayMaster.wuxing}）· ${d.meta.lunarDate} · ${d.meta.gender}</p>`;
    out.appendChild(pc);
    // 五行
    const wc = document.createElement('div');
    wc.className = 'card';
    const segs = Object.keys(d.wuxingPercent).map((k) => `<div class="wuxing-seg" style="width:${d.wuxingPercent[k]}%;background:${WUXING_COLOR[k]}"></div>`).join('');
    const legend = Object.keys(d.wuxingTally).map((k) => `<span>${k} ${d.wuxingTally[k]}</span>`).join('');
    wc.innerHTML = `<h3>五行分布</h3><div class="wuxing-bar">${segs}</div><div class="legend">${legend}</div><p style="margin-top:8px">日主${d.dayMasterStrength}；最旺 ${d.fiveElements.strongest}，最弱 ${d.fiveElements.weakest}。</p>`;
    out.appendChild(wc);
    // 大运
    if (d.daYun && d.daYun.length) {
      const uc = document.createElement('div');
      uc.className = 'card';
      uc.innerHTML = `<h3>大运（${d.qiYunAge}岁起运）</h3><div class="dayun">${d.daYun.slice(0, 8).map((x) => `<span class="dy">${x.ganzhi} ${x.startAge}-${x.endAge}</span>`).join('')}</div>`;
      out.appendChild(uc);
    }
    // 解读
    const rc = document.createElement('div');
    rc.className = 'card';
    rc.innerHTML = '<h3>命理解读</h3><p>生成中…</p>';
    out.appendChild(rc);
    const reading = await postJSON('/api/reading', { system: 'bazi', data: d });
    if (reading.ok) renderSections(rc, reading.data.sections);
  } catch (e) {
    renderError(out, '请求失败：' + e.message);
  }
});

// ===== 生肖 =====
el('zodiac-btn').addEventListener('click', async () => {
  const out = el('zodiac-result');
  out.innerHTML = '<div class="card"><p>计算中…</p></div>';
  const year = Number(el('zodiac-year').value);
  const month = Number(el('zodiac-month').value);
  const day = Number(el('zodiac-day').value);
  if (!year) { renderError(out, '请输入出生年份'); return; }
  try {
    const z = await postJSON('/api/zodiac', { year, month, day });
    if (!z.ok) { renderError(out, z.error); return; }
    const d = z.data;
    out.innerHTML = '';
    const cls = d.relation === '本命年' ? 'benming' : d.relation === '冲太岁' ? 'chong' : d.relation === '六合' ? 'he' : 'ping';
    const c = document.createElement('div');
    c.className = 'card';
    c.innerHTML = `<h3>${d.shengXiao}年生人 · 今年${d.currentYearGanZhi}（${d.currentZodiac}）年</h3>
      <p><span class="tag ${cls}">${d.relation}</span> ${d.relationDetail}</p>`;
    out.appendChild(c);
    const rc = document.createElement('div');
    rc.className = 'card';
    rc.innerHTML = '<h3>运势解读</h3><p>生成中…</p>';
    out.appendChild(rc);
    const reading = await postJSON('/api/reading', { system: 'zodiac', data: d });
    if (reading.ok) renderSections(rc, reading.data.sections);
  } catch (e) {
    renderError(out, '请求失败：' + e.message);
  }
});

// ===== 紫微斗数 =====
function renderChartResult(out, title, bodyHTML) {
  out.innerHTML = '';
  const c = document.createElement('div');
  c.className = 'card';
  c.innerHTML = `<h3>${esc(title)}</h3>${bodyHTML}`;
  out.appendChild(c);
}
el('ziwei-btn').addEventListener('click', async () => {
  const out = el('ziwei-result');
  out.innerHTML = '<div class="card"><p>排盘中…</p></div>';
  const date = el('ziwei-date').value;
  if (!date) { renderError(out, '请选择出生日期'); return; }
  const [year, month, day] = date.split('-').map(Number);
  const time = el('ziwei-time').value || '00:00';
  const [hour, minute] = time.split(':').map(Number);
  try {
    const z = await postJSON('/api/ziwei', { year, month, day, hour, minute, gender: el('ziwei-gender').value });
    if (!z.ok) { renderError(out, z.error); return; }
    const d = z.data;
    const starsHTML = Object.entries(d.stars).map(([s, p]) => `<span class="dy">${s}·${p}</span>`).join('');
    renderChartResult(out, `${d.meta.gender}命 · ${d.xingWuju} · 紫微在${d.ziweiAt}`,
      `<p style="margin-top:8px">命宫 ${d.mingGong.ganzhi}（${d.palaces[0].mainStars.join('、') || '无主星'}）· 身宫 ${d.shenGong.ganzhi}</p>
       <div class="dayun" style="margin-top:8px">${starsHTML}</div>
       <p class="legend" style="margin-top:8px">${esc(d.note)}</p>`);
    const rc = document.createElement('div');
    rc.className = 'card';
    rc.innerHTML = '<h3>命理解读</h3><p>生成中…</p>';
    out.appendChild(rc);
    const reading = await postJSON('/api/reading', { system: 'ziwei', data: d });
    if (reading.ok) renderSections(rc, reading.data.sections);
  } catch (e) { renderError(out, '请求失败：' + e.message); }
});

// ===== 每日运势 =====
el('daily-btn').addEventListener('click', async () => {
  const out = el('daily-result');
  out.innerHTML = '<div class="card"><p>计算中…</p></div>';
  const year = Number(el('daily-year').value);
  if (!year) { renderError(out, '请输入出生年份'); return; }
  const date = el('daily-date').value || undefined;
  try {
    const z = await postJSON('/api/daily', date ? { year, date } : { year });
    if (!z.ok) { renderError(out, z.error); return; }
    const d = z.data;
    const cls = d.rating === '优' ? 'he' : d.rating === '慎' ? 'chong' : 'ping';
    out.innerHTML = '';
    const c = document.createElement('div');
    c.className = 'card';
    c.innerHTML = `<h3>${d.meta.date} · ${d.meta.lunarDate}</h3>
      <p><span class="tag ${cls}">${d.relation}</span> ${d.detail}</p>
      <p class="legend" style="margin-top:8px">${d.dayGanZhi}日（冲${d.chongZodiac}）· 幸运色 ${d.luckyColor} · 幸运数字 ${d.luckyNumber}</p>`;
    out.appendChild(c);
    const rc = document.createElement('div');
    rc.className = 'card';
    rc.innerHTML = '<h3>运势解读</h3><p>生成中…</p>';
    out.appendChild(rc);
    const reading = await postJSON('/api/reading', { system: 'daily', data: d });
    if (reading.ok) renderSections(rc, reading.data.sections);
  } catch (e) { renderError(out, '请求失败：' + e.message); }
});

// ===== 数字命理 =====
el('numerology-btn').addEventListener('click', async () => {
  const out = el('numerology-result');
  out.innerHTML = '<div class="card"><p>计算中…</p></div>';
  const date = el('numerology-date').value;
  if (!date) { renderError(out, '请选择出生日期'); return; }
  const [year, month, day] = date.split('-').map(Number);
  try {
    const z = await postJSON('/api/numerology', { year, month, day });
    if (!z.ok) { renderError(out, z.error); return; }
    const d = z.data;
    out.innerHTML = '';
    const c = document.createElement('div');
    c.className = 'card';
    c.innerHTML = `<h3>生命灵数 ${d.lifePath.number}</h3><p>${esc(d.lifePath.meaning)}</p>`;
    out.appendChild(c);
    const rc = document.createElement('div');
    rc.className = 'card';
    rc.innerHTML = '<h3>数字解读</h3><p>生成中…</p>';
    out.appendChild(rc);
    const reading = await postJSON('/api/reading', { system: 'numerology', data: d });
    if (reading.ok) renderSections(rc, reading.data.sections);
  } catch (e) { renderError(out, '请求失败：' + e.message); }
});
el('tarot-btn').addEventListener('click', async () => {
  const out = el('tarot-result');
  out.innerHTML = '<div class="card"><p>洗牌中…</p></div>';
  const count = Number(el('tarot-count').value);
  const question = el('tarot-q').value.trim();
  try {
    const t = await postJSON('/api/tarot', { count, question });
    if (!t.ok) { renderError(out, t.error); return; }
    const d = t.data;
    out.innerHTML = '';
    d.cards.forEach((card) => {
      const c = document.createElement('div');
      c.className = 'tarot-card';
      c.innerHTML = `<div class="pos">${card.position}</div><div class="tname">${card.name}</div><div class="ori">${card.orientation}</div><div class="mean">${card.meaning}</div>`;
      out.appendChild(c);
    });
    const rc = document.createElement('div');
    rc.className = 'card';
    rc.innerHTML = '<h3>综合解读</h3><p>生成中…</p>';
    out.appendChild(rc);
    const reading = await postJSON('/api/reading', { system: 'tarot', data: d, question });
    if (reading.ok) renderSections(rc, reading.data.sections);
  } catch (e) {
    renderError(out, '请求失败：' + e.message);
  }
});

// ===== 六爻起卦 =====
el('yijing-method').addEventListener('change', () => {
  el('yijing-nums-label').style.display = el('yijing-method').value === 'numbers' ? 'flex' : 'none';
});
el('yijing-btn').addEventListener('click', async () => {
  const out = el('yijing-result');
  out.innerHTML = '<div class="card"><p>起卦中…</p></div>';
  const method = el('yijing-method').value;
  let payload;
  if (method === 'numbers') {
    payload = { method, num1: Number(el('yijing-n1').value), num2: Number(el('yijing-n2').value) };
    if (!payload.num1 || !payload.num2) { renderError(out, '请输入两个数字'); return; }
  } else {
    const date = el('yijing-date').value;
    if (!date) { renderError(out, '请选择日期'); return; }
    const [year, month, day] = date.split('-').map(Number);
    const time = el('yijing-time').value || '00:00';
    const [hour] = time.split(':').map(Number);
    payload = { method, year, month, day, hour };
  }
  try {
    const y = await postJSON('/api/yijing', payload);
    if (!y.ok) { renderError(out, y.error); return; }
    const d = y.data;
    out.innerHTML = '';
    const c = document.createElement('div');
    c.className = 'card';
    c.innerHTML = `<h3>${d.hexagon}（动爻${d.movingLine}）</h3><p>上卦${d.upperGua} · 下卦${d.lowerGua}<br>${d.meaning}</p>`;
    out.appendChild(c);
    const rc = document.createElement('div');
    rc.className = 'card';
    rc.innerHTML = '<h3>卦象解读</h3><p>生成中…</p>';
    out.appendChild(rc);
    const reading = await postJSON('/api/reading', { system: 'yijing', data: d, question: el('yijing-q').value.trim() });
    if (reading.ok) renderSections(rc, reading.data.sections);
  } catch (e) { renderError(out, '请求失败：' + e.message); }
});

// ===== 奇门择吉 =====
el('qimen-btn').addEventListener('click', async () => {
  const out = el('qimen-result');
  out.innerHTML = '<div class="card"><p>排盘中…</p></div>';
  let payload;
  const date = el('qimen-date').value;
  if (date) {
    const [year, month, day] = date.split('-').map(Number);
    payload = { year, month, day };
  } else {
    const now = new Date();
    payload = { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
  }
  try {
    const q = await postJSON('/api/qimen', payload);
    if (!q.ok) { renderError(out, q.error); return; }
    const d = q.data;
    out.innerHTML = '';
    const c = document.createElement('div');
    c.className = 'card';
    c.innerHTML = `<h3>${d.meta.date} · ${d.yinYangDun}${d.ju}局（${d.meta.jieQi}）</h3>
      <p>吉门：${d.luckyDoors.join('、')}<br>凶门：${d.badDoors.join('、')}</p><p class="legend">${d.note}</p>`;
    out.appendChild(c);
    const rc = document.createElement('div');
    rc.className = 'card';
    rc.innerHTML = '<h3>用事解读</h3><p>生成中…</p>';
    out.appendChild(rc);
    const reading = await postJSON('/api/reading', { system: 'qimen', data: d });
    if (reading.ok) renderSections(rc, reading.data.sections);
  } catch (e) { renderError(out, '请求失败：' + e.message); }
});

// ===== 风水八宅 =====
el('fengshui-btn').addEventListener('click', async () => {
  const out = el('fengshui-result');
  out.innerHTML = '<div class="card"><p>计算中…</p></div>';
  const year = Number(el('fengshui-year').value);
  if (!year) { renderError(out, '请输入出生年份'); return; }
  const payload = { year, gender: el('fengshui-gender').value };
  const date = el('fengshui-date').value;
  if (date) payload.date = date;
  try {
    const f = await postJSON('/api/fengshui', payload);
    if (!f.ok) { renderError(out, f.error); return; }
    const d = f.data;
    out.innerHTML = '';
    const c = document.createElement('div');
    c.className = 'card';
    c.innerHTML = `<h3>${d.mingGua.name}命（${d.mingGua.group}）</h3>
      <p>吉位：${d.goodDirections.join('、')}</p><p>凶位：${d.badDirections.join('、')}</p>`;
    out.appendChild(c);
    const rc = document.createElement('div');
    rc.className = 'card';
    rc.innerHTML = '<h3>风水解读</h3><p>生成中…</p>';
    out.appendChild(rc);
    const reading = await postJSON('/api/reading', { system: 'fengshui', data: d });
    if (reading.ok) renderSections(rc, reading.data.sections);
  } catch (e) { renderError(out, '请求失败：' + e.message); }
});

// ===== 关系合盘 =====
el('relationship-btn').addEventListener('click', async () => {
  const out = el('relationship-result');
  out.innerHTML = '<div class="card"><p>合盘中…</p></div>';
  try {
    const r = await postJSON('/api/relationship', { a: { year: Number(el('rel-a-year').value) }, b: { year: Number(el('rel-b-year').value) } });
    if (!r.ok) { renderError(out, r.error); return; }
    const d = r.data;
    const cls = d.score >= 80 ? 'he' : d.score <= 50 ? 'chong' : 'ping';
    out.innerHTML = '';
    const c = document.createElement('div');
    c.className = 'card';
    c.innerHTML = `<h3>${d.a.zodiac} × ${d.b.zodiac} · <span class="tag ${cls}">${d.relation}</span> ${d.score}/100</h3>
      <p>${d.detail}</p><p>${d.wuxingTip}</p>`;
    out.appendChild(c);
    const rc = document.createElement('div');
    rc.className = 'card';
    rc.innerHTML = '<h3>合盘解读</h3><p>生成中…</p>';
    out.appendChild(rc);
    const reading = await postJSON('/api/reading', { system: 'relationship', data: d });
    if (reading.ok) renderSections(rc, reading.data.sections);
  } catch (e) { renderError(out, '请求失败：' + e.message); }
});

'use strict';
// ===== 年运 =====
el('annual-btn').addEventListener('click', async () => {
  const out = el('annual-result');
  out.innerHTML = '<div class="card"><p>计算中…</p></div>';
  const year = Number(el('annual-year').value);
  if (!year) { renderError(out, '请输入出生年份'); return; }
  const payload = { year };
  if (el('annual-target').value) payload.targetYear = Number(el('annual-target').value);
  try {
    const a = await postJSON('/api/annual', payload);
    if (!a.ok) { renderError(out, a.error); return; }
    const d = a.data;
    const cls = d.score >= 80 ? 'he' : d.score <= 50 ? 'chong' : 'ping';
    out.innerHTML = '';
    const c = document.createElement('div');
    c.className = 'card';
    c.innerHTML = '<h3>' + d.targetYear + ' 年运 · <span class="tag ' + cls + '">' + d.relation + '</span> ' + d.score + '/100</h3><p>' + d.detail + '</p><p class="legend">最佳月份：' + d.bestMonth + '月 · 需谨慎：' + d.worstMonth + '月</p>';
    out.appendChild(c);
    const rc = document.createElement('div');
    rc.className = 'card';
    rc.innerHTML = '<h3>年运解读</h3><p>生成中…</p>';
    out.appendChild(rc);
    const reading = await postJSON('/api/reading', { system: 'annual', data: d });
    if (reading.ok) renderSections(rc, reading.data.sections);
  } catch (e) { renderError(out, '请求失败：' + e.message); }
});

// ===== 月运 =====
el('monthly-btn').addEventListener('click', async () => {
  const out = el('monthly-result');
  out.innerHTML = '<div class="card"><p>计算中…</p></div>';
  const year = Number(el('monthly-year').value);
  if (!year) { renderError(out, '请输入出生年份'); return; }
  const payload = { year };
  if (el('monthly-target').value) payload.targetYear = Number(el('monthly-target').value);
  if (el('monthly-month').value) payload.month = Number(el('monthly-month').value);
  try {
    const m = await postJSON('/api/monthly', payload);
    if (!m.ok) { renderError(out, m.error); return; }
    const d = m.data;
    const cls = d.score >= 80 ? 'he' : d.score <= 50 ? 'chong' : 'ping';
    out.innerHTML = '';
    const c = document.createElement('div');
    c.className = 'card';
    c.innerHTML = '<h3>' + d.targetYear + '年' + d.month + '月（' + d.monthGanZhi + '）· <span class="tag ' + cls + '">' + d.relation + '</span> ' + d.score + '/100</h3><p>' + d.detail + '</p>';
    out.appendChild(c);
    const rc = document.createElement('div');
    rc.className = 'card';
    rc.innerHTML = '<h3>月运解读</h3><p>生成中…</p>';
    out.appendChild(rc);
    const reading = await postJSON('/api/reading', { system: 'monthly', data: d });
    if (reading.ok) renderSections(rc, reading.data.sections);
  } catch (e) { renderError(out, '请求失败：' + e.message); }
});

// ===== 历史 / 收藏 =====
async function loadHistory() {
  try {
    const r = await apiFetch('/api/user/history', { method: 'GET' });
    renderHistory(r.ok ? r.data : []);
  } catch (e) { /* 静默 */ }
}
async function loadFavorites() {
  try {
    const r = await apiFetch('/api/user/favorites', { method: 'GET' });
    renderFavorites(r.ok ? r.data : []);
  } catch (e) { /* 静默 */ }
}
function renderHistory(list) {
  const box = el('history-list');
  if (!list.length) { box.innerHTML = '<p class="empty">暂无记录</p>'; return; }
  box.innerHTML = '';
  list.forEach((h) => {
    const item = document.createElement('div');
    item.className = 'record-item';
    item.innerHTML = '<div class="ri-title">' + esc(SYSTEM_LABEL[h.system] || h.system) + '</div><div class="ri-time">' + esc((h.createdAt || '').slice(0, 16).replace('T', ' ')) + '</div>';
    const btnBar = document.createElement('div');
    btnBar.className = 'ri-actions';
    const restore = document.createElement('button');
    restore.className = 'btn-small';
    restore.textContent = '重算';
    restore.onclick = () => restoreParams(h.system, h.params || {});
    const del = document.createElement('button');
    del.className = 'btn-small danger';
    del.textContent = '删除';
    del.onclick = async () => { await apiFetch('/api/user/history/' + h.id, { method: 'DELETE' }); loadHistory(); };
    btnBar.appendChild(restore);
    btnBar.appendChild(del);
    item.appendChild(btnBar);
    box.appendChild(item);
  });
}
function renderFavorites(list) {
  const box = el('favorites-list');
  if (!list.length) { box.innerHTML = '<p class="empty">暂无收藏</p>'; return; }
  box.innerHTML = '';
  list.forEach((f) => {
    const item = document.createElement('div');
    item.className = 'record-item';
    item.innerHTML = '<div class="ri-title">' + esc(f.title) + '</div><div class="ri-summary">' + esc(f.summary || '') + '</div>';
    const del = document.createElement('button');
    del.className = 'btn-small danger';
    del.textContent = '取消收藏';
    del.onclick = async () => { await apiFetch('/api/user/favorites/' + f.id, { method: 'DELETE' }); loadFavorites(); };
    item.appendChild(del);
    box.appendChild(item);
  });
}
// 历史恢复：回填表单并触发对应模块
function restoreParams(system, p) {
  try {
    const set = (id, v) => { const e = el(id); if (e) e.value = v; };
    const pad = (n) => String(n).padStart(2, '0');
    if (system === 'bazi') { set('bazi-date', p.year + '-' + pad(p.month) + '-' + pad(p.day)); set('bazi-time', pad(p.hour || 0) + ':' + pad(p.minute || 0)); set('bazi-gender', p.gender || 'male'); el('bazi-btn').click(); }
    else if (system === 'ziwei') { set('ziwei-date', p.year + '-' + pad(p.month) + '-' + pad(p.day)); set('ziwei-time', pad(p.hour || 0) + ':00'); set('ziwei-gender', p.gender || 'male'); el('ziwei-btn').click(); }
    else if (system === 'zodiac') { set('zodiac-year', p.year); set('zodiac-month', p.month || 1); set('zodiac-day', p.day || 1); el('zodiac-btn').click(); }
    else if (system === 'daily') { set('daily-year', p.year); set('daily-date', p.date || ''); el('daily-btn').click(); }
    else if (system === 'numerology') { set('numerology-date', p.year + '-' + pad(p.month) + '-' + pad(p.day)); el('numerology-btn').click(); }
    else if (system === 'annual') { set('annual-year', p.year); set('annual-target', p.targetYear || ''); el('annual-btn').click(); }
    else if (system === 'monthly') { set('monthly-year', p.year); set('monthly-target', p.targetYear || ''); set('monthly-month', p.month || ''); el('monthly-btn').click(); }
    else if (system === 'fengshui') { set('fengshui-year', p.year); set('fengshui-gender', p.gender || 'male'); set('fengshui-date', p.date || ''); el('fengshui-btn').click(); }
    else if (system === 'relationship') { set('rel-a-year', p.a ? p.a.year : ''); set('rel-b-year', p.b ? p.b.year : ''); el('relationship-btn').click(); }
    else if (system === 'qimen') { set('qimen-date', p.date || ''); el('qimen-btn').click(); }
    else if (system === 'yijing') { set('yijing-method', p.method || 'time'); if ((p.method || 'time') === 'numbers') { set('yijing-n1', p.num1); set('yijing-n2', p.num2); } else { set('yijing-date', p.year + '-' + pad(p.month) + '-' + pad(p.day)); set('yijing-time', pad(p.hour || 0) + ':00'); } el('yijing-btn').click(); }
    else if (system === 'tarot') { set('tarot-count', p.count || 1); set('tarot-q', p.question || ''); el('tarot-btn').click(); }
  } catch (e) { /* 静默 */ }
}

// ===== 分享图（canvas）=====
function buildShareCard(b) {
  const canvas = document.createElement('canvas');
  canvas.width = 600; canvas.height = 800;
  const ctx = canvas.getContext('2d');
  // 背景
  const grad = ctx.createLinearGradient(0, 0, 0, 800);
  grad.addColorStop(0, '#2b2118'); grad.addColorStop(1, '#4a3826');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 600, 800);
  ctx.strokeStyle = '#c79a4b'; ctx.lineWidth = 3; ctx.strokeRect(16, 16, 568, 768);
  ctx.fillStyle = '#c79a4b'; ctx.font = 'bold 40px serif'; ctx.textAlign = 'center';
  ctx.fillText('命理测算 · 八字排盘', 300, 80);
  ctx.font = '22px serif'; ctx.fillStyle = '#f3e9d8';
  ctx.fillText(b.meta.lunarDate + ' · ' + b.meta.gender, 300, 120);
  // 四柱
  const pillarW = 120;
  b.fourPillars.forEach((p, i) => {
    const x = 90 + i * pillarW;
    ctx.fillStyle = '#f3e9d8'; ctx.font = 'bold 28px serif';
    ctx.fillText(p.ganzhi, x, 220);
    ctx.fillStyle = '#d9c6a0'; ctx.font = '18px serif';
    ctx.fillText(p.ganWuxing + '/' + p.zhiWuxing, x, 255);
    ctx.fillStyle = '#b9a98f'; ctx.font = '15px serif';
    ctx.fillText(p.name, x, 285);
  });
  // 五行条
  ctx.fillStyle = '#f3e9d8'; ctx.font = '20px serif';
  ctx.fillText('五行分布', 300, 350);
  const colors = { 木: '#5a9a4e', 火: '#c0392b', 土: '#c79a4b', 金: '#9aa3ad', 水: '#2f6f9e' };
  const keys = Object.keys(b.wuxingPercent);
  const totalW = 480; let x = 60;
  keys.forEach((k) => {
    ctx.fillStyle = colors[k]; ctx.fillRect(x, 370, (b.wuxingPercent[k] / 100) * totalW, 24); x += (b.wuxingPercent[k] / 100) * totalW;
  });
  ctx.fillStyle = '#d9c6a0'; ctx.font = '16px serif';
  ctx.fillText(keys.map((k) => k + ' ' + b.wuxingTally[k]).join('  '), 300, 420);
  // 日主 + 大运
  ctx.fillStyle = '#c79a4b'; ctx.font = 'bold 24px serif';
  ctx.fillText('日主 ' + b.dayMaster.gan + '（' + b.dayMaster.wuxing + '）· ' + b.dayMasterStrength, 300, 480);
  ctx.fillStyle = '#d9c6a0'; ctx.font = '18px serif';
  ctx.fillText('大运：' + b.daYun.slice(0, 4).map((d) => d.ganzhi + ' ' + d.startAge + '-' + d.endAge).join('  '), 300, 525);
  // 底部
  ctx.fillStyle = '#b9a98f'; ctx.font = '15px serif';
  ctx.fillText('本内容仅供娱乐与自我觉察', 300, 730);
  ctx.fillText('生成于 ' + new Date().toLocaleDateString('zh-CN'), 300, 758);
  // 下载
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = 'mingli-bazi.png';
  a.textContent = '点击下载分享图';
  a.style.cssText = 'display:inline-block;margin-top:10px;color:#8b5a2b;font-weight:700;';
  const holder = document.createElement('div');
  holder.className = 'card';
  holder.innerHTML = '<h3>分享图</h3>';
  holder.appendChild(canvas);
  holder.appendChild(a);
  el('bazi-result').appendChild(holder);
}

// 初始化加载记录
loadHistory();
loadFavorites();

