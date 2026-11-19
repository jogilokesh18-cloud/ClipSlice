@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

set "GIT_EXE=C:\Users\jogil\AppData\Local\Microsoft\WinGet\Packages\Git.MinGit_Microsoft.Winget.Source_8wekyb3d8bbwe\cmd\git.exe"
if not exist "%GIT_EXE%" (
    where git.exe >nul 2>&1
    if !errorlevel! equ 0 (
        set "GIT_EXE=git"
    )
)

set "GH_EXE=C:\Program Files\GitHub CLI\gh.exe"
if not exist "%GH_EXE%" (
    where gh.exe >nul 2>&1
    if !errorlevel! equ 0 (
        set "GH_EXE=gh"
    )
)

echo ============================================================
echo   ClipSlice - Push to GitHub
echo ============================================================
echo.

"%GH_EXE%" auth status >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo GitHub login is required.
    echo Launching web browser for GitHub authorization...
    echo.
    "%GH_EXE%" auth login -h github.com -p https -w -s repo
)

echo.
echo Setting up Git credentials...
"%GH_EXE%" auth setup-git

echo.
echo Pushing code to https://github.com/jogilokesh18-cloud/ClipSlice ...
"%GIT_EXE%" push -u origin main --force

if %ERRORLEVEL% equ 0 (
    echo.
    echo ============================================================
    echo   [SUCCESS] Code pushed to GitHub!
    echo   Now return to Render and click "Manual Deploy" -> "Clear build cache & deploy"
    echo ============================================================
) else (
    echo.
    echo [NOTICE] If browser login was requested, please finish authorizing in your browser, then run this file again.
)

echo.
pause
