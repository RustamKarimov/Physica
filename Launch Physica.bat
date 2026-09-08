@echo off
setlocal
cd /d "%~dp0"
where dotnet >nul 2>nul
if errorlevel 1 (
  echo Physica Studio requires the .NET 10 SDK.
  echo Run scripts\bootstrap.ps1 from PowerShell, then try again.
  pause
  exit /b 1
)
%SystemRoot%\System32\tasklist.exe /FI "IMAGENAME eq PhysicaStudio.Desktop.exe" /NH 2>nul | %SystemRoot%\System32\find.exe /I "PhysicaStudio.Desktop.exe" >nul
if not errorlevel 1 (
  echo Physica Studio is already running.
  echo Use the existing window, or exit it before starting a new development instance.
  exit /b 0
)

echo Starting Physica Studio in development mode...
dotnet run --project src\PhysicaStudio.Desktop\PhysicaStudio.Desktop.csproj
set "PHYSICA_EXIT=%ERRORLEVEL%"
if not "%PHYSICA_EXIT%"=="0" (
  echo.
  echo Physica Studio stopped with exit code %PHYSICA_EXIT%.
  pause
)
exit /b %PHYSICA_EXIT%

