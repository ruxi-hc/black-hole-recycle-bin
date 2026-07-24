@echo off
setlocal EnableExtensions DisableDelayedExpansion

set "ARCHIVE=%~dp0BlackHole-RecycleBin.zip"
set "APP_VERSION=1.0.0"
set "APP_ROOT=%LOCALAPPDATA%\BlackHoleRecycleBin\%APP_VERSION%"
set "APP_EXE=%APP_ROOT%\Black Hole Recycle Bin.exe"
set "READY_FILE=%APP_ROOT%\.ready"

if not exist "%ARCHIVE%" exit /b 1

if not exist "%READY_FILE%" (
  if not exist "%APP_ROOT%" mkdir "%APP_ROOT%"
  "%SystemRoot%\System32\tar.exe" -xf "%ARCHIVE%" -C "%APP_ROOT%"
  if errorlevel 1 exit /b 1
  >"%READY_FILE%" echo ready
)

start "" "%APP_EXE%"
endlocal
exit /b 0
