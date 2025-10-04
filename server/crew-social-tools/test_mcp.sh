#!/bin/bash
# Test script for Crew Social Tools MCP Server

set -e

echo "=== Crew Social Tools MCP Server Test ==="
echo ""

# Check if FastAPI backend is running
echo "1. Checking FastAPI backend..."
if curl -s http://localhost:8001/health > /dev/null 2>&1; then
    echo "✓ FastAPI backend is running on port 8001"
else
    echo "✗ FastAPI backend is NOT running"
    echo ""
    echo "Starting FastAPI backend..."
    cd "$(dirname "$0")"

    # Check if we should use Docker or local
    if command -v docker &> /dev/null; then
        echo "Using Docker..."
        docker compose up -d
        sleep 3

        if curl -s http://localhost:8001/health > /dev/null 2>&1; then
            echo "✓ FastAPI backend started successfully"
        else
            echo "✗ Failed to start FastAPI backend with Docker"
            echo "Trying local uvicorn..."
            uvicorn app.main:app --port 8001 &
            UVICORN_PID=$!
            sleep 2
        fi
    else
        echo "Docker not found, using local uvicorn..."
        uvicorn app.main:app --port 8001 &
        UVICORN_PID=$!
        sleep 2

        if curl -s http://localhost:8001/health > /dev/null 2>&1; then
            echo "✓ FastAPI backend started successfully (PID: $UVICORN_PID)"
        else
            echo "✗ Failed to start FastAPI backend"
            exit 1
        fi
    fi
fi

echo ""
echo "2. Testing MCP server installation..."
if python -c "import mcp" 2>/dev/null; then
    echo "✓ MCP package is installed"
else
    echo "✗ MCP package not found"
    echo "Installing..."
    pip install -e .
fi

echo ""
echo "3. Checking MCP server file..."
if [ -f "mcp_server.py" ]; then
    echo "✓ mcp_server.py exists"
else
    echo "✗ mcp_server.py not found"
    exit 1
fi

echo ""
echo "4. Configuration example for Claude Desktop:"
echo ""
echo "Add this to ~/Library/Application Support/Claude/claude_desktop_config.json (macOS)"
echo "or ~/.config/claude/claude_desktop_config.json (Linux):"
echo ""
cat << 'EOF'
{
  "mcpServers": {
    "crew-social-tools": {
      "command": "python",
      "args": [
        "-m",
        "mcp_server"
      ],
      "cwd": "/home/omar/viralforge/server/crew-social-tools",
      "env": {
        "CREW_TOOLS_URL": "http://localhost:8001"
      }
    }
  }
}
EOF

echo ""
echo "5. Configuration example for Claude Code:"
echo ""
echo "Add this to ~/.config/claude-code/mcp_config.json:"
echo ""
cat << 'EOF'
{
  "mcpServers": {
    "crew-social-tools": {
      "command": "python",
      "args": ["/home/omar/viralforge/server/crew-social-tools/mcp_server.py"],
      "env": {
        "CREW_TOOLS_URL": "http://localhost:8001"
      }
    }
  }
}
EOF

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Add the configuration to your Claude Desktop or Claude Code config"
echo "2. Restart Claude Desktop or Claude Code"
echo "3. The tools should appear in Claude's tool list"
echo ""
echo "Available tools:"
echo "  - twitter_search"
echo "  - youtube_search"
echo "  - reddit_scan"
echo "  - instagram_fetch"
echo "  - tiktok_search"
echo "  - ddg_search"
echo "  - searxng_search"
echo ""
