'use strict';
/**
 * AI 解读层
 * 输入：测算体系 system + 排盘数据 data（+ 可选问题 question）
 * 输出：结构化解读 { sections: [{title, content}], source: 'rule'|'llm' }
 * 默认走规则模板（零依赖、可离线）；配置了 LLM 环境变量后自动切换为 LLM 解读。
 */
const knowledge = require('../knowledge');

const WUXING_COLOR = { 木: '青绿', 火: '红', 土: '黄', 金: '白', 水: '黑' };
const WUXING_DIR = { 木: '东', 火: '南', 土: '中', 金: '西', 水: '北' };

function ruleBazi(chart, question) {
  const { dayMaster, wuxingTally, wuxingPercent, fiveElements, dayMasterStrength, fourPillars, daYun, shengXiao } = chart;
  const sections = [];

  const pillarText = fourPillars.map((p) => `${p.name} ${p.ganzhi}`).join('，');
  sections.push({
    title: '总断',
    content:
      `日主为 ${dayMaster.gan}（五行属${dayMaster.wuxing}），命局日主${dayMasterStrength}。` +
      `四柱为「${pillarText}」${shengXiao}年生人。` +
      `五行分布中「${fiveElements.strongest}」最旺、「${fiveElements.weakest}」最弱，` +
      `整体${dayMasterStrength === '偏强' ? '身强可担财官，宜克泄耗' : dayMasterStrength === '偏弱' ? '身弱喜生扶，宜印比' : '中和，进退有度'}。`,
  });

  const wxLine = Object.keys(wuxingTally)
    .map((k) => `${k}${wuxingPercent[k]}%`)
    .join(' / ');
  sections.push({
    title: '五行与日主',
    content:
      `五行占比：${wxLine}。日主${dayMaster.gan}属${dayMaster.wuxing}，` +
      `${fiveElements.weakest}偏弱者，日常可多接触${WUXING_COLOR[fiveElements.weakest]}色、朝${WUXING_DIR[fiveElements.weakest]}方发展以作调和（仅为趣味参考）。`,
  });

  // 十神格局
  const shiShenCount = {};
  fourPillars.forEach((p) => {
    [p.shiShenGan, ...(Array.isArray(p.shiShenZhi) ? p.shiShenZhi : [])].forEach((s) => {
      if (s) shiShenCount[s] = (shiShenCount[s] || 0) + 1;
    });
  });
  const topShiShen = Object.entries(shiShenCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map((e) => e[0]).join('、');
  sections.push({
    title: '十神格局',
    content: topShiShen
      ? `命局中较显著的十神为：${topShiShen}。十神揭示你与财富、权力、学识、同辈的关系张力，是格局分析的核心维度。`
      : '十神信息暂缺。',
  });

  sections.push({
    title: '性格',
    content:
      `${dayMaster.wuxing}型日主，通常${dayMaster.wuxing === '木' ? '仁厚向上、富有生长力' : dayMaster.wuxing === '火' ? '热情外放、行动力强' : dayMaster.wuxing === '土' ? '稳健包容、重信守诺' : dayMaster.wuxing === '金' ? '果决刚毅、讲原则' : '聪慧灵动、善变通'}。` +
      `日主${dayMasterStrength}，行事${dayMasterStrength === '偏强' ? '较为主动、敢于争取' : dayMasterStrength === '偏弱' ? '偏向谨慎、需外界助力' : '张弛有度'}。`,
  });
  sections.push({
    title: '事业',
    content: `可结合日主五行与十神选择赛道：身强宜挑战与开拓，身弱宜依托平台与团队。命带财官者宜管理、商贸；带印者宜学术、咨询。`,
  });
  sections.push({
    title: '感情',
    content: `官杀/财星为异性缘与亲密关系的象征。格局中和、十神不战者关系较顺；冲克多者宜多沟通、择机而动。`,
  });
  sections.push({
    title: '健康',
    content: `五行偏枯之脏腑宜留意（如金弱护肺、木弱养肝、水弱补肾）。此仅为传统说法的趣味提示，任何不适请务必就医。`,
  });
  if (daYun && daYun.length) {
    const near = daYun.slice(0, 3).map((d) => `${d.ganzhi}运（${d.startAge}-${d.endAge}岁）`).join('、');
    sections.push({ title: '大运走势', content: `早年及青壮年大运：${near}。大运十年一换，顺势而为、逆势守成。` });
  }
  sections.push({
    title: '建议',
    content:
      `以上为基于排盘的趣味参考。真正的人生走向取决于你的选择与行动。建议把注意力放在可改变的事上，并保持理性与乐观。`,
  });
  return sections;
}

function ruleZodiac(data, question) {
  const { shengXiao, currentYearGanZhi, currentZodiac, age, relation, relationDetail } = data;
  const sections = [];
  sections.push({
    title: '流年总览',
    content: `${shengXiao}年生人，今年${currentYearGanZhi}年（${currentZodiac}年），虚岁约${age + 1}。今年与你的关系为「${relation}」：${relationDetail}`,
  });
  const advice =
    relation === '本命年'
      ? '宜稳不宜动，重要决策可缓；注意作息与人际，传统有安太岁、佩红等习俗。'
      : relation === '冲太岁'
      ? '变动较多，签约、出行、人际需谨慎；不妨主动体检、整理事务以应变动。'
      : relation === '六合'
      ? '贵人运强，宜主动链接人脉、推进合作与情感关系，把握窗口期。'
      : '整体平稳，按部就班即可，留意健康与小额财务。';
  sections.push({ title: '建议', content: advice });
  return sections;
}

function ruleTarot(data, question) {
  const sections = [];
  const lines = data.cards
    .map((c) => `· ${c.position}：${c.name}（${c.orientation}）—— ${c.meaning}`)
    .join('\n');
  sections.push({
    title: '牌面解读',
    content: (question ? `你的问题：「${question}」\n` : '') + lines,
  });
  sections.push({
    title: '综合提示',
    content:
      '塔罗是照见内心与潜意识的镜子。正位多指顺势与显意识，逆位提示被忽略或被压抑的部分。请结合自身处境取用，勿过度执着单一牌义。',
  });
  return sections;
}

function ruleGenerate(system, data, question) {
  if (system === 'bazi') return ruleBazi(data, question);
  if (system === 'zodiac') return ruleZodiac(data, question);
  if (system === 'tarot') return ruleTarot(data, question);
  return [{ title: '提示', content: '该体系暂仅支持规则解读。' }];
}

async function llmGenerate(system, data, question) {
  const apiKey = process.env.LLM_API_KEY;
  const apiUrl = process.env.LLM_API_URL;
  const model = process.env.LLM_MODEL || 'default';
  if (!apiKey || !apiUrl) return null;
  const pack = knowledge.buildKnowledgePack(system);
  const userText =
    `【用户问题】${question || '（无）'}\n【测算数据 JSON】\n${JSON.stringify(data, null, 2)}\n` +
    `请严格依据知识框架与安全护栏，输出有层次、像真人老师般的中文解读（总断/分领域/建议）。`;
  try {
    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: `你是专业的命理解读师。\n${pack}` },
          { role: 'user', content: userText },
        ],
        temperature: 0.7,
      }),
    });
    if (!resp.ok) return null;
    const json = await resp.json();
    const text = json.choices?.[0]?.message?.content || json.content || '';
    if (!text) return null;
    // 简单切分标题
    const sections = text
      .split(/\n+(#{1,3}\s*|【|\[)/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => ({ title: '解读', content: s }));
    return sections.length ? sections : [{ title: '解读', content: text }];
  } catch (e) {
    return null;
  }
}

/**
 * 生成解读
 */
async function generateReading({ system, data, question }) {
  const llmSections = await llmGenerate(system, data, question);
  if (llmSections) {
    return { system, sections: llmSections, source: 'llm', question: question || '' };
  }
  return { system, sections: ruleGenerate(system, data, question), source: 'rule', question: question || '' };
}

module.exports = { generateReading };
