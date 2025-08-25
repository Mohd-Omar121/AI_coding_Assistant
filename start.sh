#!/bin/bash

echo "🚀 Starting AI Virtual Assistant..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+ first."
    exit 1
fi

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is not installed. Please install pip first."
    exit 1
fi

# Check if virtual environment exists, create if not
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install/upgrade dependencies
echo "📥 Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Check if OpenAI API key is set
if [ -z "$OPENAI_API_KEY" ]; then
    echo "⚠️  Warning: OPENAI_API_KEY environment variable is not set."
    echo "   Please set it with: export OPENAI_API_KEY='your-api-key-here'"
    echo "   Or create a .env file with your API key."
    echo ""
fi

# Create uploads directory if it doesn't exist
mkdir -p uploads

# Start the backend server
echo "🌐 Starting FastAPI backend server..."
echo "   Backend will be available at: http://localhost:8000"
echo "   API docs will be available at: http://localhost:8000/docs"
echo ""
echo "📱 To use the frontend:"
echo "   1. Open index.html in your browser, or"
echo "   2. Run: python -m http.server 5500"
echo "   3. Visit: http://localhost:5500"
echo ""
echo "🛑 Press Ctrl+C to stop the server"
echo ""

# Start the server
python main.py 