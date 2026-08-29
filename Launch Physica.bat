@echo off
setlocal

title Physica Development Launcher
cd /d "%~dp0"

where pnpm >nul 2>nul
if errorlevel 1 (
  echo Physica could not start because pnpm is not available on PATH.
  echo Install the repository toolchain described in docs\CURRENT_STATE.md, then try again.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Physica dependencies are not installed.
  echo Run pnpm install from this folder, then launch Physica again.
  pause
  exit /b 1
)

echo Starting Physica in live development mode...
echo Keep this window open while using the app. Press Ctrl+C here to stop it.
echo.

call pnpm --filter @physica/desktop tauri dev
set "PHYSICA_EXIT_CODE=%ERRORLEVEL%"

if not "%PHYSICA_EXIT_CODE%"=="0" (
  echo.
  echo Physica stopped with exit code %PHYSICA_EXIT_CODE%.
  pause
)

exit /b %PHYSICA_EXIT_CODE%
