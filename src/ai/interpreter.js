'use strict';
/**
 * AI 解读层
 * 输入：测算体系 system + 排盘数据 data（+ 可选问题 question）
 * 输出：结构化解读 { sections: [{title, content}], source: 'rule'|'llm' }
 * 默认走规则模板（零依赖、可离线）；配置了 LLM 环境变量后自动切换为 LLM 解读。
 */
const knowledge = require('../knowledge');
const { callLLM } = require('./llm');

const WUXING_COLOR = { 木: '青绿', 火: '红', 土: '黄', 金: '白', 水: '黑' };
const WUXING_DIR = { 木: '东', 火: '南', 土: '中', 金: '西', 水: '北' };

// 会员专享·深度延展（freemium 内容差异，可被真实 LLM 深度解读替换）
const DEEP_EXTRA = {
  bazi: '深度延展：把命局看作一份"能量配置说明书"而非定数。身强者可主动承担更具挑战性的目标以释放势能；身弱者宜先夯实能力圈、借平台之力。未来三年重点关注大运切换的节点年份——那往往是外部机会与内在状态共振的窗口。',
  ziwei: '深度延展：命盘十二宫是人生不同领域的"资源分布图"。优先在你"主星庙旺、化禄化权"的宫位对应的领域发力，事半功倍；化忌所在宫位则宜守不宜攻，提前做风险缓冲。流年走到重要宫位时，顺势布局。',
  zodiac: '深度延展：生肖运是年度"天气"，不是你的"剧本"。关系为"冲"的年份重在稳与守（重大决定缓一缓），为"六合/三合"的年份重在连与动（多合作、多出行）。把能量用在可控的事上，比预测更可靠。',
  daily: '深度延展：日运是"今日情绪底色"的提示。若今日偏"凶"，把它当成"低速模式"——处理例行事务、避免高风险决策即可，不必焦虑；若偏"吉"，借势推进拖延已久的事。你始终拥有是否执行的主动权。',
  numerology: '深度延展：生命灵数揭示的是你的"默认操作系统"与功课方向。若某条路径反复让你受挫，不妨对照灵数特质看看是否在与天性对抗。天赋数提示你天然擅长的事，可据此选择长期投入的赛道。',
  tarot: '深度延展：牌面不是预言，而是"当下心理场域的镜子"。三张（过去/现在/未来）构成一条叙事线——过去塑造了现在，而现在的选择决定未来。若未来牌不理想，改变"现在"这一张即可改写走向。',
  yijing: '深度延展：卦象给出的是"时位"判断——此事在当前时空节点宜进还是宜守。变爻提示关键转折点。把卦辞当作决策前的第二视角校验，而非唯一依据；重大决策仍请以现实信息为准。',
  qimen: '深度延展：奇门提供的是"时空能量分布"的参考框架。吉门吉星方位适合启动重要事项，凶格方位宜避开或谨慎。它帮你优化"何时/何地"，但不能替代"做什么/为谁做"的判断。',
  fengshui: '深度延展：八宅是居住环境与人的"匹配度"模型。东四命住东四宅、西四命住西四宅为基本原则；但采光、通风、整洁对健康的影响远大于方位。先解决物理环境，再用风水做微调。',
  relationship: '深度延展：合盘看的是两人"能量互动模式"，而非缘分有无。相生组合顺、相冲组合需更多沟通机制。任何关系都靠经营，合盘只是指出你们天然容易在哪方面"踩脚"，提前设防即可。',
  annual: '深度延展：年运按月展开，本质是"年度节奏地图"。把最佳月用于进攻（求职、签约、启动），最需谨慎月用于防守（不出大错、不冒进）。节奏感比单点运势更能决定年终结果。',
  monthly: '深度延展：月运是年运的"放大镜"。流月与流年同吉则顺势加码，流月冲流年则本月宜收。把本月要事尽量排在吉日吉方，是一种低成本的自我赋能。',
  xingzhan: '深度延展：星盘是个人心理原型的"宇宙隐喻"。个人行星（日/月/水/金/火）描述你如何感受与行动，社会行星（木/土）描述你如何成长与受限，世代行星（天/海/冥）标记你所处的时代集体潜意识。重点相位揭示内在张力——觉察它，便已迈出整合的第一步。',
};

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
  sections.push({
    title: '声明',
    content: '以上为生肖流年的趣味性推演，仅供娱乐与自我觉察，不构成任何专业建议；人生走向仍取决于你的选择与行动。',
  });
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
  sections.push({
    title: '声明',
    content: '塔罗结果仅供娱乐与自我觉察，不构成任何专业建议；如遇现实困扰，请咨询具备资质的专业人士。',
  });
  return sections;
}

function ruleZiwei(data, question) {
  const sections = [];
  const { xingWuju, mingGong, shenGong, ziweiAt, palaces } = data;
  const mingPalace = palaces[0];
  sections.push({
    title: '总断',
    content: `${xingWuju}，命宫坐${mingGong.ganzhi}，紫微星在${ziweiAt}。命宫主星：${mingPalace.mainStars.join('、') || '（无主星，借对宫）'}。身宫在${shenGong.ganzhi}。`,
  });
  sections.push({
    title: '十二宫主星',
    content: palaces.map((p) => `${p.name}(${p.ganzhi})：${p.mainStars.join('、') || '—'}`).join('\n'),
  });
  const mingStars = mingPalace.mainStars;
  let trait = '命宫无主星（借对宫论断），性格随环境调节明显。';
  const TRAITS = [
    ['紫微', '有领导气质与自尊心，重体面、有担当。'],
    ['天机', '聪慧善谋，反应快，喜变动与学习。'],
    ['太阳', '热情开朗，乐于助人，重视名誉。'],
    ['武曲', '刚毅务实，执行力强，理财观念好。'],
    ['天同', '随和乐观，福气佳，但稍显安逸。'],
    ['廉贞', '进取心强，重情也重原则，魄力足。'],
    ['天府', '稳重守成，善于经营，重享受但不逾矩。'],
    ['太阴', '温和细腻，内敛感性，重家庭与情感。'],
    ['贪狼', '多才多艺，交际广，欲望与行动力并存。'],
    ['巨门', '口才佳、心思细，需注意言语分寸。'],
    ['天相', '温文有礼，协调力强，是得力的辅助者。'],
    ['天梁', '稳重有担当，常为他人操心，有贵人特质。'],
    ['七杀', '果断敢冲，性格刚烈，适合开创性事务。'],
    ['破军', '敢破敢立，变动大，行动力与爆发力强。'],
  ];
  for (const [star, text] of TRAITS) {
    if (mingStars.includes(star)) { trait = text; break; }
  }
  sections.push({ title: '性格', content: trait });
  sections.push({
    title: '建议',
    content: '以上为简版紫微（仅十四主星）的趣味参考。完整论断需辅星、四化与流年结合；人生走向仍取决于你的选择与行动。',
  });
  return sections;
}

function ruleNumerology(data, question) {
  const { lifePath, talent, birthday, missing } = data;
  const sections = [];
  sections.push({
    title: '总断',
    content: `生命灵数（主数）为 ${lifePath.number}：${lifePath.meaning}`,
  });
  sections.push({
    title: '天赋数',
    content: talent.map((t) => `天赋 ${t.number}：${t.meaning}`).join('\n'),
  });
  sections.push({ title: '生日数', content: `生日数 ${birthday.number}：${birthday.meaning}` });
  sections.push({
    title: '缺失数',
    content: missing.length ? `出生日期中未出现的数字：${missing.join('、')}（可作为兴趣拓展的方向，仅供参考）` : '出生日期 0-9 齐全，能量较均衡。',
  });
  sections.push({ title: '建议', content: '数字命理是自我觉察的工具，用于了解倾向而非贴标签；请结合实际生活理性看待。' });
  return sections;
}

function ruleDaily(data, question) {
  const { birthZodiac, dayGanZhi, dayZodiac, chongZodiac, relation, rating, detail, luckyColor, luckyNumber } = data;
  const sections = [];
  sections.push({
    title: '今日概览',
    content: `${birthZodiac}年生的你，${data.meta.date}（${dayGanZhi}日，${dayZodiac}日）运势【${rating}】：「${relation}」。${detail}`,
  });
  sections.push({
    title: '小贴士',
    content: `今日冲${chongZodiac}。幸运色：${luckyColor}；幸运数字：${luckyNumber}（趣味参考）。`,
  });
  sections.push({
    title: '声明',
    content: '每日运势为趣味参考，不构成任何专业建议；健康与重要决策请以现实情况为准。',
  });
  return sections;
}

function ruleYijing(data, question) {
  const sections = [];
  sections.push({
    title: '卦象',
    content: `${data.upperGua}上卦、${data.lowerGua}下卦，得「${data.hexagon}」，动爻第${data.movingLine}爻。${data.meaning}`,
  });
  sections.push({
    title: '指引',
    content: `${question ? `针对你的问题「${question}」：` : ''}本卦提示${data.meaning}动爻所在，代表变化的契机所在；结合当下处境顺势而为，可参考卦意调整策略。`,
  });
  sections.push({ title: '建议', content: data.note });
  return sections;
}

function ruleQimen(data, question) {
  const sections = [];
  sections.push({
    title: '当日奇门',
    content: `${data.meta.date}（${data.dayGanZhi}），${data.yinYangDun}${data.ju}局。当日吉门：${data.luckyDoors.join('、')}；凶门：${data.badDoors.join('、')}。`,
  });
  sections.push({
    title: '用事建议',
    content: `重要会谈、签约、出行可优先选择吉门方位（如${data.luckyDoors[0] || '北'}），规避凶门方位（如${data.badDoors[0] || '南'}）。`,
  });
  sections.push({ title: '提示', content: data.note });
  return sections;
}

function ruleFengshui(data, question) {
  const sections = [];
  const g = data.mingGua;
  sections.push({
    title: '本命卦',
    content: `${g.name}命（${g.group}）。传统八宅认为${g.group}宜住${g.group === '东四命' ? '东四宅（东、南、东南、北）' : '西四宅（西、西北、西南、东北）'}。`,
  });
  sections.push({ title: '吉位', content: `生气/天医/延年/伏位（吉）：${data.goodDirections.join('、')}` });
  sections.push({ title: '凶位', content: `绝命/五鬼/六煞/祸害（凶）：${data.badDirections.join('、')}` });
  if (data.dateInfo) {
    sections.push({ title: '择日提示', content: `${data.dateInfo.date}（${data.dateInfo.dayGanZhi}日，冲${data.dateInfo.chong}）：属${data.dateInfo.chong}者当日宜避大事，余者平顺。` });
  }
  sections.push({ title: '建议', content: data.note });
  return sections;
}

function ruleRelationship(data, question) {
  const sections = [];
  sections.push({
    title: '合盘总断',
    content: `${data.a.zodiac}（${data.a.year}年）与 ${data.b.zodiac}（${data.b.year}年）：生肖关系「${data.relation}」，合盘评分 ${data.score}/100。${data.detail}`,
  });
  sections.push({ title: '五行层面', content: data.wuxingTip });
  sections.push({ title: '建议', content: data.note });
  return sections;
}

function ruleAnnual(data, question) {
  const sections = [];
  sections.push({
    title: '年运总断',
    content: `${data.birthZodiac}年生人，${data.targetYear}年（${data.targetGanZhi}·${data.targetZodiac}年）：${data.relation}（${data.score}/100）。${data.detail}`,
  });
  const byScore = (list) => list.filter((m) => m.score >= 80).map((m) => m.month + '月').join('、') || '（暂无）';
  const byLow = (list) => list.filter((m) => m.score <= 50).map((m) => m.month + '月').join('、') || '（暂无）';
  sections.push({
    title: '逐月提示',
    content: `全年较旺的月份：${byScore(data.months)}；较需谨慎的月份：${byLow(data.months)}。可顺势安排重要事项。`,
  });
  sections.push({
    title: '分领域建议',
    content:
      '事业：顺势之年大胆推进，平稳之年深耕积累。\n感情：六合/旺月主动经营，冲刑之年多沟通少赌气。\n健康：无论顺逆，作息与体检照常。\n财运：旺月可适度进取，谨慎月守成为上。',
  });
  sections.push({ title: '建议', content: '年运为趣味参考，真正的运势由你的行动决定。' });
  return sections;
}

function ruleMonthly(data, question) {
  const sections = [];
  sections.push({
    title: '月运总断',
    content: `${data.birthZodiac}年生人，${data.targetYear}年${data.month}月（${data.monthGanZhi}）：${data.relation}（${data.score}/100）。${data.detail}`,
  });
  sections.push({
    title: '建议',
    content: '本月可据此安排节奏：旺月多行动、谨慎月多准备。仅供参考，心态与行动最重要。',
  });
  return sections;
}

const SIGN_MEANING = {
  白羊: '行动力强、直率敢闯，重视自我与开创。',
  金牛: '稳健务实、重安全感与美感，耐心而固执。',
  双子: '机智善变、好奇心强，擅长沟通与学习。',
  巨蟹: '细腻顾家、重情感与庇护，敏感而念旧。',
  狮子: '自信大方、有领导力与表现欲，重尊严。',
  处女: '细致周到、务实求真，追求秩序与完善。',
  天秤: '和谐优雅、重关系与公平，善于协调。',
  天蝎: '深刻专注、洞察力强，情感强烈而隐忍。',
  射手: '乐观豁达、热爱自由与探索，直率而理想化。',
  摩羯: '自律负责、重现实成就，坚韧而有规划。',
  水瓶: '独立前卫、重理念与群体，理性而独特。',
  双鱼: '温柔多感、富有想象与共情，灵性而模糊。',
};
const ASPECT_MEANING = {
  合相: '能量聚焦、强化该主题，影响显著。',
  六分相: '温和的机遇与和谐助力，顺手可得。',
  四分相: '内在张力与挑战，促使成长与行动。',
  三分相: '顺畅的才华与好运流向，轻松发挥。',
  对冲: '对立与拉扯，需平衡两极、借关系照见自己。',
};
const PERSONAL = ['sun', 'moon', 'mercury', 'venus', 'mars'];
const SOCIAL = ['jupiter', 'saturn'];

function ruleXingzhan(data, question) {
  const sections = [];
  const byKey = {};
  data.planets.forEach((p) => { byKey[p.key] = p; });
  const sun = byKey.sun, moon = byKey.moon;

  sections.push({
    title: '总断',
    content: `太阳落在${sun.sign}（${sun.degreeInSign}°）：${SIGN_MEANING[sun.sign]}月亮落在${moon.sign}（${moon.degreeInSign}°）：${SIGN_MEANING[moon.sign]}太阳代表你的核心自我与意志方向，月亮代表内在情绪与潜意识需求。`,
  });

  const personal = PERSONAL.map((k) => {
    const p = byKey[k];
    return `${p.name}·${p.sign}${p.retrograde ? '（逆行）' : ''}`;
  }).join('，');
  sections.push({ title: '个人行星（日/月/水/金/火）', content: personal + '。这些行星塑造你的性格、表达与行动方式。' });

  const social = SOCIAL.concat(['uranus', 'neptune', 'pluto']).map((k) => {
    const p = byKey[k];
    return `${p.name}·${p.sign}${p.retrograde ? '（逆行）' : ''}`;
  }).join('，');
  sections.push({ title: '社会与世代行星（木/土/天/海/冥）', content: social + '。木土影响价值观与责任，天海冥代表时代群体课题（世代行星常被多颗同时逆行，属常态）。' });

  if (data.aspects && data.aspects.length) {
    const top = data.aspects.slice(0, 6).map((a) => `· ${a.a}（${a.aSign}）${a.type}${a.b}（${a.bSign}）：${ASPECT_MEANING[a.type]}（容许度 ${a.orb}°）`).join('\n');
    sections.push({ title: '重点相位', content: `共检测到 ${data.aspects.length} 组主要相位，择其紧密者：\n${top}` });
  } else {
    sections.push({ title: '重点相位', content: '本次未检测到显著的紧密相位。' });
  }

  sections.push({
    title: '声明',
    content: '以上星盘为基于出生时刻的趣味推演，仅供娱乐与自我觉察，不构成任何专业建议；精确的占星还需结合上升、宫位、时区与出生地。人生走向仍取决于你的选择与行动。',
  });
  return sections;
}

function ruleGenerate(system, data, question) {
  if (system === 'bazi') return ruleBazi(data, question);
  if (system === 'ziwei') return ruleZiwei(data, question);
  if (system === 'zodiac') return ruleZodiac(data, question);
  if (system === 'daily') return ruleDaily(data, question);
  if (system === 'tarot') return ruleTarot(data, question);
  if (system === 'numerology') return ruleNumerology(data, question);
  if (system === 'yijing') return ruleYijing(data, question);
  if (system === 'qimen') return ruleQimen(data, question);
  if (system === 'fengshui') return ruleFengshui(data, question);
  if (system === 'relationship') return ruleRelationship(data, question);
  if (system === 'annual') return ruleAnnual(data, question);
  if (system === 'monthly') return ruleMonthly(data, question);
  if (system === 'xingzhan') return ruleXingzhan(data, question);
  return [{ title: '提示', content: '该体系暂仅支持规则解读。' }];
}

/**
 * 生成解读（优先 LLM，失败/未配置回退规则模板）
 */
async function generateReading({ system, data, question, deep }) {
  const llmSections = await callLLM({ system, data, question, deep });
  let sections, source;
  if (llmSections) {
    sections = llmSections; source = 'llm';
  } else {
    sections = ruleGenerate(system, data, question); source = 'rule';
  }
  if (deep) {
    const extra = DEEP_EXTRA[system] || '作为会员，建议你把以上解读当作一份"自我觉察清单"：挑出最触动你的 1-2 点，转化为本周可执行的小行动，比一次性全盘接受更有价值。';
    sections = sections.concat([{ title: '💎 会员专享·深度延展', content: extra }]);
  }
  return { system, sections, source, question: question || '', deep: !!deep };
}

module.exports = { generateReading };
