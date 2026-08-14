@echo off
REM fortune-master-miniprogram · 一键拉取并构建（Windows 双击版）
cd /d "%~dp0"
where bash >nul 2>nul
if errorlevel 1 (
  echo [错误] 未找到 bash，请先安装 Git for Windows 并在 PATH 中包含 bash。
  echo 或从 Git Bash 终端直接运行:  bash update.sh
  pause
  exit /b 1
)
bash update.sh %*
