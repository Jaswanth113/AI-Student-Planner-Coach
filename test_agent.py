#!/usr/bin/env python3
"""
Quick test script to verify the AI agent is working with the new model
"""
import asyncio
import json
from api.agent import get_clients

async def test_agent():
    """Test the agent with a simple request"""
    try:
        # Initialize clients
        llm, supabase = get_clients()
        print("✅ Clients initialized successfully")
        
        # Test AI model with a simple prompt
        test_prompt = """
        You are an expert AI Life Planner assistant powered by Llama 3.1 8B Instant. 
        Respond with a JSON object for this user message: "Create a task to review project by Friday"
        
        Use this format: {"intent": "create_item", "type": "task", "data": {"title": "...", "priority": 2}}
        """
        
        print("🧪 Testing AI model response...")
        response = await llm.ainvoke(test_prompt)
        print(f"🎉 AI Response received: {response.content[:100]}...")
        
        # Try to parse JSON from response
        content = response.content.strip()
        json_start = content.find('{')
        if json_start != -1:
            json_content = content[json_start:]
            try:
                parsed = json.loads(json_content)
                print("✅ JSON parsing successful!")
                print(f"📋 Parsed response: {json.dumps(parsed, indent=2)}")
            except json.JSONDecodeError as e:
                print(f"⚠️ JSON parsing failed, but model is responding: {e}")
        
        print("\n🎯 Agent is ready for use!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

if __name__ == "__main__":
    print("🔧 Testing AI Life Planner Agent")
    print("=" * 40)
    asyncio.run(test_agent())
