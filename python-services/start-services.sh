#!/bin/bash

# Start Python services for content-manager
# Runs blog-writer and keyword-generator locally

echo "🚀 Starting Python services..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "📦 Installing blog-writer dependencies..."
cd blog-writer && pip install -r requirements.txt -q && cd ..

echo "📦 Installing openkeyword dependencies..."
cd openkeyword && pip install -r requirements.txt -q && cd ..

# Start servers in background
echo "🔧 Starting Blog Writer Server (port 8001)..."
python blog-server.py > blog-server.log 2>&1 &
BLOG_PID=$!

echo "🔧 Starting Keyword Generator Server (port 8002)..."
python keyword-server.py > keyword-server.log 2>&1 &
KEYWORD_PID=$!

# Save PIDs
echo $BLOG_PID > .blog-server.pid
echo $KEYWORD_PID > .keyword-server.pid

echo "✅ Services started!"
echo "   Blog Writer:    http://localhost:8001"
echo "   Keywords:       http://localhost:8002"
echo ""
echo "   Logs:"
echo "   - blog-server.log"
echo "   - keyword-server.log"
echo ""
echo "   To stop: ./stop-services.sh"

