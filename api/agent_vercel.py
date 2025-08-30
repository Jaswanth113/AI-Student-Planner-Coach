# api/agent_vercel.py (Vercel-compatible Python function)

import os
import json
import asyncio
import httpx
from typing import Dict, Any
from supabase import create_client
from langchain_groq import ChatGroq
import pendulum
from dotenv import load_dotenv

# --- Initialize clients globally for efficiency ---
_llm = None
_supabase = None

def get_clients():
    global _llm, _supabase
    
    if _llm is None or _supabase is None:
        load_dotenv()
        
        groq_api_key = os.getenv("GROQ_API_KEY")
        supabase_url = os.getenv("VITE_SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        if not all([groq_api_key, supabase_url, supabase_key]):
            raise Exception("Missing required environment variables")

        _llm = ChatGroq(api_key=groq_api_key, model="llama-3.1-8b-instant", temperature=0.2)
        _supabase = create_client(supabase_url, supabase_key)
    
    return _llm, _supabase

async def handle_create_item(supabase, parsed_response: Dict[str, Any], user_id: str):
    """Handle creation of tasks, groceries, or expenses"""
    item_type = parsed_response.get('type')
    item_data = parsed_response.get("data", {})
    item_data["user_id"] = user_id
    
    # Determine target table
    table_name = f"{item_type}s"
    
    # Handle date conversion for tasks using Pendulum
    if item_type == 'task' and item_data.get('due_absolute_iso'):
        try:
            local_dt = pendulum.parse(item_data['due_absolute_iso'], tz='Asia/Kolkata')
            item_data['due_date_utc'] = local_dt.in_timezone('UTC').to_iso8601_string()
            item_data['due_date_local'] = local_dt.to_iso8601_string()
            item_data['timezone'] = 'Asia/Kolkata'
            item_data['due_date'] = local_dt.in_timezone('UTC').to_iso8601_string()
            del item_data['due_absolute_iso']
        except Exception as e:
            if 'due_absolute_iso' in item_data:
                del item_data['due_absolute_iso']

    # Insert into database
    insert_res = supabase.from_(table_name).insert(item_data).execute()
    
    if not insert_res.data:
        raise Exception("Database insert failed")
    
    created_item = insert_res.data[0]
    
    return {
        "type": "creation_success", 
        "item": created_item,
        "message": f"Successfully created {item_type}: {created_item.get('title') or created_item.get('item_name')}"
    }

def handler(request):
    """Vercel function handler"""
    try:
        # Parse request
        if request.method != 'POST':
            return {
                'statusCode': 405,
                'body': json.dumps({"error": "Method not allowed"})
            }
        
        body = json.loads(request.body) if hasattr(request, 'body') else json.loads(request.get_body())
        user_input = body.get("userInput")
        user_id = body.get("userId")

        if not user_input or not user_id:
            return {
                'statusCode': 400,
                'body': json.dumps({"error": "Missing userInput or userId"})
            }

        # Initialize clients
        llm, supabase = get_clients()

        # Get user context
        try:
            profile_res = supabase.from_('users').select('*').eq('id', user_id).single().execute()
            tasks_res = supabase.from_('tasks').select('title, due_date_utc, status').eq('user_id', user_id).limit(5).execute()
            profile_data = profile_res.data if profile_res.data else {}
            tasks_data = tasks_res.data if tasks_res.data else []
        except:
            profile_data = {}
            tasks_data = []
        
        # Get current date
        now_ist = pendulum.now('Asia/Kolkata')
        today_in_ist = now_ist.format('dddd, MMMM D, YYYY')

        # AI prompt
        system_prompt = f"""
You are an expert AI Life Planner assistant powered by Llama 3.1 8B Instant. Analyze the user's message and respond with a valid JSON object.

Context:
- Today's Date: {today_in_ist}
- User's Profile: {json.dumps(profile_data)}
- User's Recent Tasks: {json.dumps(tasks_data)}

User message: "{user_input}"

Respond with ONE of these JSON formats:

1. Task: {{"intent": "create_item", "type": "task", "data": {{"title": "...", "priority": 1-3, "estimate": 30}}}}
2. Grocery: {{"intent": "create_item", "type": "grocery", "data": {{"item_name": "...", "quantity": "1"}}}}
3. Expense: {{"intent": "create_item", "type": "expense", "data": {{"category": "...", "amount": 0.00, "description": "..."}}}}
4. Learning: {{"intent": "generate_learning_plan", "plan_details": {{"topic": "...", "duration_text": "...", "duration_months": 1}}}}
5. Answer: {{"intent": "answer_question", "answer": "..."}}

Return ONLY valid JSON.
"""

        # Make AI call
        response = asyncio.run(llm.ainvoke(system_prompt))
        ai_content = response.content.strip()
        
        # Extract JSON
        json_start = ai_content.find('{')
        if json_start == -1:
            raise ValueError("No JSON in AI response")
        
        json_content = ai_content[json_start:]
        parsed_response = json.loads(json_content)

        # Handle intent
        intent = parsed_response.get("intent")
        
        if intent == "create_item":
            result = asyncio.run(handle_create_item(supabase, parsed_response, user_id))
        elif intent == "answer_question":
            result = {"type": "answer", "text": parsed_response.get("answer")}
        elif intent == "generate_learning_plan":
            # Simplified learning plan for Vercel function
            plan_details = parsed_response.get("plan_details", {})
            result = {
                "type": "plan_created",
                "plan": {
                    "topic": plan_details.get("topic", "Learning Plan"),
                    "duration_text": plan_details.get("duration_text", "4 weeks"),
                    "weekly_milestones": ["Week 1: Getting Started", "Week 2: Building Skills"]
                },
                "message": f"Created learning plan for {plan_details.get('topic', 'your topic')}"
            }
        else:
            result = {"type": "error", "error": "Unknown intent"}

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(result)
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({"type": "error", "error": str(e)})
        }
