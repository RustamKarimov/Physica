@echo off
setlocal EnableExtensions

title Physica Development Launcher
cd /d "%~dp0"

set "PHYSICA_PNPM="
set "PHYSICA_USE_COREPACK="

if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "PATH=%ProgramFiles(x86)%\nodejs;%PATH%"
if exist "%USERPROFILE%\.cargo\bin\cargo.exe" set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"

for /f "delims=" %%P in ('where pnpm.cmd 2^>nul') do if not defined PHYSICA_PNPM set "PHYSICA_PNPM=%%P"

if not defined PHYSICA_PNPM if exist "%ProgramFiles%\nodejs\corepack.cmd" (
  set "PHYSICA_PNPM=%ProgramFiles%\nodejs\corepack.cmd"
  set "PHYSICA_USE_COREPACK=1"
)

if not defined PHYSICA_PNPM if exist "%ProgramFiles(x86)%\nodejs\corepack.cmd" (
  set "PHYSICA_PNPM=%ProgramFiles(x86)%\nodejs\corepack.cmd"
  set "PHYSICA_USE_COREPACK=1"
)

if not defined PHYSICA_PNPM (
  echo Physica could not find pnpm or Node.js Corepack.
  echo Install Node.js 24 or later, then try again. Corepack will provide the project-pinned pnpm version.
  pause
  exit /b 1
)

where cargo.exe >nul 2>nul
if errorlevel 1 (
  echo Physica could not find the Rust toolchain required by Tauri.
  echo Install Rust with rustup, then try again: https://rustup.rs/
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing Physica workspace dependencies...
  call :run_pnpm install
  if errorlevel 1 (
    echo.
    echo Physica dependency installation failed.
    pause
    exit /b 1
  )
)

if /i "%~1"=="--check" (
  echo Checking the Physica development launcher...
  call :run_pnpm --filter @physica/desktop tauri --version
  if errorlevel 1 exit /b %ERRORLEVEL%
  call cargo.exe --version
  if errorlevel 1 exit /b %ERRORLEVEL%
  call npm.cmd --prefix apps\desktop run build
  exit /b %ERRORLEVEL%
)

netstat.exe -ano -p tcp | findstr.exe /R /C:":1420 .*LISTENING" >nul
if not errorlevel 1 (
  echo Physica is already running, or another program is using development port 1420.
  echo Close the existing Physica launcher window before starting another copy.
  pause
  exit /b 1
)

echo Starting Physica in live development mode...
echo Keep this window open while using the app. Press Ctrl+C here to stop it.
echo.

call :run_pnpm --filter @physica/desktop tauri dev
set "PHYSICA_EXIT_CODE=%ERRORLEVEL%"

if not "%PHYSICA_EXIT_CODE%"=="0" (
  echo.
  echo Physica stopped with exit code %PHYSICA_EXIT_CODE%.
  pause
)

exit /b %PHYSICA_EXIT_CODE%

:run_pnpm
if defined PHYSICA_USE_COREPACK (
  call "%PHYSICA_PNPM%" pnpm %*
) else (
  call "%PHYSICA_PNPM%" %*
)
exit /b %ERRORLEVEL%
