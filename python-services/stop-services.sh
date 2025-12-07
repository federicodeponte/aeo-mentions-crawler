#!/bin/bash

# Stop Python services

echo "🛑 Stopping Python services..."

if [ -f ".blog-server.pid" ]; then
    BLOG_PID=$(cat .blog-server.pid)
    kill $BLOG_PID 2>/dev/null && echo "   Stopped Blog Writer (PID: $BLOG_PID)"
    rm .blog-server.pid
fi

if [ -f ".keyword-server.pid" ]; then
    KEYWORD_PID=$(cat .keyword-server.pid)
    kill $KEYWORD_PID 2>/dev/null && echo "   Stopped Keyword Generator (PID: $KEYWORD_PID)"
    rm .keyword-server.pid
fi

# Fallback: kill by port
lsof -ti:8001 | xargs kill -9 2>/dev/null
lsof -ti:8002 | xargs kill -9 2>/dev/null

echo "✅ Services stopped"

