'use strict';
/**
 * 塔罗占卜层
 * 大阿卡纳 22 张，随机抽牌（可选 1 张或 3 张 过去/现在/未来）。
 * 牌义为内置知识表；更深层解读由 AI 解读层结合知识库生成。
 */
const MAJOR_ARCANA = [
  { n: 0, name: '愚者', up: '新的开始、自由、纯真、冒险', rev: '鲁莽、犹豫、逃避' },
  { n: 1, name: '魔术师', up: '创造、行动力、资源整合', rev: '欺骗、潜能未发挥' },
  { n: 2, name: '女祭司', up: '直觉、潜意识、神秘智慧', rev: '压抑、秘密、缺乏觉知' },
  { n: 3, name: '皇后', up: '丰饶、母性、滋养、美感', rev: '依赖、空虚、过度付出' },
  { n: 4, name: '皇帝', up: '权威、秩序、稳固、掌控', rev: '专制、僵化、失控' },
  { n: 5, name: '教皇', up: '传统、信仰、指引、学习', rev: '墨守成规、盲从' },
  { n: 6, name: '恋人', up: '爱、结合、重要抉择', rev: '失衡、错误选择、分离' },
  { n: 7, name: '战车', up: '胜利、意志、前进', rev: '失控、方向迷失' },
  { n: 8, name: '力量', up: '勇气、柔韧、内在力量', rev: '自我怀疑、情绪失控' },
  { n: 9, name: '隐士', up: '内省、独处、寻道', rev: '孤立、逃避社交' },
  { n: 10, name: '命运之轮', up: '转机、循环、机遇', rev: '厄运、停滞、失控' },
  { n: 11, name: '正义', up: '公正、因果、平衡', rev: '偏颇、责任逃避' },
  { n: 12, name: '倒吊人', up: '换个视角、牺牲、顿悟', rev: '无谓牺牲、拖延' },
  { n: 13, name: '死神', up: '结束与重生、蜕变', rev: '恐惧改变、停滞' },
  { n: 14, name: '节制', up: '调和、耐心、中庸', rev: '失衡、过度' },
  { n: 15, name: '恶魔', up: '束缚、欲望、执念', rev: '挣脱、觉醒' },
  { n: 16, name: '高塔', up: '突变、崩塌、觉醒', rev: '拖延的灾、余震' },
  { n: 17, name: '星星', up: '希望、疗愈、指引', rev: '失望、迷惘' },
  { n: 18, name: '月亮', up: '潜意识、幻象、直觉', rev: '迷惑、恐惧、欺骗' },
  { n: 19, name: '太阳', up: '喜悦、成功、光明', rev: '短暂光明、过度乐观' },
  { n: 20, name: '审判', up: '觉醒、召唤、重生', rev: '自我否定、错失' },
  { n: 21, name: '世界', up: '圆满、完成、整合', rev: '未竟、缺憾' },
];

const POSITIONS_3 = ['过去', '现在', '未来'];

function randInt(n) { return Math.floor(Math.random() * n); }

/**
 * 抽塔罗牌
 * @param {object} input { count: 1|3, question?: string }
 */
function drawTarot(input = {}) {
  const count = input.count === 3 ? 3 : 1;
  const picked = [];
  const pool = [...MAJOR_ARCANA];
  for (let i = 0; i < count; i++) {
    const idx = randInt(pool.length);
    const card = pool.splice(idx, 1)[0];
    const reversed = Math.random() < 0.4;
    picked.push({
      position: count === 3 ? POSITIONS_3[i] : '指引',
      name: card.name,
      number: card.n,
      orientation: reversed ? '逆位' : '正位',
      meaning: reversed ? card.rev : card.up,
    });
  }
  return {
    meta: { system: 'tarot', count, question: input.question || '' },
    cards: picked,
  };
}

module.exports = { drawTarot, MAJOR_ARCANA };
