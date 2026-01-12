@echo off
echo ==========================================
echo   Sky Miles Travels - Development Server
echo ==========================================
echo.

if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
    echo.
)

echo Starting development server...
echo Server will start at: http://localhost:3000
echo.
echo Press Ctrl+C to stop
echo ==========================================
echo.

set GENERATE_SOURCEMAP=false
npm start
