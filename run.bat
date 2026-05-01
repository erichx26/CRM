@echo off
cd /d "%~dp0"
title New Chapter CRM

:: Kill any process using port 3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo Starting CRM dev server...
start "NextJS Dev" cmd /k "npm run dev"

:: Wait for server to start
timeout /t 8 /nobreak >nul

:: Open browser
start http://localhost:3000

echo Done! Keep the NextJS Dev window open.
pause