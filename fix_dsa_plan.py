#!/usr/bin/env python3

import os
import json
import asyncio
from supabase import create_client
from langchain_groq import ChatGroq
from dotenv import load_dotenv

load_dotenv()

async def fix_dsa_learning_plan():
    """Fix the existing DSA learning plan to have 8 weeks instead of 1"""
    
    # Initialize clients
    supabase = create_client(
        os.getenv("VITE_SUPABASE_URL"),
        os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    )
    
    llm = ChatGroq(
        api_key=os.getenv("GROQ_API_KEY"), 
        model="llama-3.1-8b-instant", 
        temperature=0.2
    )
    
    # Find the DSA learning plan
    plans_res = supabase.from_('learning_plans').select('*').eq('topic', 'DSA').execute()
    
    if not plans_res.data:
        print("No DSA learning plan found")
        return
    
    dsa_plan = plans_res.data[0]
    plan_id = dsa_plan['id']
    user_id = dsa_plan['user_id']
    
    print(f"Found DSA plan: {dsa_plan['topic']}")
    print(f"Current milestones: {len(dsa_plan.get('weekly_milestones', []))}")
    
    # Generate 8 weeks of DSA learning milestones using the specific DSA prompt
    prompt = """You are an expert computer science educator specializing in Data Structures and Algorithms (DSA). 
    Create a comprehensive, week-by-week DSA mastery plan for "DSA" over "2 months". The plan MUST contain exactly 8 weeks.
    
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

    Cover these core DSA areas progressively over 8 weeks:
    1. Complexity Analysis & Big-O
    2. Arrays & Strings
    3. Linked Lists
    4. Stacks & Queues
    5. Recursion & Backtracking
    6. Trees & Graphs
    7. Sorting & Searching
    8. Dynamic Programming
    
    Each week should include:
    - Theoretical concepts
    - Hands-on implementation
    - Problem-solving practice
    - Real-world applications
    - Common interview questions
    
    Return ONLY the JSON array with no additional text, markdown formatting, or explanations.
    """
    
    try:
        response = await llm.ainvoke(prompt)
        generated_text = response.content.strip()
        
        # Clean the response
        cleaned_text = generated_text.strip()
        if cleaned_text.startswith('```json'):
            cleaned_text = cleaned_text[7:]
        elif cleaned_text.startswith('```'):
            cleaned_text = cleaned_text[3:]
        if cleaned_text.endswith('```'):
            cleaned_text = cleaned_text[:-3]
        cleaned_text = cleaned_text.strip()
        
        print(f"DEBUG: Generated text (first 500 chars): {cleaned_text[:500]}...")
        
        # Parse the JSON
        milestones = json.loads(cleaned_text)
        
        print(f"Generated {len(milestones)} milestones")
        
        # Show the week titles
        for week in milestones:
            print(f"  Week {week.get('week')}: {week.get('title')}")
        
        # Update the learning plan in database
        update_data = {
            'weekly_milestones': milestones,
            'duration_months': 2
        }
        
        update_res = supabase.from_('learning_plans').update(update_data).eq('id', plan_id).execute()
        
        if update_res.data:
            print("✅ Successfully updated DSA learning plan with 8 weeks of milestones!")
            print(f"Plan ID: {plan_id}")
        else:
            print(f"❌ Failed to update plan: {update_res.error}")
            
    except Exception as e:
        print(f"❌ Error generating milestones: {e}")

if __name__ == "__main__":
    asyncio.run(fix_dsa_learning_plan())
