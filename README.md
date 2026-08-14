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
| 年运 | `/api/annual` | 流年生肖关系（本命/冲/六合/平稳）+ 当年 12 个月逐月概要、最佳/最需谨慎月 |
| 月运 | `/api/monthly` | 指定年月的生肖流月关系与运势提示 |
| 星盘占星 | `/api/xingzhan` | 西方占星：十大行星地心黄道经度、落座与度数、顺/逆行、五大主要相位（合/六分/四分/三分/对冲），基于 `astronomy-engine` 真实星历 |
| 用户存储 | `/api/user/history` `/api/user/favorites` | 按 `X-Client-Id` 分用户保存历史记录与收藏（本地 JSON，上限 50 条） |
| 命理解读 | `/api/reading` | 按体系生成结构化解读（LLM 优先，失败/未配置自动回退规则模板）；支持 `deep:true` 会员深度解读 |
| 会员 / 商业化 | `/api/membership`（GET）、`/api/membership/upgrade`（POST） | 按 `X-Client-Id` 存会员状态；深度解读仅会员可调用（返回 403）。**当前为本地演示，未接入真实支付** |

## 技术栈

- Node.js 内置 `http` 服务（**零额外依赖**，仅 `lunar-javascript`（东方针算）与 `astronomy-engine`（西占星历）用于排盘）
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

## 微信小程序壳（`miniprogram/`）

小程序本身**不做排盘计算**，仅作为前端调用本仓库的 Node 后端 API（`/api/*`），因此 13 个测算体系的全部逻辑都复用后端，无需重复实现。目录：

```
miniprogram/
  project.config.json     # 工程配置（appid 当前为 touristappid 占位，发布前需替换为你自己的 AppID）
  app.js / app.json / app.wxss
  utils/api.js            # wx.request 封装，注入 X-Client-Id
  utils/systems.js        # 13 个体系的字段元数据 + 请求体构造（含关系合盘嵌套、六爻按起卦方式构造）
  pages/index/            # 测算菜单（13 体系网格，可分享）
  pages/calc/             # 输入表单 → 调 /api/{system} 拿命盘 → 调 /api/reading 渲染解读
                          #   · 结果页支持「收藏」与「深度解读（会员）」
  pages/records/          # 历史 / 收藏（调 /api/user/history、/api/user/favorites），含会员状态与删除
  pages/member/           # 会员页（状态查询 + 模拟开通，调 /api/membership、/api/membership/upgrade）
  pages/settings/         # 服务设置（配置后端 apiBase 并持久化，含连通性检测）
  pages/about/            # 免责声明页
```

**功能清单（小程序端）**：
- 13 个测算体系，数据驱动表单（字段/校验/请求体均由 `utils/systems.js` 描述）。
- 测算结果自动写入历史；结果页可一键「收藏」。
- 会员体系闭环：免费用户测算后可引导开通会员，VIP 可查看每体系「深度延展」专属解读。
- 历史/收藏查看与删除、会员状态展示。
- 分享给好友（`onShareAppMessage`）。
- 服务设置页：可视化配置后端地址并做连通性自检（无需改代码）。

**接入步骤**：
1. 用微信开发者工具「导入项目」，目录选 `miniprogram/`。
2. 把 `project.config.json` 里的 `appid` 改为你自己的小程序 AppID（或保持 `touristappid` 仅本地预览）。
3. 启动本仓库后端：`npm install && npm start`（默认 `http://localhost:3000`）。
4. 配置后端地址（二选一）：
   - 改代码：编辑 `miniprogram/app.js` 的 `apiBase`（默认值 `http://localhost:3000`）。
   - 改配置（推荐）：在小程序「我的 → 服务设置」里填写后端地址并保存，支持连通性自检。
   - 本地预览：填电脑局域网 IP，如 `http://192.168.x.x:3000`，并在开发者工具勾选「不校验合法域名、TLS 版本以及 HTTPS 证书」。
   - 正式发布：必须填 **HTTPS 域名**，并在小程序后台「开发管理 → 服务器域名 → request 合法域名」中加入该域名。


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
src/pan/annual.js         # 年运/月运
src/pan/xingzhan.js       # 星盘占星（西方占星，astronomy-engine 真实星历）
src/store.js              # 本地用户存储层（历史/收藏，按 clientId）
src/knowledge/            # 知识层（框架文档 + 索引）
src/ai/interpreter.js     # AI 解读层
src/routes/api.js         # API 路由
public/                   # Web 前端单页（含历史/收藏记录中心）
miniprogram/              # 微信小程序壳（前端，调用上面后端 API）
test/run.js               # 测试（27 项）
```

## 商业化与上线（M7）

采用 **Freemium 免费增值** 模型：13 个体系的「基础解读」全部免费；「会员」解锁每个体系的「💎 会员专享·深度延展」进阶内容。

- Web 端「会员」Tab、小程序「会员」页均可演示「开通 → 解锁深度解读」完整闭环。
- 后端已落地会员状态与 `deep` 深度解读鉴权（非会员调用深度解读返回 403），但**当前为本地演示，未接入真实支付**（`store.js` 中 `demo:true` 标记）。
- 上线前需接微信支付（小程序）/ 苹果内购（iOS），并补齐 ICP 备案、增值电信许可证等资质。
- 完整方案、定价建议、合规红线与上线清单见 `docs/M7-商业化与上线.md`；部署步骤见 `docs/DEPLOY.md`。

## 在线演示（无需后端）

为便于分享，已构建**纯静态版**并部署到云端，所有测算在浏览器本地完成（无需 Node 后端）：

- **演示地址：** https://52450abfdcc2403aadd3756b28f77c57.app.workbuddy.link
- 构建方式：将 `src/pan/*` 排盘引擎 + `src/ai/interpreter` 规则解读层，用 esbuild 打成浏览器包（`dist/engine.js`），前端加 `dist/shim.js` 拦截 `/api/*` 走本地计算。
- 重新构建：`node tools/build-demo.js`（产物在 `dist/`，已加入 `.gitignore`）。
- ⚠️ 演示版为**纯前端规则解读**，未接入 LLM 增强、历史/收藏不持久化、会员为演示态；完整功能（含 LLM、存储、真实会员）请用带后端的 `server.js` 版本（见 `docs/DEPLOY.md`）。

## 合规说明

本应用仅用于**娱乐与自我觉察**，不涉及医疗、法律、财务专业建议，不提供付费改运服务。

**已落地的合规层**：Web 端（页头声明 + 免责声明弹层 + 未成年人首访提示 + 每条解读末尾统一"仅供娱乐"声明）、小程序端（首页声明含未成年提示 + 关于/免责页 + 结果页底部声明）。

⚠️ **微信小程序上线风险（务必提前评估）**：微信对"算命/占卜/风水"类内容审核极严，通常被归入受限或需特殊资质的类目（如"宗教/迷信""心理测试"，或要求《增值电信业务经营许可证》/营业执照）。大量算命类小程序会被拒审或下架。建议：① 先以 Web/H5 版本做内测与分享；② 小程序以"心理测试/趣味娱乐"口径申报类目并提交资质；③ 持续内容审核，避免出现医疗、投资、婚恋保证等违禁表述。详见 `overview.md` 的「合规与上线风险」一节。

## 隐私政策与用户协议（小程序上架必备）

微信小程序在提审/上线时，**必须在「微信公众平台 → 设置 → 服务内容声明 / 用户隐私保护指引」中填写《隐私政策》的可访问 URL**，否则无法过审。本项目已提供两份可直接托管的模板：

- `public/privacy.html` — 《隐私政策》：说明本项目**不收集真实身份/敏感权限**、按匿名 `clientId` 隔离、历史/收藏本地存储、会员为本地演示未接真实支付、未成年保护、娱乐声明与用户删除权。
- `public/agreement.html` — 《用户协议》：服务说明、使用资格、数据归属、会员与付费（演示）、免责、知识产权、禁止行为与争议解决。

**托管方式（任选其一，拿到公开 URL 即可填到微信后台）**：

1. 与在线演示同站托管：已将两份页面纳入 `node tools/build-demo.js` 的构建产物 `dist/`，随演示站一起部署，访问 `你的演示域名/privacy.html`、`/agreement.html` 即可。
2. 任意静态托管（GitHub Pages / 对象存储 / 自己的服务器）上传这两个 HTML，取得 https 链接。

> 注意：隐私政策中声明的"数据收集范围"必须与小程序实际行为一致；若后续接入真实支付、真实 LLM 或新增权限，须同步更新本政策。
