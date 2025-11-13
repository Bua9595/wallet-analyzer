@echo off
setlocal
cd /d "%~dp0"
echo Starting Vite dev server on http://localhost:5173 ...
node node_modules\vite\bin\vite.js --host
pause

