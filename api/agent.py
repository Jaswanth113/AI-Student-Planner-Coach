# api/agent.py (Definitive, Final Python Master Agent with Pendulum)

import os
import json
from fastapi import FastAPI, Request, HTTPException
from supabase import create_client, Client
from langchain_groq import ChatGroq
import pendulum # Use the powerful Pendulum library for dates and times
from dotenv import load_dotenv

# --- Initialize FastAPI App ---
app = FastAPI()

# --- Helper to load environment variables and initialize clients ---
def get_clients():
    load_dotenv()
    
    groq_api_key = os.getenv("GROQ_API_KEY")
    supabase_url = os.getenv("VITE_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not all([groq_api_key, supabase_url, supabase_key]):
        raise Exception("Server environment is not configured correctly. Missing required API keys.")

    llm = ChatGroq(api_key=groq_api_key, model="mixtral-8x7b-32768", temperature=0.2)
    supabase = create_client(supabase_url, supabase_key)
    return llm, supabase

# --- The Main API Endpoint ---
@app.post("/api/agent")
async def handle_agent_request(request: Request):
    try:
        body = await request.json()
        user_input = body.get("userInput")
        user_id = body.get("userId")

        if not user_input or not user_id:
            raise HTTPException(status_code=400, detail="Missing userInput or userId.")

        llm, supabase = get_clients()

        # Fetch User Context for Personalization
        profile_res = supabase.from_('profiles').select('*').eq('id', user_id).single().execute()
        tasks_res = supabase.from_('tasks').select('title, due_date_utc, status').eq('user_id', user_id).limit(5).execute()
        
        # --- THE FIX IS HERE: Using Pendulum for clean, modern date handling ---
        now_ist = pendulum.now('Asia/Kolkata')
        today_in_ist = now_ist.format('dddd, MMMM D, YYYY') # e.g., "Saturday, August 30, 2025"

        # Construct the consolidated prompt
        system_prompt = f"""
          You are an expert AI Life Planner assistant. Your job is to analyze the user's message and respond with a single, valid JSON object that represents their intent.
          Today's Date: {today_in_ist}. User's Profile: {json.dumps(profile_res.data)}. User's Tasks: {json.dumps(tasks_res.data)}.

          Based on the user's message: "{user_input}", determine the intent and structure your response into ONE of the following JSON formats.

          1. For creating an item:
             {{ "intent": "create_item", "type": "task" | "grocery" | "expense", "data": {{ /* all extracted fields */ }} }}

          2. For generating a learning plan:
             {{ "intent": "generate_learning_plan", "plan_details": {{ "topic": "...", "duration_text": "...", "weekly_milestones": [...] }} }}

          3. For answering a question:
             {{ "intent": "answer_question", "answer": "Your conversational answer here." }}
        """

        # A single, efficient AI call
        response = await llm.ainvoke(system_prompt)
        # Robustly find and parse the JSON from the AI's response
        json_str_match = response.content.find('{')
        if json_str_match == -1:
            raise Exception("AI response did not contain valid JSON.")
        parsed_response = json.loads(response.content[json_str_match:])


        # Execute the Intent
        intent = parsed_response.get("intent")
        if intent == "create_item":
            item_data = parsed_response.get("data", {})
            item_data["user_id"] = user_id
            table_name = f"{parsed_response.get('type')}s"
            
            # Handle date conversion for tasks using Pendulum
            if parsed_response.get('type') == 'task' and item_data.get('due_absolute_iso'):
                local_dt = pendulum.parse(item_data['due_absolute_iso'], tz='Asia/Kolkata')
                item_data['due_date_utc'] = local_dt.in_timezone('UTC').to_iso8601_string()
                item_data['due_date_local'] = local_dt.to_iso8601_string()
                item_data['timezone'] = 'Asia/Kolkata'
                del item_data['due_absolute_iso']

            insert_res = supabase.from_(table_name).insert(item_data).execute()
            if insert_res.data:
                return {"type": "creation_success", "item": insert_res.data[0]}
            else:
                raise HTTPException(status_code=500, detail=f"Supabase insert error: {insert_res.error.message if insert_res.error else 'Unknown error'}")

        elif intent == "answer_question":
            return {"type": "answer", "text": parsed_response.get("answer")}
        
        # ... (Add logic for 'generate_learning_plan' here)

        else:
            raise HTTPException(status_code=400, detail="Unknown intent from AI.")

    except Exception as e:
        print(f"Master Agent Error: {e}")
        # Return a JSON-formatted error
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")