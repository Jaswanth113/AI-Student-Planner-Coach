#!/usr/bin/env python3

import os
import json
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

def check_current_plans():
    """Check all current learning plans in the database"""
    
    supabase = create_client(
        os.getenv("VITE_SUPABASE_URL"),
        os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    )
    
    # Get all learning plans
    plans_res = supabase.from_('learning_plans').select('*').execute()
    
    print(f"Found {len(plans_res.data)} learning plans:")
    
    for i, plan in enumerate(plans_res.data, 1):
        milestones = plan.get('weekly_milestones', [])
        milestone_count = len(milestones) if isinstance(milestones, list) else 0
        
        print(f"\n{i}. ID: {plan['id']}")
        print(f"   Topic: {plan['topic']}")
        print(f"   Duration: {plan['duration_months']} months")
        print(f"   Milestones: {milestone_count} weeks")
        print(f"   User ID: {plan['user_id']}")
        
        if milestone_count > 0 and isinstance(milestones, list):
            print(f"   Week titles:")
            for week in milestones:
                print(f"     - Week {week.get('week', '?')}: {week.get('title', 'No title')}")

if __name__ == "__main__":
    check_current_plans()
