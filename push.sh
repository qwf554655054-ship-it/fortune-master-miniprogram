#!/usr/bin/env bash
# fortune-master-miniprogram · 一键推送（SSH 免 PAT）
#
# 前置条件：已按 README 配好 SSH 密钥，远程为
#   git@github.com:qwf554655054-ship-it/fortune-master-miniprogram.git
# （无需任何 GitHub PAT / token）
#
# 用法：
#   ./push.sh "本次提交说明"      # 暂存全部改动并提交后推送
#   ./push.sh                    # 不新增提交，仅推送已有提交
#
# 说明：
#   - git add -A 受 .gitignore 约束，不会包含 node_modules / dist / data 等
#   - 若本地落后远端，会自动 rebase（冲突时需手动解决后重试）

set -uo pipefail
cd "$(dirname "$0")" || exit 1

BRANCH="$(git branch --show-current)"
echo "📦 当前分支: $BRANCH"

# 1) 取回远端，保持同步
if git fetch origin "$BRANCH" 2>/dev/null; then
  echo "🔄 已同步远端"
else
  echo "⚠️ 无法连接远端（可能离线），将继续尝试直接推送"
fi

# 2) 若有提交说明参数，先提交未暂存的改动
if [ $# -ge 1 ]; then
  git add -A
  if git diff --cached --quiet; then
    echo "ℹ️ 没有检测到需要提交的改动，跳过提交"
  else
    git commit -m "$1" && echo "✅ 已提交: $1"
  fi
else
  echo "ℹ️ 未提供提交说明，仅推送已有提交"
fi

# 3) 若本地落后远端，先 rebase（自动 stash 未提交改动）
BEHIND=$(git rev-list --count "HEAD..origin/$BRANCH" 2>/dev/null || echo 0)
if [ "$BEHIND" -gt 0 ]; then
  echo "⬇️ 本地落后远端 $BEHIND 个提交，执行 rebase..."
  if ! git pull --rebase --autostash origin "$BRANCH"; then
    echo "❌ rebase 出现冲突，请手动解决冲突后执行 'git rebase --continue' 再重试"
    exit 1
  fi
fi

# 4) 通过 SSH 推送（无需 PAT）
if git push -u origin "$BRANCH"; then
  echo "🚀 已通过 SSH 推送至 origin/$BRANCH（无需 PAT）"
else
  echo "❌ 推送失败，请检查网络或远端权限"
  exit 1
fi
