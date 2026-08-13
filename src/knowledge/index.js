'use strict';
/**
 * 知识层
 * 将 fortune-master-pro-dao-v2 的 references 框架文档载入内存，
 * 供 AI 解读层按体系检索并作为 system prompt 注入。
 */
const fs = require('fs');
const path = require('path');

const REF_DIR = path.join(__dirname, 'references');

// 体系 -> 框架文件
const SYSTEM_FILES = {
  bazi: 'bazi-framework.md',
  ziwei: 'ziwei-framework.md',
  tarot: 'tarot-framework.md',
  astrology: 'astrology-framework.md',
  numerology: 'numerology-framework.md',
  qimen: 'qimen-framework.md',
  yijing: 'yijing-divination-framework.md',
  fengshui: 'fengshui-and-timing-framework.md',
  dao: 'dao-mysticism-framework.md',
  relationship: 'relationship-and-timing.md',
  intake: 'intake-and-routing.md',
  output: 'output-templates.md',
};

function readRef(file) {
  try {
    return fs.readFileSync(path.join(REF_DIR, file), 'utf8');
  } catch (e) {
    return '';
  }
}

const cache = {};
function getFramework(system) {
  if (cache[system]) return cache[system];
  const file = SYSTEM_FILES[system];
  const text = file ? readRef(file) : '';
  cache[system] = text;
  return text;
}

function getSafety() {
  return readRef('safety-and-ethics.md');
}

function getOutputTemplate() {
  return readRef('output-templates.md');
}

// 用于 LLM 注入的完整知识包（指定体系 + 通用护栏）
function buildKnowledgePack(system) {
  const parts = [];
  const fw = getFramework(system);
  if (fw) parts.push(`【${system} 体系框架】\n${fw}`);
  parts.push(`【输出模板规范】\n${getOutputTemplate()}`);
  parts.push(`【安全与伦理护栏（必须严格遵守）】\n${getSafety()}`);
  return parts.join('\n\n');
}

module.exports = { getFramework, getSafety, getOutputTemplate, buildKnowledgePack, SYSTEM_FILES };
