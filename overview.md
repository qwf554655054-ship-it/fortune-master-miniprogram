# 命理测算小程序 — 交付说明（MVP）

## 成果
一个**可运行的命理测算 Web 应用**，已实现并验证：
- **八字排盘**：四柱、干支、五行、十神、藏干、纳音、大运、胎元/命宫（基于 lunar-javascript，确定性）
- **生肖运势**：出生生肖 + 流年干支，本命/冲/合关系判定
- **塔罗占卜**：大阿卡纳 22 张，单张或三张（过去/现在/未来）
- **AI 解读层**：规则模板（零依赖离线可用）+ LLM 可插拔（设 `LLM_API_KEY/URL` 后自动切换）
- **知识层**：移植自 `fortune-master-pro-dao-v2` 的 13 套体系框架文档
- **前端**：原生 HTML/CSS/JS 单页（移动端风格）
- **测试**：`node test/run.js` 7/7 通过；4 个 API 端点 + 静态页均已 curl 冒烟验证

## 技术选型
Node.js 内置 `http` 服务（**零额外依赖**，仅 `lunar-javascript` 用于排盘）；前端原生三件套。可直接套微信小程序 WebView 或后续改造为小程序。

## 运行
```bash
npm install && npm test && npm start   # http://localhost:3000
```

## 版本记录
- 本地 git：`main` 分支，MVP 已提交（`feat: 命理测算小程序 MVP...`）
- 远程 GitHub：`https://github.com/qwf554655054-ship-it/fortune-master-miniprogram`（公开，完整历史已推送）

## 后续可扩展（未含在本 MVP）
紫微斗数算法排盘、星盘、数字命理、每日运势推送、微信小程序壳、内容安全审核、商业化与合规类目资质。
