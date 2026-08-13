# 命理测算小程序（fortune-master-miniprogram）

基于 [`fortune-master-pro-dao-v2`](https://skillhub.cn/skills/52yuanchangxing/fortune-master-pro) 知识框架开发的命理测算应用。采用**三层架构**：

- **排盘层（确定性算法）**：基于 `lunar-javascript` 精确排盘，输出结构化命盘 JSON。
- **知识层**：直接移植自 `fortune-master-pro` 的 13 套体系框架文档（八字/紫微/塔罗/星盘/数字/奇门/六爻/风水/择时/关系等）。
- **AI 解读层**：把排盘数据 + 知识框架注入 Prompt，生成结构化中文解读；默认走规则模板（零依赖、可离线），配置 LLM 环境变量后自动切换为大模型解读。

## 已实现模块

| 模块 | 路径 | 说明 |
|---|---|---|
| 八字排盘 | `/api/bazi` | 四柱、干支、五行、十神、藏干、纳音、大运、胎元命宫 |
| 紫微斗数 | `/api/ziwei` | 命宫/身宫、五行局、十四主星、十二宫（简版，辅星待扩展） |
| 生肖运势 | `/api/zodiac` | 出生生肖 + 流年干支，本命/冲/合关系判定 |
| 每日运势 | `/api/daily` | 生肖 + 当日干支，冲合关系、评级、幸运色 |
| 数字命理 | `/api/numerology` | 生命灵数、天赋数、生日数、缺失数 |
| 塔罗占卜 | `/api/tarot` | 大阿卡纳 22 张，单张或三张（过去/现在/未来） |
| 六爻起卦 | `/api/yijing` | 时间/数字起卦，六十四卦名与释义 |
| 奇门择吉 | `/api/qimen` | 阴阳遁、局数、八门吉凶方位（演示版） |
| 风水八宅 | `/api/fengshui` | 本命卦、东四/西四命、吉凶方位、择日提示 |
| 关系合盘 | `/api/relationship` | 生肖六合/三合/冲/害/刑 + 年命五行生克评分 |
| 命理解读 | `/api/reading` | 按体系生成结构化解读（LLM 优先，失败/未配置自动回退规则模板） |

## 技术栈

- Node.js 内置 `http` 服务（**零额外依赖**，仅 `lunar-javascript` 用于排盘）
- 前端：原生 HTML/CSS/JS 单页（移动端风格，可直接套微信小程序 WebView 或改造为小程序）
- 知识库：Markdown 文档 + 索引模块
- 测试：零依赖 `node test/run.js`

## 运行

```bash
npm install        # 安装 lunar-javascript
npm test           # 运行测试
npm start          # 启动服务，默认 http://localhost:3000
```

前端打开 `http://localhost:3000` 即可使用；也可通过 `/api/*` 对接到微信小程序、H5 或任意前端。

## 可选：接入 LLM 解读

设置环境变量后，解读层自动改用大模型（需兼容 OpenAI Chat Completions 协议的接口）：

```bash
export LLM_API_URL="https://your-llm-endpoint/v1/chat/completions"
export LLM_API_KEY="sk-xxx"
export LLM_MODEL="your-model"
```

未配置时自动回退到规则模板解读，功能完全可用。

## 目录结构

```
server.js                 # HTTP 服务入口（静态 + /api）
src/pan/bazi.js           # 八字排盘
src/pan/zodiac.js         # 生肖运势
src/pan/tarot.js          # 塔罗占卜
src/knowledge/            # 知识层（框架文档 + 索引）
src/ai/interpreter.js     # AI 解读层
src/routes/api.js         # API 路由
public/                   # 前端单页
test/run.js               # 测试
```

## 合规说明

本应用仅用于**娱乐与自我觉察**，不涉及医疗、法律、财务专业建议，不提供付费改运服务。生产上线请按平台类目要求补充资质与娱乐声明、未成年人保护等合规项（详见规划方案文档）。
