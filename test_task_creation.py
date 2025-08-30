#!/usr/bin/env python3

import asyncio
import httpx
import json
from dotenv import load_dotenv

load_dotenv()

async def test_task_creation():
    """Test AI-powered task creation with natural language"""
    
    test_cases = [
        {
            "input": "need to meet habeeb tomorrow by 10am",
            "description": "Should create a task with proper timing"
        },
        {
            "input": "remind me to call mom at 5pm next week",
            "description": "Should create a task or reminder"
        },
        {
            "input": "buy groceries milk, bread, and eggs today",
            "description": "Should create grocery items"
        },
        {
            "input": "schedule a gym session for 7pm tonight",
            "description": "Should create a commitment"
        }
    ]
    
    print("🧪 Testing AI Task Creation...")
    print("=" * 60)
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n{i}. Testing: '{test_case['input']}'")
        print(f"   Expected: {test_case['description']}")
        print("-" * 40)
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "http://localhost:8000/api/agent",
                    json={
                        "userInput": test_case["input"],
                        "userId": "8b06164c-5acf-4adf-9f84-f5a9ea48bf98"
                    },
                    timeout=30.0
                )
                
                print(f"   Status: {response.status_code}")
                
                if response.status_code == 200:
                    result = response.json()
                    print(f"   ✅ Success!")
                    print(f"   Type: {result.get('type', 'unknown')}")
                    if result.get('item'):
                        item = result['item']
                        title = item.get('title') or item.get('item_name') or 'Unknown'
                        print(f"   Created: {title}")
                    print(f"   Message: {result.get('message', 'No message')}")
                else:
                    print(f"   ❌ Failed: {response.status_code}")
                    print(f"   Error: {response.text}")
                    
        except Exception as e:
            print(f"   ❌ Exception: {e}")
        
        print()

if __name__ == "__main__":
    asyncio.run(test_task_creation())
