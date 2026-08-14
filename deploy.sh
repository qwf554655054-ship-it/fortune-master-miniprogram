#!/usr/bin/env bash
# fortune-master-miniprogram · 一键拉取 + 安装 + 重建静态演示（SSH 免 PAT）
#
# 前置：已配好 SSH（git@github.com:qwf554655054-ship-it/fortune-master-miniprogram.git）
# 用法：
#   ./deploy.sh            # 拉取最新代码 + 安装依赖 + 重建 dist/
# 说明：
#   - git pull --rebase 保持线性历史
#   - npm install 同步 package.json 中的依赖
#   - node tools/build-demo.js 重新生成 dist/（含隐私/协议页、引擎与 shim）
#   - 最后一步「发布到 CloudStudio」需由 WorkBuddy 对话触发 workbuddy_cloudstudio_deploy
#     （脚本运行环境无法调用该部署动作，故发布仍由我在对话中执行）

set -uo pipefail
cd "$(dirname "$0")" || exit 1

BRANCH="$(git branch --show-current)"
echo "📦 当前分支: $BRANCH"

echo "⬇️ 拉取远端最新代码..."
if ! git pull --rebase origin "$BRANCH"; then
  echo "❌ 拉取/变基出现冲突，请手动解决冲突后执行 'git rebase --continue' 再重试"
  exit 1
fi

echo "📥 安装/同步依赖..."
npm install --no-audit --no-fund

echo "🔨 重建静态演示（dist/）..."
node tools/build-demo.js

echo "✅ dist/ 已重建（与最新代码一致）。"
echo "🚀 请在 WorkBuddy 对话中告诉我『重新部署演示』，由我触发 CloudStudio 发布更新。"
