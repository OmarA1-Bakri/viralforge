#!/bin/bash

# ViralForge Services Shutdown Script

echo "🛑 Stopping ViralForge Services..."
echo ""

# Stop crew-social-tools
echo "📋 Stopping Crew Social Tools..."
pkill -f 'uvicorn.*8002' && echo "   ✅ Crew Social Tools stopped" || echo "   ⚠️  Crew Social Tools not running"

# Stop main app
echo "📋 Stopping Main App..."
pkill -f 'tsx.*server/index' && echo "   ✅ Main App stopped" || echo "   ⚠️  Main App not running"

# Clean up any processes still on ports
lsof -ti:5000 | xargs kill -9 2>/dev/null || true
lsof -ti:8002 | xargs kill -9 2>/dev/null || true

echo ""
echo "✨ All services stopped!"
