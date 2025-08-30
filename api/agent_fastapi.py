# api/agent.py (Complete Production-Ready Python Master Agent)

import os
import json
import asyncio
import httpx
from typing import Dict, Any, Optional
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from supabase import create_client, Client
from langchain_groq import ChatGroq
import pendulum
from dotenv import load_dotenv

# --- Initialize FastAPI App ---
app = FastAPI()

# --- Global clients (initialized once for serverless efficiency) ---
_llm: Optional[ChatGroq] = None
_supabase: Optional[Client] = None

# --- Robust client initialization with error handling ---
def get_clients():
    global _llm, _supabase
    
    if _llm is None or _supabase is None:
        load_dotenv()
        
        # Check for required environment variables
        groq_api_key = os.getenv("GROQ_API_KEY")
        supabase_url = os.getenv("VITE_SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        missing_vars = []
        if not groq_api_key:
            missing_vars.append("GROQ_API_KEY")
        if not supabase_url:
            missing_vars.append("VITE_SUPABASE_URL")
        if not supabase_key:
            missing_vars.append("SUPABASE_SERVICE_ROLE_KEY")
        
        if missing_vars:
            raise HTTPException(
                status_code=500, 
                detail=f"Server configuration error: Missing environment variables: {', '.join(missing_vars)}"
            )

        try:
            _llm = ChatGroq(api_key=groq_api_key, model="llama-3.1-8b-instant", temperature=0.2)
            _supabase = create_client(supabase_url, supabase_key)
        except Exception as e:
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to initialize AI or database clients: {str(e)}"
            )
    
    return _llm, _supabase

# --- Helper function to trigger grocery enrichment (fire-and-forget) ---
async def trigger_grocery_enrichment(grocery_item: Dict[str, Any]):
    """Fire-and-forget call to enrich grocery item with nutrition data"""
    try:
        async with httpx.AsyncClient() as client:
            # Construct the full URL for the enrichment endpoint
            base_url = os.getenv("BASE_URL", "https://your-vercel-app.vercel.app")
            enrich_url = f"{base_url}/api/enrich-grocery-item"
            
            # Send the request without waiting for response
            await client.post(
                enrich_url,
                json={"grocery_item": grocery_item},
                timeout=5.0
            )
    except Exception as e:
        # Log but don't fail the main request
        print(f"Grocery enrichment failed (non-critical): {e}")

# --- Helper function to generate detailed learning plan milestones ---
async def generate_learning_milestones(llm: ChatGroq, topic: str, duration_text: str) -> list:
    """Generate detailed weekly milestones for a learning plan"""
    milestone_prompt = f"""
You are an expert learning plan creator. Generate a detailed, week-by-week learning plan for the topic: "{topic}" over the duration: "{duration_text}".

Return ONLY a JSON array of weekly milestone objects in this exact format:
[
  {{
    "week": 1,
    "title": "Week 1: Introduction and Fundamentals",
    "description": "Learn basic concepts and terminology",
    "tasks": ["Read chapter 1", "Complete exercise 1", "Practice basic techniques"]
  }},
  {{
    "week": 2,
    "title": "Week 2: Building Foundation",
    "description": "Develop core skills",
    "tasks": ["Practice daily", "Complete project 1", "Review fundamentals"]
  }}
]

Make it practical, progressive, and achievable. Include 3-5 specific tasks per week.
"""
    
    try:
        milestone_response = await llm.ainvoke(milestone_prompt)
        milestone_content = milestone_response.content.strip()
        
        # Find and parse JSON from response
        json_start = milestone_content.find('[')
        if json_start == -1:
            # Fallback to basic milestones if AI doesn't return proper format
            return [
                {
                    "week": 1,
                    "title": "Week 1: Getting Started",
                    "description": f"Begin learning {topic}",
                    "tasks": [f"Research {topic} basics", "Set up learning environment", "Create study schedule"]
                }
            ]
        
        milestone_json = milestone_content[json_start:]
        return json.loads(milestone_json)
    except Exception as e:
        print(f"Milestone generation error: {e}")
        # Return fallback milestones
        return [
            {
                "week": 1,
                "title": "Week 1: Getting Started",
                "description": f"Begin learning {topic}",
                "tasks": [f"Research {topic} basics", "Set up learning environment", "Create study schedule"]
            }
        ]

# --- Helper function to create tasks from learning plan ---
async def create_first_week_tasks(supabase: Client, user_id: str, milestones: list) -> list:
    """Auto-generate tasks for the first week of a learning plan"""
    if not milestones:
        return []
    
    first_week = milestones[0]
    tasks_to_create = []
    
    # Get current time in user's timezone
    now_ist = pendulum.now('Asia/Kolkata')
    
    for i, task_description in enumerate(first_week.get('tasks', [])):
        # Spread tasks across the week
        due_date = now_ist.add(days=i + 1)  # Tasks due in next few days
        
        task_data = {
            "user_id": user_id,
            "title": task_description,
            "description": f"Part of learning plan: {first_week.get('title', 'Week 1')}",
            "priority": 2,
            "estimate": 45,  # Default study duration
            "due_date_utc": due_date.in_timezone('UTC').to_iso8601_string(),
            "due_date_local": due_date.to_iso8601_string(),
            "timezone": 'Asia/Kolkata',
            "tags": ["learning", "auto-generated"],
            "status": "Inbox"
        }
        tasks_to_create.append(task_data)
    
    try:
        if tasks_to_create:
            insert_res = supabase.from_('tasks').insert(tasks_to_create).execute()
            return insert_res.data or []
    except Exception as e:
        print(f"Failed to create first week tasks: {e}")
        return []
    
    return []

# --- The Main API Endpoint ---
@app.post("/api/agent")
async def handle_agent_request(request: Request):
    try:
        # Parse request body
        try:
            body = await request.json()
        except Exception as e:
            raise HTTPException(status_code=400, detail="Invalid JSON in request body.")
        
        user_input = body.get("userInput")
        user_id = body.get("userId")

        if not user_input or not user_id:
            raise HTTPException(status_code=400, detail="Missing userInput or userId.")

        # Initialize clients with error handling
        try:
            llm, supabase = get_clients()
        except HTTPException:
            raise  # Re-raise HTTP exceptions
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Client initialization failed: {str(e)}")

        # Fetch User Context for Personalization
        try:
            # Note: Using 'users' table instead of 'profiles' based on your schema
            profile_res = supabase.from_('users').select('*').eq('id', user_id).single().execute()
            tasks_res = supabase.from_('tasks').select('title, due_date_utc, status').eq('user_id', user_id).limit(5).execute()
            
            profile_data = profile_res.data if profile_res.data else {}
            tasks_data = tasks_res.data if tasks_res.data else []
        except Exception as e:
            print(f"Failed to fetch user context: {e}")
            profile_data = {}
            tasks_data = []
        
        # Get current date in user's timezone
        now_ist = pendulum.now('Asia/Kolkata')
        today_in_ist = now_ist.format('dddd, MMMM D, YYYY')

        # Construct the consolidated AI prompt
        system_prompt = f"""
You are an expert AI Life Planner assistant powered by Llama 3.1 8B. Your job is to analyze the user's message and respond with a single, valid JSON object that represents their intent.

Context:
- Today's Date: {today_in_ist}
- User's Profile: {json.dumps(profile_data)}
- User's Recent Tasks: {json.dumps(tasks_data)}

Based on the user's message: "{user_input}", determine the intent and structure your response into ONE of the following JSON formats:

1. For creating a task:
   {{ "intent": "create_item", "type": "task", "data": {{ 
       "title": "Task title", 
       "description": "Optional description",
       "priority": 1-3 (1=high, 2=medium, 3=low),
       "estimate": minutes_to_complete,
       "due_absolute_iso": "2025-08-31T17:00:00" (if user specified a time),
       "tags": ["tag1", "tag2"],
       "status": "Inbox"
   }} }}

2. For creating a grocery item:
   {{ "intent": "create_item", "type": "grocery", "data": {{ 
       "item_name": "Grocery item name", 
       "quantity": "amount/description",
       "store": "store name if mentioned",
       "estimated_price": numeric_value_if_mentioned
   }} }}

3. For creating an expense:
   {{ "intent": "create_item", "type": "expense", "data": {{ 
       "category": "Food/Transport/Entertainment/etc", 
       "amount": numeric_amount,
       "description": "What was purchased",
       "date": "YYYY-MM-DD",
       "payment_method": "Cash/Card/UPI/etc"
   }} }}

4. For generating a learning plan:
   {{ "intent": "generate_learning_plan", "plan_details": {{ 
       "topic": "What to learn", 
       "duration_text": "How long (e.g., '3 months', '8 weeks')",
       "duration_months": numeric_duration_in_months
   }} }}

5. For answering a question:
   {{ "intent": "answer_question", "answer": "Your conversational answer here." }}

Rules:
- Always return valid JSON
- Use today's date as reference for relative dates
- For tasks with times, use ISO format in Asia/Kolkata timezone
- Be smart about extracting structured data from natural language
- If unclear, lean toward answering as a question rather than creating items
"""

        # Make AI call with error handling
        try:
            response = await llm.ainvoke(system_prompt)
            ai_content = response.content.strip()
            
            # Robustly extract JSON from AI response
            json_start = ai_content.find('{')
            if json_start == -1:
                raise ValueError("AI response did not contain valid JSON.")
            
            json_content = ai_content[json_start:]
            # Handle potential trailing text after JSON
            try:
                parsed_response = json.loads(json_content)
            except json.JSONDecodeError:
                # Try to find the end of the JSON object
                brace_count = 0
                json_end = json_start
                for i, char in enumerate(json_content):
                    if char == '{':
                        brace_count += 1
                    elif char == '}':
                        brace_count -= 1
                        if brace_count == 0:
                            json_end = i + 1
                            break
                parsed_response = json.loads(json_content[:json_end])
                
        except Exception as e:
            print(f"AI call failed: {e}")
            return JSONResponse(
                status_code=500,
                content={"type": "error", "error": f"AI processing failed: {str(e)}"}
            )

        # Execute based on detected intent
        intent = parsed_response.get("intent")
        
        if intent == "create_item":
            return await handle_create_item(supabase, parsed_response, user_id)
        
        elif intent == "generate_learning_plan":
            return await handle_generate_learning_plan(llm, supabase, parsed_response, user_id)
        
        elif intent == "answer_question":
            answer = parsed_response.get("answer", "I couldn't generate a proper response.")
            return JSONResponse(
                status_code=200,
                content={"type": "answer", "text": answer}
            )
        
        else:
            raise HTTPException(status_code=400, detail=f"Unknown intent: {intent}")

    except HTTPException:
        raise  # Re-raise HTTP exceptions as-is
    except Exception as e:
        print(f"Master Agent Error: {e}")
        return JSONResponse(
            status_code=500,
            content={"type": "error", "error": f"An unexpected error occurred: {str(e)}"}
        )

# --- Handle Create Item Logic ---
async def handle_create_item(supabase: Client, parsed_response: Dict[str, Any], user_id: str) -> JSONResponse:
    """Handle creation of tasks, groceries, or expenses"""
    try:
        item_type = parsed_response.get('type')
        item_data = parsed_response.get("data", {})
        item_data["user_id"] = user_id
        
        # Determine target table
        if item_type == "task":
            table_name = "tasks"
        elif item_type == "grocery":
            table_name = "groceries"
        elif item_type == "expense":
            table_name = "expenses"
        else:
            raise ValueError(f"Unknown item type: {item_type}")
        
        # Handle date conversion for tasks using Pendulum
        if item_type == 'task' and item_data.get('due_absolute_iso'):
            try:
                local_dt = pendulum.parse(item_data['due_absolute_iso'], tz='Asia/Kolkata')
                item_data['due_date_utc'] = local_dt.in_timezone('UTC').to_iso8601_string()
                item_data['due_date_local'] = local_dt.to_iso8601_string()
                item_data['timezone'] = 'Asia/Kolkata'
                # Also keep the legacy due_date for compatibility
                item_data['due_date'] = local_dt.in_timezone('UTC').to_iso8601_string()
                del item_data['due_absolute_iso']
            except Exception as e:
                print(f"Date parsing error: {e}")
                # Continue without date if parsing fails
                if 'due_absolute_iso' in item_data:
                    del item_data['due_absolute_iso']

        # Insert into database
        try:
            insert_res = supabase.from_(table_name).insert(item_data).execute()
            
            if not insert_res.data:
                error_msg = insert_res.error.message if insert_res.error else 'Unknown database error'
                raise Exception(f"Database insert failed: {error_msg}")
            
            created_item = insert_res.data[0]
            
            # Trigger grocery enrichment for grocery items (fire-and-forget)
            if item_type == "grocery":
                asyncio.create_task(trigger_grocery_enrichment(created_item))
            
            return JSONResponse(
                status_code=200,
                content={
                    "type": "creation_success", 
                    "item": created_item,
                    "message": f"Successfully created {item_type}: {created_item.get('title') or created_item.get('item_name')}"
                }
            )
            
        except Exception as e:
            print(f"Database insertion error: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to create {item_type}: {str(e)}")
            
    except Exception as e:
        print(f"Create item error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process item creation: {str(e)}")

# --- Handle Generate Learning Plan Logic ---
async def handle_generate_learning_plan(llm: ChatGroq, supabase: Client, parsed_response: Dict[str, Any], user_id: str) -> JSONResponse:
    """Handle learning plan generation with milestones and auto-task creation"""
    try:
        plan_details = parsed_response.get("plan_details", {})
        topic = plan_details.get("topic", "Unknown Topic")
        duration_text = plan_details.get("duration_text", "4 weeks")
        duration_months = plan_details.get("duration_months", 1)
        
        # Generate detailed weekly milestones
        try:
            weekly_milestones = await generate_learning_milestones(llm, topic, duration_text)
        except Exception as e:
            print(f"Milestone generation failed: {e}")
            # Fallback milestones
            weekly_milestones = [
                {
                    "week": 1,
                    "title": "Week 1: Getting Started",
                    "description": f"Begin learning {topic}",
                    "tasks": [f"Research {topic} basics", "Set up learning environment", "Create study schedule"]
                }
            ]
        
        # Save learning plan to database
        plan_data = {
            "user_id": user_id,
            "topic": topic,
            "duration_months": duration_months,
            "weekly_milestones": weekly_milestones
        }
        
        try:
            plan_insert_res = supabase.from_('learning_plans').insert(plan_data).execute()
            
            if not plan_insert_res.data:
                error_msg = plan_insert_res.error.message if plan_insert_res.error else 'Unknown database error'
                raise Exception(f"Failed to save learning plan: {error_msg}")
            
            created_plan = plan_insert_res.data[0]
            
            # Auto-generate first week's tasks
            created_tasks = await create_first_week_tasks(supabase, user_id, weekly_milestones)
            
            return JSONResponse(
                status_code=200,
                content={
                    "type": "plan_created",
                    "plan": {
                        "topic": topic,
                        "duration_text": duration_text,
                        "weekly_milestones": [milestone.get('title', f"Week {milestone.get('week', i+1)}") for i, milestone in enumerate(weekly_milestones)]
                    },
                    "message": f"Created learning plan for {topic} with {len(created_tasks)} tasks for the first week.",
                    "plan_id": created_plan.get('id'),
                    "created_tasks_count": len(created_tasks)
                }
            )
            
        except Exception as e:
            print(f"Learning plan database error: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to save learning plan: {str(e)}")
            
    except Exception as e:
        print(f"Generate learning plan error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate learning plan: {str(e)}")

# --- Health check endpoint ---
@app.get("/api/health")
async def health_check():
    """Simple health check endpoint"""
    try:
        llm, supabase = get_clients()
        return {"status": "healthy", "timestamp": pendulum.now().to_iso8601_string()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")

# --- Root endpoint ---
@app.get("/")
async def root():
    return {"message": "AI Life Planner Agent API", "version": "1.0.0"}
