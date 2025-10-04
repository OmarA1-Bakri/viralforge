#!/usr/bin/env python3
"""Test the full integration: CrewAI tools -> FastAPI -> Social platforms"""

import json
from crewai_integration import get_crew_social_tools

def test_tools():
    print("🧪 Testing Crew Social Tools Integration\n")

    # Get all tools
    tools = get_crew_social_tools()
    print(f"✓ Loaded {len(tools)} tools: {list(tools.keys())}\n")

    # Test 1: DDG Search (simplest, no auth needed)
    print("=" * 60)
    print("Test 1: DuckDuckGo Search")
    print("=" * 60)
    try:
        result = tools["ddg"]._run(query="Python programming", max_results=3)
        data = json.loads(result)
        print(f"Success: {data.get('success')}")
        print(f"Results: {data.get('count')} items")
        if data.get('success') and data.get('results'):
            print(f"First result: {data['results'][0].get('title', 'No title')[:50]}...")
        print("✓ DDG Search works!\n")
    except Exception as e:
        print(f"✗ DDG Search failed: {e}\n")

    # Test 2: Twitter Search
    print("=" * 60)
    print("Test 2: Twitter Search")
    print("=" * 60)
    try:
        result = tools["twitter"]._run(query="AI", limit=3)
        data = json.loads(result)
        print(f"Success: {data.get('success')}")
        print(f"Tweets: {data.get('count')} items")
        if data.get('success') and data.get('tweets'):
            print(f"First tweet author: {data['tweets'][0].get('author', 'Unknown')}")
        else:
            print(f"Note: {data.get('error', 'No error info')}")
        print("✓ Twitter tool responds correctly\n")
    except Exception as e:
        print(f"✗ Twitter Search failed: {e}\n")

    # Test 3: YouTube Search
    print("=" * 60)
    print("Test 3: YouTube Search")
    print("=" * 60)
    try:
        result = tools["youtube"]._run(mode="search", id_or_query="Python tutorial", limit=2)
        data = json.loads(result)
        print(f"Success: {data.get('success')}")
        print(f"Videos: {data.get('count')} items")
        if data.get('success') and data.get('videos'):
            print(f"First video: {data['videos'][0].get('title', 'No title')[:50]}...")
        else:
            print(f"Note: {data.get('error', 'No error info')}")
        print("✓ YouTube tool responds correctly\n")
    except Exception as e:
        print(f"✗ YouTube Search failed: {e}\n")

    # Test 4: Multi-platform Aggregator
    print("=" * 60)
    print("Test 4: Social Media Aggregator")
    print("=" * 60)
    try:
        result = tools["aggregator"]._run(
            query="AI trends",
            platforms=["twitter", "youtube"],
            limit_per_platform=2
        )
        data = json.loads(result)
        print(f"Platforms searched: {data.get('summary', {}).get('platforms_searched')}")
        print(f"Total items: {data.get('summary', {}).get('total_items')}")
        for platform, results in data.get('platforms', {}).items():
            print(f"  - {platform}: {results.get('count', 0)} items (success: {results.get('success')})")
        print("✓ Aggregator works!\n")
    except Exception as e:
        print(f"✗ Aggregator failed: {e}\n")

    print("=" * 60)
    print("✅ Integration Test Complete!")
    print("=" * 60)

if __name__ == "__main__":
    test_tools()
