@echo off
echo Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo Error installing dependencies.
    pause
    exit /b %errorlevel%
)

echo Starting Method Route Overlay...
call npm start
if %errorlevel% neq 0 (
    echo Application exited with error.
    pause
    exit /b %errorlevel%
)
