@echo off
setlocal
cd /d "%~dp0"

echo Building project...
node node_modules\vite\bin\vite.js build || goto :end

echo Launching preview server on http://localhost:4173 ...
node node_modules\vite\bin\vite.js preview --host --strictPort

:end
pause
