#!/usr/bin/env bash
# fortune-master-miniprogram · 一键拉取并重建静态演示（SSH 免 PAT）
#
# 前置：已配好 SSH（git@github.com:qwf554655054-ship-it/fortune-master-miniprogram.git）
# 用法：
#   ./update.sh            # 拉取最新代码 + 安装依赖 + 重建 dist/
# 说明：
#   - git pull --rebase 保持线性历史
#   - npm install 同步 package.json 中的依赖
#   - node tools/build-demo.js 重新生成 dist/（含隐私/协议页、引擎与 shim）

set -uo pipefail
cd "$(dirname "$0")" || exit 1

# ===== 输出路径重定向：禁止写入 C 盘 AppData / Temp =====
# 通过 wb-paths.js 注入 npm 缓存 / 日志 / 临时目录环境变量（落到项目本地或 WB_OUTPUT_ROOT 指定盘）
eval "$("${NODE:-node}" "$(dirname "$0")/tools/wb-paths.js" env)"
# 任务级临时目录（脚本退出时自动清理）；Windows 下 $TEMP 含盘符冒号，用 mktemp 创建
RUN_TEMP="$(mktemp -d -p "$TEMP" fortune-task-XXXXXX 2>/dev/null || echo "$TEMP/run-$$")"
mkdir -p "$RUN_TEMP"
export TEMP="$RUN_TEMP" TMP="$RUN_TEMP"
[ -n "${TMPDIR:-}" ] && export TMPDIR="$RUN_TEMP"
cleanup() { rm -rf "$RUN_TEMP" 2>/dev/null; }
trap cleanup EXIT

BRANCH="$(git branch --show-current)"
echo "📦 当前分支: $BRANCH"

echo "⬇️ 拉取远端最新代码..."
if ! git pull --rebase origin "$BRANCH"; then
  echo "❌ 拉取/变基出现冲突，请手动解决冲突后执行 'git rebase --continue' 再重试"
  exit 1
fi

echo "📥 安装/同步依赖..."
npm install --no-audit --no-fund --cache "$npm_config_cache"

echo "🔨 重建静态演示（dist/）..."
node tools/build-demo.js

echo "✅ 已拉取并重建 dist/。如需更新线上演示，请用 CloudStudio 重新发布 dist/ 目录。"
