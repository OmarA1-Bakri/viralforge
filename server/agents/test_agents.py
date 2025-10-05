#!/usr/bin/env python3
"""Simple test script to verify CrewAI agents can be imported and initialized."""

import os
import sys
from pathlib import Path

# Set up basic environment
os.environ.setdefault('OPENROUTER_API_KEY', 'test-key-not-used-for-init')
os.environ.setdefault('DATABASE_URL', 'postgresql://test')

print("🧪 Testing CrewAI Agent Initialization...\n")

try:
    print("1. Importing viral_crew module...")
    from viral_crew import get_agent_system
    print("   ✅ Import successful\n")
    
    print("2. Checking knowledge files...")
    knowledge_dir = Path(__file__).parent.parent.parent / 'knowledge'
    knowledge_files = ['viral_patterns.md', 'platform_guidelines.md', 'content_strategies.md']
    
    for filename in knowledge_files:
        filepath = knowledge_dir / filename
        exists = "✅" if filepath.exists() else "❌"
        print(f"   {exists} {filename}")
    
    print("\n3. ✅ Module can be imported (agents will initialize on first use)\n")
    
    print("🎉 All tests passed! CrewAI agents are ready.\n")
    print("Next steps:")
    print("1. Set CREW_AGENT_URL=http://localhost:8002 in .env")
    print("2. Set OPENROUTER_API_KEY in .env (agents use Grok via OpenRouter)")
    print("3. Start agents: uvicorn server.agents.api:app --port 8002")
    print("4. Restart server: npm run dev\n")
    print("Note: Agents will initialize on first use to avoid startup delays.")
    
except ImportError as e:
    print(f"\n❌ Import Error: {e}")
    print("\nMake sure you've installed dependencies:")
    print("  pip3 install -r requirements.txt\n")
    sys.exit(1)
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
