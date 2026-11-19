@echo off
title ClipSlice
echo ========================================================
echo   Starting ClipSlice Full-Stack Application...
echo ========================================================

:: Navigate to backend
cd /d "%~dp0clipslice\backend"

:: Open browser after 2 seconds in the background
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:5000"

:: Start the server
node dist/server.js

pause
