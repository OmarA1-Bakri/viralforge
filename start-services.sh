#!/bin/bash

# ViralForge Services Startup Script
# Easily restart all services

echo "🚀 Starting ViralForge Services..."
echo ""

# Kill any existing processes on ports 5000 and 8002
echo "📋 Cleaning up existing processes..."
lsof -ti:5000 | xargs kill -9 2>/dev/null || true
lsof -ti:8002 | xargs kill -9 2>/dev/null || true
sleep 2

# Start crew-social-tools in background
echo "🤖 Starting Crew Social Tools (port 8002)..."
cd /home/omar/viralforge/server/crew-social-tools
nohup python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload > /tmp/crew-social-tools.log 2>&1 &
CREW_PID=$!
echo "   ✅ Crew Social Tools started (PID: $CREW_PID)"
sleep 3

# Start main app in background
echo "🌐 Starting Main App (port 5000)..."
cd /home/omar/viralforge
nohup npm run dev > /tmp/viralforge.log 2>&1 &
APP_PID=$!
echo "   ✅ Main App started (PID: $APP_PID)"
sleep 5

# Check if services are running
echo ""
echo "🔍 Checking service status..."
if lsof -ti:8002 > /dev/null; then
    echo "   ✅ Crew Social Tools: Running on http://localhost:8002"
else
    echo "   ❌ Crew Social Tools: Failed to start"
fi

if lsof -ti:5000 > /dev/null; then
    echo "   ✅ Main App: Running on http://localhost:5000"
else
    echo "   ❌ Main App: Failed to start"
fi

echo ""
echo "📝 Logs:"
echo "   - Crew Social Tools: tail -f /tmp/crew-social-tools.log"
echo "   - Main App: tail -f /tmp/viralforge.log"
echo ""
echo "🛑 To stop services: pkill -f 'uvicorn' && pkill -f 'tsx'"
echo ""
echo "✨ All services started!"
