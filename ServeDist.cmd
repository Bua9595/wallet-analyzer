@echo off
setlocal
cd /d "%~dp0"

echo Building project...
node node_modules\vite\bin\vite.js build || goto :end

echo Serving dist on http://localhost:8080 ...
node serve-dist.mjs

:end
pause
