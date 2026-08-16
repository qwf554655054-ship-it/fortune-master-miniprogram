#!/usr/bin/env bash
# fortune-master-miniprogram · 清理本地输出目录（缓存 / 日志 / 临时文件）
#
# 默认清理项目本地 .wb-output/；若设置了 WB_OUTPUT_ROOT 则清理该路径。
# 说明：本命令会删除缓存与日志，下次 npm install / 运行会重新生成。
set -uo pipefail
cd "$(dirname "$0")" || exit 1

TARGET="${WB_OUTPUT_ROOT:-$PWD/.wb-output}"
if [ -d "$TARGET" ]; then
  rm -rf "$TARGET"
  echo "🧹 已清理: $TARGET（缓存 / 日志 / 临时文件全部删除）"
else
  echo "ℹ️ 没有需要清理的目录: $TARGET"
fi
