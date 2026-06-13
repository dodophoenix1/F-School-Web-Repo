@echo off
title School Website Template Server
echo ===================================================
echo   School Website Template - Bootstrapping Server
echo ===================================================
echo.

:: Check if node_modules exists, if not run npm install
if not exist node_modules (
    echo [INFO] node_modules not found. Installing dependencies...
    call npm install
) else (
    echo [INFO] Dependencies already installed.
)

echo.
echo [INFO] Starting Express Server...
echo.

:: Open default browser in a separate window after a short delay
start /b cmd /c "timeout /t 2 >nul && start http://localhost:3000"

:: Start the node server
call npm start

pause
