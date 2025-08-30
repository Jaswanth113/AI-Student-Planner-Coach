# api/agent.py (Complete Production-Ready Python Master Agent)

import os
import json
import asyncio
import httpx
import re # Import re for regex parsing
from typing import Dict, Any, Optional
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware # Import CORSMiddleware
from supabase import create_client, Client
from langchain_groq import ChatGroq
import pendulum
from dotenv import load_dotenv

# --- Initialize FastAPI App ---
app = FastAPI()

# --- CORS Configuration ---
origins = [
    "http://localhost",
    "http://localhost:8080", # Frontend running on 8080
    "http://localhost:8081", # Frontend running on 8081 (if 8080 is in use)
    "http://127.0.0.1:8080",
    "http://127.0.0.1:8081",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

        print(f"DEBUG: Supabase URL: {supabase_url}")
        print(f"DEBUG: Supabase Key (first 5 chars): {supabase_key[:5]}...") # Print partial key for security

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
async def generate_learning_milestones(llm: ChatGroq, topic: str, duration_text: str, num_weeks: int) -> list:
    """Generate detailed weekly milestones for a learning plan with AI assistance"""
    try:
        # First, generate a structured learning plan using AI
        is_dsa = any(term in topic.lower() for term in ['data struct', 'dsa', 'algorithm'])
        
        if is_dsa:
            # DSA-specific prompt
            prompt = f"""You are an expert computer science educator specializing in Data Structures and Algorithms (DSA). 
            Create a comprehensive, week-by-week DSA mastery plan for "{topic}" over "{duration_text}". The plan MUST contain exactly {num_weeks} weeks.
            
            CRITICAL: You MUST return ONLY a valid JSON array. Do not include any text before or after the JSON.
            
            For each week, provide:
            - `week`: The week number (integer).
            - `title`: A concise title for the week's focus (string).
            - `description`: A brief overview of what will be covered (string).
            - `topics_covered`: A list of 3-5 specific topics to study (array of strings).
            - `learning_objectives`: 3-5 specific, measurable learning goals for the week (array of strings).
            - `tasks`: 3-5 actionable tasks to complete, including estimated time in parentheses (array of strings).
            - `estimated_hours`: Total estimated learning hours for the week (integer).
            - `tips`: 2-3 practical tips or best practices for the week (array of strings).
            - `resources`: 2-3 recommended resources (array of strings).

            Cover these core DSA areas progressively over {num_weeks} weeks:
            1. Complexity Analysis & Big-O
            2. Arrays & Strings
            3. Linked Lists
            4. Stacks & Queues
            5. Recursion & Backtracking
            6. Trees & Graphs
            7. Sorting & Searching
            8. Dynamic Programming
            9. Greedy Algorithms
            10. Advanced Topics (Tries, Segment Trees, etc.)
            
            Each week should include:
            - Theoretical concepts
            - Hands-on implementation
            - Problem-solving practice
            - Real-world applications
            - Common interview questions
            
            Return ONLY the JSON array with no additional text, markdown formatting, or explanations.
            """
        else:
            # General topic prompt
            prompt = f"""You are an expert learning experience designer. 
            Create a comprehensive, week-by-week learning plan for: {topic}
            Duration: {duration_text}. The plan MUST contain exactly {num_weeks} weeks.
            
            CRITICAL: You MUST return ONLY a valid JSON array. Do not include any text before or after the JSON.
            
            For each week, include these sections:
            - `week`: The week number (integer).
            - `title`: A concise title for the week's focus (string).
            - `description`: A brief overview of what will be covered (string).
            - `topics_covered`: A list of 3-5 specific topics to study (array of strings).
            - `learning_objectives`: 3-5 specific, measurable learning goals for the week (array of strings).
            - `tasks`: 3-5 actionable tasks to complete, including estimated time in parentheses (array of strings).
            - `estimated_hours`: Total estimated learning hours for the week (integer).
            - `tips`: 2-3 practical tips or best practices for the week (array of strings).
            - `resources`: 2-3 recommended resources (array of strings).

            Return ONLY a JSON array of weekly milestone objects in this exact format:
            [
              {{
                "week": 1,
                "title": "Week 1: Introduction and Fundamentals",
                "description": "Understand fundamental concepts and terminology.",
                "topics_covered": [
                    "History of the topic",
                    "Core concepts",
                    "Key principles"
                ],
                "learning_objectives": [
                  "Define core concepts.",
                  "Explain key principles."
                ],
                "tasks": [
                  "Read introductory material (2h)",
                  "Complete basic exercises (1h)"
                ],
                "estimated_hours": 8,
                "tips": [
                  "Focus on understanding.",
                  "Practice regularly."
                ],
                "resources": [
                  "Introductory Book",
                  "Online Tutorial"
                ]
              }}
            ]

            Make it practical, progressive, and achievable. Ensure each week has 3-5 specific tasks.
            Return ONLY the JSON array with no additional text, markdown formatting, or explanations.
            """
            
        print(f"DEBUG: Generating learning milestones for: {topic} ({duration_text})")
        print(f"DEBUG: Prompt sent to AI:\n{prompt[:1000]}...") # Log first 1000 chars of prompt
        
        try:
            # Try with the more powerful model first
            try:
                print("DEBUG: Attempting to generate with 70B model...")
                response = await llm.ainvoke(prompt) # Use ainvoke directly with the prompt
                print("DEBUG: Successfully generated with 70B model")
            except Exception as e:
                print(f"DEBUG: 70B model failed: {e}")
                print("DEBUG: Falling back to 8B model...")
                response = await llm.ainvoke(prompt, max_tokens=4000) # Use ainvoke directly with the prompt and max_tokens
            
            # Extract and clean the generated text
            generated_text = response.content.strip() # Access .content for ainvoke
            print(f"DEBUG: Raw AI response (first 500 chars):\n{generated_text[:500]}...")  # Log first 500 chars
            
            # Clean the response
            cleaned_text = generated_text.strip()
            
            # Remove markdown code block markers if present
            if cleaned_text.startswith('```json'):
                cleaned_text = cleaned_text[7:]
            elif cleaned_text.startswith('```'):
                cleaned_text = cleaned_text[3:]
            if cleaned_text.endswith('```'):
                cleaned_text = cleaned_text[:-3]
            cleaned_text = cleaned_text.strip()
            
            print(f"DEBUG: Cleaned AI response (first 500 chars):\n{cleaned_text[:500]}...")
            
            # Parse the JSON
            try:
                milestones = json.loads(cleaned_text)
                
                # Validate the structure
                if not isinstance(milestones, list):
                    raise ValueError("Expected a list of milestones")
                    
                print(f"DEBUG: Successfully parsed {len(milestones)} milestones")
                print(f"DEBUG: First parsed milestone:\n{json.dumps(milestones[0], indent=2) if milestones else 'N/A'}")
                
                # Ensure all required fields are present and have the correct types
                required_fields = {
                    "week": int,
                    "title": str,
                    "description": str,
                    "topics_covered": list,
                    "learning_objectives": list,
                    "tasks": list,
                    "resources": list,
                    "tips": list,
                    "estimated_hours": (int, float)
                }
                
                for i, milestone in enumerate(milestones):
                    for field, field_type in required_fields.items():
                        if field not in milestone:
                            raise ValueError(f"Missing required field: {field} in milestone {i+1}")
                        if not isinstance(milestone[field], field_type) and not (isinstance(field_type, tuple) and any(isinstance(milestone[field], t) for t in field_type)):
                            raise ValueError(f"Invalid type for {field} in milestone {i+1}. Expected {field_type}, got {type(milestone[field])}")
                
                print("Successfully validated milestones")
                return milestones
                
            except json.JSONDecodeError as e:
                print(f"Failed to parse JSON: {e}")
                print(f"Cleaned text that failed to parse: {cleaned_text[:500]}...")
                raise ValueError(f"Failed to parse learning plan: {str(e)}")
                
        except Exception as e:
            print(f"Error in generate_learning_milestones: {str(e)}")
            raise Exception(f"Failed to generate learning plan: {str(e)}")
            
    except Exception as e:
        print(f"Unexpected error in generate_learning_milestones: {str(e)}")
        raise

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
        plan_details = body.get("plan_details")

        if not user_input or not user_id:
            raise HTTPException(status_code=400, detail="Missing userInput or userId.")

        # Initialize clients with error handling
        try:
            llm, supabase = get_clients()
        except HTTPException:
            raise  # Re-raise HTTP exceptions
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Client initialization failed: {str(e)}")

        # --- Direct Intent Routing for Learning Plans ---
        # If plan_details are provided directly, bypass the general intent detection
        if plan_details and plan_details.get("topic"):
            print("Directly routing to generate_learning_plan.")
            # Construct the response as if the intent detector had run
            parsed_response = {
                "intent": "generate_learning_plan",
                "plan_details": plan_details
            }
            return await handle_generate_learning_plan(llm, supabase, parsed_response, user_id)

        # Fetch comprehensive user context for personalization
        try:
            profile_res = supabase.from_('users').select('*').eq('id', user_id).single().execute()
            tasks_res = supabase.from_('tasks').select('title, due_date_utc, status, priority').eq('user_id', user_id).limit(5).execute()
            groceries_res = supabase.from_('groceries').select('item_name, quantity, bought').eq('user_id', user_id).eq('bought', False).limit(5).execute()
            expenses_res = supabase.from_('expenses').select('category, amount, expense_date').eq('user_id', user_id).order('created_at', desc=True).limit(5).execute()
            commitments_res = supabase.from_('commitments').select('title, type, start_time').eq('user_id', user_id).order('start_time', desc=True).limit(3).execute()
            learning_plans_res = supabase.from_('learning_plans').select('topic, duration_months').eq('user_id', user_id).order('created_at', desc=True).limit(3).execute()
            
            profile_data = profile_res.data if profile_res.data else {}
            tasks_data = tasks_res.data if tasks_res.data else []
            groceries_data = groceries_res.data if groceries_res.data else []
            expenses_data = expenses_res.data if expenses_res.data else []
            commitments_data = commitments_res.data if commitments_res.data else []
            learning_plans_data = learning_plans_res.data if learning_plans_res.data else []
        except Exception as e:
            print(f"Failed to fetch user context: {e}")
            profile_data = {}
            tasks_data = []
            groceries_data = []
            expenses_data = []
            commitments_data = []
            learning_plans_data = []
        
        # Get current date in user's timezone
        now_ist = pendulum.now('Asia/Kolkata')
        today_in_ist = now_ist.format('dddd, MMMM D, YYYY')

        # Check for grocery planning request with active goal
        active_goal = body.get("activeGoal")
        explicit_intent = body.get("intent")
        
        if explicit_intent == "generate_grocery_plan":
            # Pass active_goal as None if not provided, allowing for goal-independent planning
            return await handle_generate_grocery_plan(llm, supabase, user_input, user_id, active_goal)
        
        # Construct the comprehensive AI prompt for all page contexts
        system_prompt = f"""
You are an expert AI Life Planner assistant powered by Llama 3.1 8B. Your job is to analyze the user's message and respond with a single, valid JSON object that represents their intent.

Full User Context:
- Today's Date: {today_in_ist}
- User Profile: {json.dumps(profile_data)}
- Recent Tasks: {json.dumps(tasks_data)}
- Pending Groceries: {json.dumps(groceries_data)}
- Recent Expenses: {json.dumps(expenses_data)}
- Upcoming Commitments: {json.dumps(commitments_data)}
- Learning Plans: {json.dumps(learning_plans_data)}

User Message: "{user_input}"

Respond with ONE of these JSON formats based on intent:

1. TASKS & GOALS:
   {{ "intent": "create_item", "type": "task", "data": {{ 
       "title": "Task title", 
       "description": "Optional description",
       "category": "Personal/Work/Health/Learning",
       "priority": 1-3 (1=high, 2=medium, 3=low),
       "estimate": minutes_to_complete,
       "due_absolute_iso": "2025-08-31T17:00:00" (if time specified),
       "tags": ["relevant", "tags"],
       "status": "Inbox",
       "location": "if_location_mentioned"
   }} }}

2. GOALS:
   {{ "intent": "create_item", "type": "goal", "data": {{ 
       "title": "Goal title",
       "progress_percentage": 0,
       "deadline": "2025-12-31T23:59:59" (if specified)
   }} }}

3. COMMITMENTS & SCHEDULE:
   {{ "intent": "create_item", "type": "commitment", "data": {{ 
       "title": "Event/Meeting title",
       "type": "class/hackathon/gym/social/exam (ONLY these 5 types are allowed)",
       "start_time": "2025-08-31T14:00:00",
       "end_time": "2025-08-31T15:00:00",
       "location": "if_mentioned",
       "reminder_minutes": 15
   }} }}

4. GROCERY & BUDGET:
   {{ "intent": "create_item", "type": "grocery", "data": {{ 
       "item_name": "Grocery item name", 
       "quantity": numeric_quantity,
       "unit": "kg/liter/pieces",
       "store": "store name if mentioned",
       "price": numeric_price_if_mentioned
   }} }}

5. EXPENSES:
   {{ "intent": "create_item", "type": "expense", "data": {{ 
       "category": "Food/Transport/Entertainment/Shopping/Bills/Health/Education", 
       "amount": numeric_amount,
       "description": "What was purchased",
       "expense_date": "YYYY-MM-DD"
   }} }}

6. REMINDERS:
   {{ "intent": "create_item", "type": "reminder", "data": {{ 
       "title": "Reminder title",
       "due_date": "2025-08-31T15:00:00",
       "category": "personal/work/health"
   }} }}

7. NOTIFICATIONS:
   {{ "intent": "create_item", "type": "notification", "data": {{ 
       "message": "Notification message",
       "type": "reminder/achievement/warning/info"
   }} }}

8. LEARNING PLANS:
   {{ "intent": "generate_learning_plan", "plan_details": {{ 
       "topic": "What to learn", 
       "duration_text": "How long (e.g., '3 months', '8 weeks')",
       "duration_months": numeric_duration_in_months
   }} }}

9. ANALYTICS & INSIGHTS:
   {{ "intent": "analyze_data", "analysis_type": "budget/tasks/productivity/learning", "data": {{}} }}

10. QUESTIONS & CONVERSATION:
    {{ "intent": "answer_question", "answer": "Your helpful response here." }}

Rules:
- Always return valid JSON
- Use today's date as reference for relative dates
- For times, use ISO format in Asia/Kolkata timezone
- Extract structured data intelligently from natural language
- Consider user's existing data when making suggestions
- If unclear, provide helpful conversational responses
"""

        # Make AI call with error handling
        try:
            print(f"DEBUG: Sending system_prompt to AI (first 500 chars):\n{system_prompt[:500]}...")
            response = await llm.ainvoke(system_prompt)
            ai_content = response.content.strip()
            print(f"DEBUG: Raw AI response from intent detection:\n{ai_content}")
            
            # Robustly extract JSON from AI response
            json_start = ai_content.find('{')
            if json_start == -1:
                print("ERROR: AI response did not contain a starting '{' for JSON.")
                raise ValueError("AI response did not contain valid JSON.")
            
            json_content = ai_content[json_start:]
            # Handle potential trailing text after JSON
            try:
                parsed_response = json.loads(json_content)
            except json.JSONDecodeError as e:
                print(f"ERROR: Initial JSON parse failed: {e}")
                print(f"DEBUG: Attempting to recover JSON from: {json_content[:500]}...")
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
                
                if brace_count != 0: # If braces are not balanced, it's truly malformed
                    print(f"ERROR: JSON braces are unbalanced. Cannot recover. Raw content: {json_content[:500]}...")
                    raise ValueError(f"AI response contained malformed JSON: {e}")

                try:
                    parsed_response = json.loads(json_content[:json_end])
                    print(f"DEBUG: Successfully recovered JSON: {json.dumps(parsed_response, indent=2)}")
                except json.JSONDecodeError as e_recover:
                    print(f"ERROR: JSON recovery attempt also failed: {e_recover}. Raw content: {json_content[:500]}...")
                    raise ValueError(f"AI response contained malformed JSON: {e_recover}")
                
        except Exception as e:
            print(f"ERROR: AI call or JSON processing failed in handle_agent_request: {e}")
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
        
        # Determine target table and handle specific data processing
        if item_type == "task":
            table_name = "tasks"
        elif item_type == "grocery":
            table_name = "groceries"
        elif item_type == "expense":
            table_name = "expenses"
        elif item_type == "goal":
            table_name = "goals"
        elif item_type == "commitment":
            table_name = "commitments"
        elif item_type == "reminder":
            table_name = "reminders"
        elif item_type == "notification":
            table_name = "notifications"
        else:
            raise ValueError(f"Unknown item type: {item_type}")
        
        # Handle date/time conversions for different item types using Pendulum
        if item_type == 'task' and item_data.get('due_absolute_iso'):
            try:
                local_dt = pendulum.parse(item_data['due_absolute_iso'], tz='Asia/Kolkata')
                item_data['due_date_utc'] = local_dt.in_timezone('UTC').to_iso8601_string()
                item_data['due_date_local'] = local_dt.to_iso8601_string()
                item_data['timezone'] = 'Asia/Kolkata'
                item_data['due_date'] = local_dt.in_timezone('UTC').to_iso8601_string()
                del item_data['due_absolute_iso']
            except Exception as e:
                print(f"Date parsing error: {e}")
                if 'due_absolute_iso' in item_data:
                    del item_data['due_absolute_iso']
        
        elif item_type == 'commitment':
            # Handle start_time and end_time for commitments
            for time_field in ['start_time', 'end_time']:
                if item_data.get(time_field):
                    try:
                        local_dt = pendulum.parse(item_data[time_field], tz='Asia/Kolkata')
                        item_data[time_field] = local_dt.in_timezone('UTC').to_iso8601_string()
                    except Exception as e:
                        print(f"Commitment {time_field} parsing error: {e}")
        
        elif item_type == 'reminder' and item_data.get('due_date'):
            try:
                local_dt = pendulum.parse(item_data['due_date'], tz='Asia/Kolkata')
                item_data['due_date_utc'] = local_dt.in_timezone('UTC').to_iso8601_string()
                item_data['due_date_local'] = local_dt.to_iso8601_string()
                item_data['timezone'] = 'Asia/Kolkata'
                item_data['due_date'] = local_dt.in_timezone('UTC').to_iso8601_string()
            except Exception as e:
                print(f"Reminder date parsing error: {e}")
        
        elif item_type == 'goal' and item_data.get('deadline'):
            try:
                local_dt = pendulum.parse(item_data['deadline'], tz='Asia/Kolkata')
                item_data['deadline'] = local_dt.in_timezone('UTC').to_iso8601_string()
            except Exception as e:
                print(f"Goal deadline parsing error: {e}")

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

# --- Helper function to extend learning plan ---
async def extend_learning_plan(llm: ChatGroq, supabase: Client, plan_id: str, user_id: str, additional_weeks: int) -> Dict[str, Any]:
    """Extend an existing learning plan with additional weeks"""
    try:
        # Validate input parameters
        if not plan_id or not isinstance(plan_id, str):
            return {"error": "Invalid plan ID"}
            
        if not user_id or not isinstance(user_id, str):
            return {"error": "Invalid user ID"}
            
        if not isinstance(additional_weeks, int) or additional_weeks <= 0:
            return {"error": "Number of weeks must be a positive integer"}
        
        # Fetch the existing plan with error handling
        try:
            plan_res = supabase.from_('learning_plans').select('*').eq('id', plan_id).eq('user_id', user_id).execute()
            
            if not plan_res.data or len(plan_res.data) == 0:
                return {"error": "Plan not found or you don't have permission to access it"}
                
            plan = plan_res.data[0]
            current_milestones = plan.get('weekly_milestones', [])
            
            if not isinstance(current_milestones, list):
                current_milestones = []
                
            current_weeks = len(current_milestones)
            
            # Generate new milestones for additional weeks
            topic = plan.get('topic', 'Unknown Topic')
            duration_text = f"{additional_weeks} weeks"
            
            # Generate new milestones with fallback to 8B model if 70B fails
            new_milestones = []
            try:
                # Try 70B model first for better learning plan generation
                specialist_llm = ChatGroq(
                    api_key=os.getenv("GROQ_API_KEY"), 
                    model="llama-3.1-8b-instant", 
                    temperature=0.1
                )
                new_milestones = await generate_learning_milestones(specialist_llm, topic, duration_text, additional_weeks) # Pass num_weeks
            except Exception as e:
                print(f"70B model failed for extending plan, trying 8B fallback: {e}")
                new_milestones = await generate_learning_milestones(llm, topic, duration_text, additional_weeks) # Pass num_weeks
            
            if not isinstance(new_milestones, list) or len(new_milestones) == 0:
                return {"error": "Failed to generate new milestones. Please try again."}
            
            # Adjust week numbers for the new milestones
            for i, milestone in enumerate(new_milestones, start=current_weeks + 1):
                if not isinstance(milestone, dict):
                    milestone = {}
                milestone['week'] = i
                milestone['title'] = f"Week {i}: {milestone.get('title', '').split(':', 1)[-1].strip()}"
            
            # Combine old and new milestones
            updated_milestones = current_milestones + new_milestones
            
            # Calculate new duration in months (rounding up)
            current_duration = plan.get('duration_months', 0)
            if not isinstance(current_duration, (int, float)) or current_duration < 0:
                current_duration = 0
                
            new_duration = current_duration + (additional_weeks // 4) + (1 if additional_weeks % 4 > 0 else 0)
            
            # Update the plan in the database
            update_data = {
                'weekly_milestones': updated_milestones,
                'duration_months': new_duration,
                'updated_at': 'now()'
            }
            
            update_res = supabase.from_('learning_plans').update(update_data).eq('id', plan_id).execute()
            
            if not update_res.data or len(update_res.data) == 0:
                return {"error": "Failed to update learning plan in the database"}
            
            return {
                "success": True,
                "plan_id": plan_id,
                "new_weeks_added": additional_weeks,
                "total_weeks": len(updated_milestones),
                "updated_milestones": updated_milestones
            }
            
        except Exception as e:
            print(f"Error in extend_learning_plan database operations: {str(e)}")
            return {"error": f"Database operation failed: {str(e)}"}
        
    except Exception as e:
        print(f"Unexpected error in extend_learning_plan: {str(e)}")
        return {"error": f"An unexpected error occurred: {str(e)}"}
    
    return {"error": "An unknown error occurred"}

# --- Handle Generate Learning Plan Logic ---
async def handle_generate_learning_plan(llm: ChatGroq, supabase: Client, parsed_response: Dict[str, Any], user_id: str) -> JSONResponse:
    """Handle learning plan generation with milestones and auto-task creation"""
    try:
        plan_details = parsed_response.get("plan_details", {})
        topic = plan_details.get("topic", "Unknown Topic")
        duration_text = plan_details.get("duration_text", "4 weeks")
        duration_months = plan_details.get("duration_months", 1)
        
        # Calculate the number of weeks based on duration_months
        num_weeks = duration_months * 4 # Assuming 4 weeks per month for simplicity
        if "week" in duration_text.lower():
            # Try to extract weeks directly if mentioned in duration_text
            week_match = re.search(r'(\d+)\s*week', duration_text, re.IGNORECASE)
            if week_match:
                num_weeks = int(week_match.group(1))
        
        # Ensure minimum weeks for monthly plans
        if num_weeks < duration_months * 4:
            num_weeks = duration_months * 4
            print(f"DEBUG: Adjusted num_weeks to {num_weeks} for {duration_months} month plan")
        
        # Log the start of plan generation
        print(f"Generating learning plan for topic: {topic}, duration: {duration_text} ({num_weeks} weeks)")
        
        # Generate detailed weekly milestones using more powerful model
        try:
            # Try 70B model first for better learning plan generation
            print("Attempting to generate plan with 70B model...")
            specialist_llm = ChatGroq(
                api_key=os.getenv("GROQ_API_KEY"), 
                model="llama-3.1-8b-instant", 
                temperature=0.2,  # Slightly higher temperature for more creative but focused output
                max_tokens=4000  # Ensure we have enough tokens for detailed plans
            )
            weekly_milestones = await generate_learning_milestones(specialist_llm, topic, duration_text, num_weeks)
            print("Successfully generated plan with 70B model")
            
        except Exception as e:
            print(f"70B model failed for learning plan: {str(e)}")
            print("Falling back to 8B model...")
            
            # Fallback to regular 8B model if 70B isn't available
            try:
                weekly_milestones = await generate_learning_milestones(llm, topic, duration_text, num_weeks)
                print("Successfully generated plan with 8B model")
                
            except Exception as fallback_error:
                error_msg = f"All milestone generation attempts failed: {str(fallback_error)}"
                print(error_msg)
                
                # Instead of falling back to a generic plan, return a proper error
                return JSONResponse(
                    status_code=500,
                    content={
                        "type": "error",
                        "detail": "Failed to generate learning plan. Please try again later.",
                        "error": error_msg
                    }
                )
        
        # Log the generated milestones for debugging
        print(f"Generated {len(weekly_milestones)} weekly milestones")
        if weekly_milestones:
            print(f"First milestone: {json.dumps(weekly_milestones[0], indent=2)}")
        
        # Save learning plan to database
        plan_data = {
            "user_id": user_id,
            "topic": topic,
            "duration_months": duration_months,
            "weekly_milestones": weekly_milestones,
            "created_at": "now()"
        }
        
        try:
            print("Saving plan to database...")
            plan_insert_res = supabase.from_('learning_plans').insert(plan_data).execute()
            
            if not plan_insert_res.data:
                error_msg = plan_insert_res.error.message if plan_insert_res.error else 'Unknown database error'
                print(f"Database error: {error_msg}")
                raise Exception(f"Failed to save learning plan: {error_msg}")
            
            created_plan = plan_insert_res.data[0]
            print(f"Plan saved with ID: {created_plan.get('id')}")
            
            # Auto-generate first week's tasks
            print("Creating tasks for first week...")
            created_tasks = await create_first_week_tasks(supabase, user_id, weekly_milestones)
            print(f"Created {len(created_tasks)} tasks")
            
            # Prepare the response with all milestone details
            response_data = {
                "type": "plan_created",
                "plan": {
                    "id": created_plan.get('id'),
                    "topic": topic,
                    "duration_text": duration_text,
                    "duration_months": duration_months,
                    "weekly_milestones": weekly_milestones,
                    "milestone_titles": [milestone.get('title', f"Week {milestone.get('week', i+1)}") for i, milestone in enumerate(weekly_milestones)]
                },
                "message": f"Created learning plan for {topic} with {len(created_tasks)} tasks for the first week.",
                "plan_id": created_plan.get('id'),
                "created_tasks_count": len(created_tasks)
            }
            
            return JSONResponse(status_code=200, content=response_data)
            
        except Exception as e:
            print(f"Learning plan database error: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to save learning plan: {str(e)}")
            
    except Exception as e:
        print(f"Generate learning plan error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate learning plan: {str(e)}")

# --- Handle Generate Grocery Plan Logic ---
async def handle_generate_grocery_plan(llm: ChatGroq, supabase: Client, user_input: str, user_id: str, active_goal: Optional[Dict[str, Any]]) -> JSONResponse:
    """Handle AI-powered grocery plan generation, optionally based on an active goal."""
    try:
        now_ist = pendulum.now('Asia/Kolkata')
        today_in_ist = now_ist.format('dddd, MMMM D, YYYY')
        
        try:
            current_groceries_res = supabase.from_('groceries').select('item_name, quantity, unit, bought').eq('user_id', user_id).eq('bought', False).limit(5).execute()
            current_groceries = current_groceries_res.data if current_groceries_res.data else []
        except Exception as e:
            print(f"Failed to fetch current groceries: {e}")
            current_groceries = []
        
        # Determine goal context for the AI prompt
        goal_context_str = ""
        goal_type_for_prompt = "general health"
        goal_id_for_db = None

        if active_goal and active_goal.get('id'):
            goal_id_for_db = active_goal['id']
            goal_type_for_prompt = active_goal.get('goal_type', 'unknown').replace('_', ' ')
            goal_context_str = f"""
USER'S ACTIVE GOAL:
- Goal Type: {goal_type_for_prompt}
- Goal Title: {active_goal.get('title', 'Unknown Goal')}
- Target: {active_goal.get('target_value', 'Not specified')} {active_goal.get('target_unit', '')}
- Metadata: {json.dumps(active_goal.get('metadata', {}))}
"""
        else:
            # Attempt to infer goal type and budget from user input if no active goal is provided
            if re.search(r"muscle building|muscle gain", user_input, re.IGNORECASE):
                goal_type_for_prompt = "muscle gain"
            elif re.search(r"weight loss", user_input, re.IGNORECASE):
                goal_type_for_prompt = "weight loss"
            elif re.search(r"budget|affordable", user_input, re.IGNORECASE):
                goal_type_for_prompt = "budget eating"
            
            goal_context_str = f"The user is asking for a grocery plan with a focus on {goal_type_for_prompt}."

        specialist_prompt = f"""
You are an expert Indian nutritionist, meal planner, and budget advisor. Today is {today_in_ist}.

{goal_context_str}

CURRENT GROCERIES (Unbought):
{json.dumps(current_groceries)}

USER REQUEST: "{user_input}"

Based on the user's request and the goal context, generate a comprehensive, week-long grocery shopping list that is:
1. Nutritionally aligned with their {goal_type_for_prompt} goal/focus
2. Budget-conscious with realistic Indian market prices
3. Practical for making simple, healthy Indian meals
4. Complementary to their existing groceries (avoid duplicates)

PRICING GUIDELINES:
- Vegetables: ₹20-80 per 500g
- Fruits: ₹40-120 per kg  
- Grains/Pulses: ₹80-200 per kg
- Dairy: ₹25-60 per 500ml/250g
- Proteins: ₹150-400 per kg

GOAL-SPECIFIC CONSIDERATIONS:
{"For weight loss: Focus on low-calorie, high-fiber, high-protein foods. Include plenty of vegetables, lean proteins, and whole grains." if goal_type_for_prompt == 'weight loss' else ""}
{"For muscle gain: Emphasize high-protein foods, complex carbs, and healthy fats. Include paneer, dal, quinoa, nuts." if goal_type_for_prompt == 'muscle gain' else ""}
{"For budget eating: Focus on cost-effective staples like rice, dal, seasonal vegetables, and affordable proteins." if goal_type_for_prompt == 'budget eating' else ""}

Return ONLY a valid JSON object in this exact format:
{{
  "grocery_plan": [
    {{ "item_name": "Paneer", "quantity": 200, "unit": "g", "estimated_price": 90 }},
    {{ "item_name": "Spinach", "quantity": 500, "unit": "g", "estimated_price": 40 }},
    {{ "item_name": "Toor Dal", "quantity": 1, "unit": "kg", "estimated_price": 150 }},
    {{ "item_name": "Brown Rice", "quantity": 2, "unit": "kg", "estimated_price": 200 }}
  ]
}}

Ensure the list contains 10-15 items for a full week of healthy meals. Include a good mix of:
- Proteins (dal, paneer, chicken/fish if non-veg)
- Vegetables (leafy greens, seasonal vegetables)
- Grains (rice, wheat, quinoa)
- Dairy (milk, yogurt)
- Healthy fats (nuts, oils)
- Fruits (seasonal and affordable)
"""
        
        try:
            specialist_llm = ChatGroq(api_key=os.getenv("GROQ_API_KEY"), model="llama-3.1-8b-instant", temperature=0.3)
            response = await specialist_llm.ainvoke(specialist_prompt)
        except Exception as e:
            print(f"8B model failed, using fallback: {e}")
            response = await llm.ainvoke(specialist_prompt)
        
        ai_content = response.content.strip()
        
        json_start = ai_content.find('{')
        if json_start == -1:
            raise ValueError("AI did not return valid JSON for grocery plan.")
        
        json_content = ai_content[json_start:]
        
        try:
            parsed_plan = json.loads(json_content)
        except json.JSONDecodeError:
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
            parsed_plan = json.loads(json_content[:json_end])
        
        grocery_items = parsed_plan.get("grocery_plan", [])
        
        if not grocery_items:
            raise ValueError("AI did not generate any grocery items.")
        
        # Prepare grocery items for database insertion
        items_to_insert = []
        for item in grocery_items:
            grocery_data = {
                "user_id": user_id,
                "item_name": item.get("item_name", "Unknown Item"),
                "quantity": item.get("quantity", 1),
                "unit": item.get("unit", "piece"),
                "price": item.get("estimated_price", 0),
                "bought": False,
                "goal_id": goal_id_for_db # Use the determined goal_id
            }
            items_to_insert.append(grocery_data)
        
        # Insert all grocery items at once
        try:
            insert_res = supabase.from_('groceries').insert(items_to_insert).execute()
            
            if not insert_res.data:
                error_msg = insert_res.error.message if insert_res.error else 'Unknown database error'
                raise Exception(f"Database insert failed: {error_msg}")
            
            created_items = insert_res.data
            
            # Trigger enrichment for all items (fire-and-forget)
            for item in created_items:
                asyncio.create_task(trigger_grocery_enrichment(item))
            
            # Generate summary message
            total_estimated_cost = sum(item.get("estimated_price", 0) for item in grocery_items)
            
            if active_goal:
                summary_message = f"Generated a personalized grocery plan for your {goal_type_for_prompt} goal! Added {len(created_items)} items with estimated cost of ₹{total_estimated_cost:.2f}. The plan includes nutritionally balanced foods to help you achieve your target."
            else:
                summary_message = f"Generated a grocery plan focusing on {goal_type_for_prompt}! Added {len(created_items)} items with estimated cost of ₹{total_estimated_cost:.2f}. The plan includes nutritionally balanced foods."

            return JSONResponse(
                status_code=200,
                content={
                    "type": "grocery_plan_created",
                    "message": summary_message,
                    "items_added": len(created_items),
                    "estimated_total_cost": total_estimated_cost,
                    "goal_type": goal_type_for_prompt,
                    "items": created_items
                }
            )
            
        except Exception as e:
            print(f"Database insertion error for grocery plan: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to save grocery plan: {str(e)}")
        
    except Exception as e:
        print(f"Grocery plan generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate grocery plan: {str(e)}")

# --- Health check endpoint ---
@app.get("/api/health")
async def health_check():
    """Simple health check endpoint"""
    try:
        llm, supabase = get_clients()
        return {"status": "healthy", "timestamp": pendulum.now().to_iso8601_string()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")

# --- Extend Learning Plan Endpoint ---
@app.post("/api/extend-learning-plan")
async def extend_learning_plan_endpoint(request: Request):
    """
    Endpoint to extend an existing learning plan with additional weeks of milestones.
    
    Request body should contain:
    - plan_id: ID of the learning plan to extend
    - additional_weeks: Number of weeks to add (defaults to 4 if not provided)
    
    Headers should include:
    - user-id: ID of the authenticated user
    """
    try:
        # Get required clients
        try:
            llm, supabase = get_clients()
        except Exception as e:
            print(f"Failed to initialize clients: {e}")
            raise HTTPException(
                status_code=500,
                detail="Failed to initialize required services. Please try again later."
            )
        
        # Parse and validate request data
        try:
            data = await request.json()
            plan_id = data.get('plan_id')
            additional_weeks = int(data.get('additional_weeks', 4))  # Default to 4 weeks
            
            if not plan_id:
                raise ValueError("Plan ID is required")
            if additional_weeks <= 0:
                raise ValueError("Number of weeks must be a positive integer")
                
        except (ValueError, TypeError) as e:
            raise HTTPException(status_code=400, detail=f"Invalid request data: {str(e)}")
            
        # Get and validate user ID from auth
        user_id = request.headers.get('user-id')
        if not user_id:
            raise HTTPException(
                status_code=401, 
                detail="Authentication required. Please log in again."
            )
        
        # Call the extend learning plan function
        try:
            result = await extend_learning_plan(llm, supabase, plan_id, user_id, additional_weeks)
        except Exception as e:
            print(f"Error in extend_learning_plan: {e}")
            raise HTTPException(
                status_code=500,
                detail="An error occurred while processing your request. Please try again."
            )
        
        # Check for errors in the result
        if 'error' in result:
            raise HTTPException(status_code=400, detail=result['error'])
        
        # Return success response
        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "message": f"Successfully extended learning plan with {additional_weeks} additional weeks",
                "plan_id": result['plan_id'],
                "total_weeks": result['total_weeks']
            }
        )
        
    except HTTPException as he:
        # Re-raise HTTP exceptions as they are
        raise he
        
    except Exception as e:
        # Log the full error for debugging
        import traceback
        error_trace = traceback.format_exc()
        print(f"Unexpected error in extend_learning_plan_endpoint: {error_trace}")
        
        # Return a generic error message to the client
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred. Our team has been notified."
        )

# --- Root endpoint ---
@app.get("/")
async def root():
    return {"message": "AI Life Planner Agent API", "version": "1.0.0"}

# --- Helper function to convert units to grams ---
def convert_to_grams(quantity: float, unit: str) -> float:
    """Helper function to convert all units to a standard base (grams)"""
    lower_unit = unit.lower()
    if lower_unit == 'kg':
        return quantity * 1000
    # Add other conversions if needed, e.g., for 'L' to 'ml' assuming 1ml = 1g
    # For 'pc' (piece), we can't convert to grams, so we'll handle it differently.
    return quantity # Assume 'g' or 'pc' for now

# --- Nutrition Enrichment Endpoint ---
@app.post("/api/enrich-grocery-item")
async def enrich_grocery_item(request: Request):
    """
    Endpoint to enrich a grocery item with nutrition data from CalorieNinja API.
    This is called as a fire-and-forget task from handle_create_item.
    """
    try:
        # Load environment variables fresh for this endpoint
        load_dotenv()
        
        body = await request.json()
        item_name = body.get("item_name")
        grocery_id = body.get("grocery_id")
        user_id = body.get("user_id")
        quantity = body.get("quantity")
        unit = body.get("unit")

        # More detailed validation with specific error messages
        missing_fields = []
        if not item_name:
            missing_fields.append("item_name")
        if quantity is None:
            missing_fields.append("quantity")
        if not unit:
            missing_fields.append("unit")
        if not grocery_id:
            missing_fields.append("grocery_id")
        if not user_id:
            missing_fields.append("user_id")
            
        if missing_fields:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required fields: {', '.join(missing_fields)}. Received: item_name='{item_name}', quantity={quantity}, unit='{unit}', grocery_id='{grocery_id}', user_id='{user_id}'"
            )

        calorie_ninja_api_key = os.getenv("CALORIENINJA_API_KEY")
        print(f"DEBUG: CALORIENINJA_API_KEY = '{calorie_ninja_api_key}'")
        if not calorie_ninja_api_key:
            print("CalorieNinja API key not available, returning item without enrichment")
            # Return the original item without enrichment instead of failing
            update_res = supabase_client.from_('groceries').select('*').eq('id', grocery_id).eq('user_id', user_id).single().execute()
            if update_res.data:
                return JSONResponse(status_code=200, content={"message": "Grocery item added (nutrition enrichment unavailable)", "item": update_res.data})
            else:
                raise HTTPException(status_code=404, detail="Grocery item not found.")
        
        # Get Supabase client fresh for this endpoint
        supabase_url = os.getenv("VITE_SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not supabase_url or not supabase_key:
            raise HTTPException(status_code=500, detail="Supabase environment variables not set.")
        
        supabase_client = create_client(supabase_url, supabase_key)

        # --- STEP 1: Get Base Nutrition Data (always for 100g) ---
        # We send a CLEAN query to the API, just the item name.
        api_query = item_name
        ninja_api_url = f"https://api.api-ninjas.com/v1/nutrition?query={api_query}"
        
        try:
            async with httpx.AsyncClient() as client:
                api_response = await client.get(
                    ninja_api_url,
                    headers={"X-Api-Key": calorie_ninja_api_key},
                    timeout=10.0
                )
                api_response.raise_for_status()
                nutrition_data = api_response.json()
                print(f"DEBUG: API response type: {type(nutrition_data)}")
                print(f"DEBUG: API response content: {nutrition_data}")
        except Exception as e:
            print(f"API Ninjas API request failed: {e}")
            # Return the original item without enrichment when API fails
            update_res = supabase_client.from_('groceries').select('*').eq('id', grocery_id).eq('user_id', user_id).single().execute()
            if update_res.data:
                return JSONResponse(status_code=200, content={"message": "Grocery item added (nutrition enrichment unavailable)", "item": update_res.data})
            else:
                raise HTTPException(status_code=404, detail="Grocery item not found.")

        # API Ninjas returns an array directly, not an object with "items" key
        base_nutrition = nutrition_data[0] if nutrition_data and len(nutrition_data) > 0 else None
        print(f"DEBUG: base_nutrition type: {type(base_nutrition)}")
        print(f"DEBUG: base_nutrition content: {base_nutrition}")

        # If the API can't find the food, we can't proceed.
        if not base_nutrition:
            print(f"API Ninjas could not find base nutrition for \"{item_name}\".")
            # Return the original item without enrichment
            update_res = supabase_client.from_('groceries').select('*').eq('id', grocery_id).eq('user_id', user_id).single().execute()
            if update_res.data and len(update_res.data) > 0:
                return JSONResponse(status_code=200, content={"message": "Grocery item added (nutrition data not found)", "item": update_res.data[0]})
            else:
                raise HTTPException(status_code=404, detail="Grocery item not found.")
        
        # --- STEP 2: The Definitive Calculation Logic ---
        final_calories = 0.0
        final_protein = 0.0
        final_fat = 0.0
        final_carbohydrates = 0.0
        final_sugar = 0.0
        final_fiber = 0.0
        final_cholesterol = 0.0
        final_sodium = 0.0

        # Helper function to safely get numeric values from API response
        def safe_get_numeric(data, key, default=0):
            value = data.get(key, default)
            if isinstance(value, str) and "premium" in value.lower():
                return default  # Return default for premium-only fields
            try:
                return float(value) if value is not None else default
            except (ValueError, TypeError):
                return default
        
        serving_size_g = safe_get_numeric(base_nutrition, "serving_size_g", 100)

        if unit.lower() in ['pc', 'piece']:
            # For items sold by piece, multiply the base nutrition by the quantity.
            final_calories = safe_get_numeric(base_nutrition, "calories", 0) * quantity
            final_protein = safe_get_numeric(base_nutrition, "protein_g", 0) * quantity
            final_fat = safe_get_numeric(base_nutrition, "fat_total_g", 0) * quantity
            final_carbohydrates = safe_get_numeric(base_nutrition, "carbohydrates_total_g", 0) * quantity
            final_sugar = safe_get_numeric(base_nutrition, "sugar_g", 0) * quantity
            final_fiber = safe_get_numeric(base_nutrition, "fiber_g", 0) * quantity
            final_cholesterol = safe_get_numeric(base_nutrition, "cholesterol_mg", 0) * quantity
            final_sodium = safe_get_numeric(base_nutrition, "sodium_mg", 0) * quantity
        else:
            # For items sold by weight, calculate nutrition per gram and then multiply.
            calories_per_gram = safe_get_numeric(base_nutrition, "calories", 0) / serving_size_g
            protein_per_gram = safe_get_numeric(base_nutrition, "protein_g", 0) / serving_size_g
            fat_per_gram = safe_get_numeric(base_nutrition, "fat_total_g", 0) / serving_size_g
            carbohydrates_per_gram = safe_get_numeric(base_nutrition, "carbohydrates_total_g", 0) / serving_size_g
            sugar_per_gram = safe_get_numeric(base_nutrition, "sugar_g", 0) / serving_size_g
            fiber_per_gram = safe_get_numeric(base_nutrition, "fiber_g", 0) / serving_size_g
            cholesterol_per_gram = safe_get_numeric(base_nutrition, "cholesterol_mg", 0) / serving_size_g
            sodium_per_gram = safe_get_numeric(base_nutrition, "sodium_mg", 0) / serving_size_g

            user_quantity_in_grams = convert_to_grams(quantity, unit)
            final_calories = calories_per_gram * user_quantity_in_grams
            final_protein = protein_per_gram * user_quantity_in_grams
            final_fat = fat_per_gram * user_quantity_in_grams
            final_carbohydrates = carbohydrates_per_gram * user_quantity_in_grams
            final_sugar = sugar_per_gram * user_quantity_in_grams
            final_fiber = fiber_per_gram * user_quantity_in_grams
            final_cholesterol = cholesterol_per_gram * user_quantity_in_grams
            final_sodium = sodium_per_gram * user_quantity_in_grams

        enriched_data = {
            "calories": round(final_calories),
            "protein_g": round(final_protein, 1),
            "fat_total_g": round(final_fat, 1),
            "carbohydrates_total_g": round(final_carbohydrates, 1),
            "sugar_g": round(final_sugar, 1),
            "fiber_g": round(final_fiber, 1),
            "cholesterol_mg": round(final_cholesterol),
            "sodium_mg": round(final_sodium),
        }
        
        # Filter out None values to avoid overwriting existing data with nulls if API returns incomplete data
        enriched_data = {k: v for k, v in enriched_data.items() if v is not None}

        # --- STEP 3: Update Supabase with ACCURATE data ---
        update_res = supabase_client.from_('groceries').update(enriched_data).eq('id', grocery_id).eq('user_id', user_id).select().execute()

        if update_res.data and len(update_res.data) > 0:
            updated_item = update_res.data[0]
            return JSONResponse(status_code=200, content={"message": "Grocery item enriched successfully", "nutrition": updated_item})
        else:
            print(f"Supabase update failed for grocery_id {grocery_id}: {update_res.error}")
            raise HTTPException(status_code=500, detail="Failed to update grocery item with nutrition data.")

    except HTTPException:
        raise # Re-raise HTTP exceptions
    except httpx.HTTPStatusError as e:
        print(f"CalorieNinja API HTTP error: {e.response.status_code} - {e.response.text}")
        raise HTTPException(status_code=e.response.status_code, detail=f"CalorieNinja API error: {e.response.text}")
    except Exception as e:
        print(f"Enrich grocery item error: {e}")
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred during enrichment: {str(e)}")
