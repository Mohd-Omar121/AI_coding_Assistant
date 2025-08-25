@echo off
chcp 65001 >nul
echo 🚀 Starting AI Virtual Assistant...

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed. Please install Python 3.8+ first.
    pause
    exit /b 1
)

REM Check if pip is installed
pip --version >nul 2>&1
if errorlevel 1 (
    echo ❌ pip is not installed. Please install pip first.
    pause
    exit /b 1
)

REM Check if virtual environment exists, create if not
if not exist "venv" (
    echo 📦 Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo 🔧 Activating virtual environment...
call venv\Scripts\activate.bat

REM Install/upgrade dependencies
echo 📥 Installing dependencies...
python -m pip install --upgrade pip
pip install -r requirements.txt

REM Check if OpenAI API key is set
if "%OPENAI_API_KEY%"=="" (
    echo ⚠️  Warning: OPENAI_API_KEY environment variable is not set.
    echo    Please set it with: set OPENAI_API_KEY=your-api-key-here
    echo    Or create a .env file with your API key.
    echo.
)

REM Create uploads directory if it doesn't exist
if not exist "uploads" mkdir uploads

REM Start the backend server
echo 🌐 Starting FastAPI backend server...
echo    Backend will be available at: http://localhost:8000
echo    API docs will be available at: http://localhost:8000/docs
echo.
echo 📱 To use the frontend:
echo    1. Open index.html in your browser, or
echo    2. Run: python -m http.server 5500
echo    3. Visit: http://localhost:5500
echo.
echo 🛑 Press Ctrl+C to stop the server
echo.

REM Start the server
python main.py

pause 