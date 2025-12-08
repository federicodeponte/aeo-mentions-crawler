#!/bin/bash
# Start the streaming server for keyword generation

cd "$(dirname "$0")"

echo "🚀 Starting Keyword Streaming Server..."
echo "=========================================="

# Check if port 8001 is in use
if lsof -ti:8001 > /dev/null 2>&1; then
  echo "⚠️  Port 8001 is already in use. Killing existing process..."
  kill $(lsof -ti:8001) 2>/dev/null
  sleep 2
fi

# Start the server
python3 python-services/streaming-server.py 8001 > /tmp/streaming-server.log 2>&1 &
SERVER_PID=$!

sleep 3

# Check if server started successfully
if lsof -ti:8001 > /dev/null 2>&1; then
  echo "✅ Streaming server started successfully!"
  echo "   PID: $SERVER_PID"
  echo "   Port: 8001"
  echo "   Endpoint: POST http://localhost:8001/generate"
  echo ""
  echo "📝 Logs: tail -f /tmp/streaming-server.log"
  echo "🛑 Stop: kill $SERVER_PID"
  echo ""
  echo "Ready for keyword generation with streaming progress! 🎉"
else
  echo "❌ Failed to start server. Check logs:"
  echo "   tail /tmp/streaming-server.log"
  exit 1
fi

