@echo off
setlocal
cd /d "%~dp0"

set ELECTRON_DISABLE_SECURITY_WARNINGS=true

if exist "..\vanilla-binary_window_electron\electron.exe" (
    "..\vanilla-binary_window_electron\electron.exe" "..\vanilla-common\electron.js"
    goto :EOF
)

if exist "..\vanilla-src-nodemodules\node_modules\.bin\electron.cmd" (
    call "..\vanilla-src-nodemodules\node_modules\.bin\electron.cmd" "..\vanilla-common\electron.js"
    goto :EOF
)

if exist "..\vanilla-src-nodemodules\node_modules\.bin\electron" (
    call "..\vanilla-src-nodemodules\node_modules\.bin\electron" "..\vanilla-common\electron.js"
    goto :EOF
)

echo Electron을 찾을 수 없습니다.
echo vanilla-binary_window_electron\electron.exe 또는 vanilla-src-nodemodules\node_modules를 확인해주세요.
echo Node.js로 실행하려면: node nodejs.js
pause
