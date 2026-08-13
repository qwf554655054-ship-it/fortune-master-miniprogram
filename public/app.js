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

async function postJSON(url, body) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return r.json();
}

function esc(s) { return String(s == null ? '' : s); }

function renderSections(container, sections) {
  sections.forEach((s) => {
    const c = document.createElement('div');
    c.className = 'card';
    c.innerHTML = `<h3>${esc(s.title)}</h3><p>${esc(s.content)}</p>`;
    container.appendChild(c);
  });
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

// ===== 塔罗 =====
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
