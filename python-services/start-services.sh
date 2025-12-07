#!/bin/bash
set -e

echo "🚀 Starting local Python services for content-manager..."

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."

# Install core dependencies first
echo "  - Installing core dependencies..."
pip install -q --upgrade pip
pip install -q fastapi uvicorn[standard] pydantic python-dotenv slowapi tenacity

# Install blog-writer dependencies manually (skip problematic packages)
echo "  - Installing blog-writer dependencies..."
pip install -q google-generativeai anthropic openai playwright beautifulsoup4 requests lxml

# Install openkeyword
if [ -d "openkeyword" ]; then
    echo "  - Installing openkeyword..."
    pip install -q -e openkeyword
fi

echo "✅ Dependencies installed"
echo ""

# Check for required environment variables
if [ -z "$GEMINI_API_KEY" ]; then
    echo "⚠️  WARNING: GEMINI_API_KEY not set in environment"
    echo "   Set it with: export GEMINI_API_KEY='your-key-here'"
    echo "   Or add to .env.local"
    echo ""
fi

# Start blog-server.py
echo "📝 Starting blog-writer service on port 8001..."
export BLOG_SERVER_PORT=8001
nohup python blog-server.py > blog-server.log 2>&1 &
BLOG_PID=$!
echo "   PID: $BLOG_PID (logs: blog-server.log)"
sleep 2

# Start keyword-server.py
echo "🔑 Starting keyword-generation service on port 8002..."
export KEYWORD_SERVER_PORT=8002
nohup python keyword-server.py > keyword-server.log 2>&1 &
KEYWORD_PID=$!
echo "   PID: $KEYWORD_PID (logs: keyword-server.log)"
sleep 2

# Check if services started successfully
echo ""
if lsof -ti:8001 > /dev/null 2>&1; then
    echo "✅ Blog Writer: http://localhost:8001 (running)"
else
    echo "❌ Blog Writer: Failed to start (check blog-server.log)"
fi

if lsof -ti:8002 > /dev/null 2>&1; then
    echo "✅ Keyword Generation: http://localhost:8002 (running)"
else
    echo "❌ Keyword Generation: Failed to start (check keyword-server.log)"
fi

echo ""
echo "📋 To stop services: ./stop-services.sh"
echo "📊 To view logs:"
echo "   tail -f blog-server.log"
echo "   tail -f keyword-server.log"
