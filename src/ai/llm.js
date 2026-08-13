'use strict';
/**
 * LLM 适配器（M3）
 * 兼容 OpenAI Chat Completions 协议（混元/DeepSeek/通义等可代理）。
 * 环境变量驱动：LLM_API_URL / LLM_API_KEY / LLM_MODEL。
 * 失败或未配置时返回 null，由调用方回退规则模板。
 */
const knowledge = require('../knowledge');

function splitSections(text) {
  const lines = text.split('\n');
  const sections = [];
  let cur = null;
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    // 标题：## / # / 【】 / 数字. / 中文冒号开头
    if (/^(#{1,3}\s*|【.*】$|^\d+[\.、]|^[一二三四五六七八九十]+[、\.])/.test(t)) {
      const title = t.replace(/^#{1,3}\s*/, '').replace(/[：:].*$/, '').replace(/【|】/g, '').trim();
      cur = { title: title || '解读', content: [] };
      sections.push(cur);
    } else if (cur) {
      cur.content.push(t);
    } else {
      cur = { title: '解读', content: [t] };
      sections.push(cur);
    }
  }
  if (!sections.length) sections.push({ title: '解读', content: [text.trim()] });
  return sections.map((s) => ({ title: s.title, content: s.content.join('\n') }));
}

/**
 * 调用 LLM 生成解读
 * @returns {Promise<Array<{title,content}>|null>}
 */
async function callLLM({ system, data, question }) {
  const apiUrl = process.env.LLM_API_URL;
  const apiKey = process.env.LLM_API_KEY;
  if (!apiUrl || !apiKey) return null;
  const model = process.env.LLM_MODEL || 'default';
  const pack = knowledge.buildKnowledgePack(system);
  const userText =
    `【用户问题】${question || '（无）'}\n【测算数据 JSON】\n${JSON.stringify(data, null, 2)}\n` +
    `请严格依据知识框架与安全护栏，输出有层次、像真人老师般的中文解读（总断/分领域/建议），可用 ## 或 【】 分段。`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: `你是专业的命理解读师，需严格遵守安全伦理护栏。\n${pack}` },
          { role: 'user', content: userText },
        ],
        temperature: 0.7,
      }),
      signal: controller.signal,
    });
    if (!resp.ok) return null;
    const json = await resp.json();
    const text = json.choices?.[0]?.message?.content || json.content || '';
    if (!text) return null;
    return splitSections(text);
  } catch (e) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { callLLM };
