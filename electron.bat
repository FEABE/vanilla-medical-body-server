@echo off
setlocal

cd /d "%~dp0"
if "%VANILLA_ROOT_DIR%"=="" for %%I in ("%~dp0..") do set "VANILLA_ROOT_DIR=%%~fI"
if "%VANILLA_DATA_DIR%"=="" set "VANILLA_DATA_DIR=%VANILLA_ROOT_DIR%\.data"
if "%VANILLA_ELECTRON_SERVICE_NAME%"=="" for %%I in ("%~dp0.") do set "VANILLA_ELECTRON_SERVICE_NAME=%%~nxI"

set ELECTRON_DISABLE_SECURITY_WARNINGS=true

if exist "%VANILLA_ROOT_DIR%\vanilla-binary_window_electron\electron.exe" (
    "%VANILLA_ROOT_DIR%\vanilla-binary_window_electron\electron.exe" "%VANILLA_ROOT_DIR%\vanilla-common\electron.js"
    goto :EOF
)

if exist "%VANILLA_ROOT_DIR%\vanilla-src-nodemodules\node_modules\.bin\electron.cmd" (
    call "%VANILLA_ROOT_DIR%\vanilla-src-nodemodules\node_modules\.bin\electron.cmd" "%VANILLA_ROOT_DIR%\vanilla-common\electron.js"
    goto :EOF
)

if exist "%VANILLA_ROOT_DIR%\vanilla-src-nodemodules\node_modules\.bin\electron" (
    call "%VANILLA_ROOT_DIR%\vanilla-src-nodemodules\node_modules\.bin\electron" "%VANILLA_ROOT_DIR%\vanilla-common\electron.js"
    goto :EOF
)

echo Electron runtime not found.
echo Check vanilla-binary_window_electron\electron.exe or vanilla-src-nodemodules\node_modules.
echo Fallback: node nodejs.js
pause
