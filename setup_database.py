#!/usr/bin/env python3
"""
Database setup script for learning project
This script ensures all required tables exist with proper structure
"""

import os
import sys
from supabase import create_client
from dotenv import load_dotenv

def setup_database():
    """Initialize database tables if they don't exist"""
    
    load_dotenv()
    
    # Get environment variables
    supabase_url = os.getenv('VITE_SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    if not supabase_url or not supabase_key:
        print("Error: Missing Supabase environment variables")
        print("Please ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env file")
        return False
    
    try:
        # Initialize Supabase client
        supabase = create_client(supabase_url, supabase_key)
        print("✅ Connected to Supabase successfully")
        
        # Check if learning_plans table exists by trying to query it
        try:
            response = supabase.from_('learning_plans').select('count', count='exact').execute()
            print(f"✅ learning_plans table exists with {response.count} records")
        except Exception as e:
            print(f"❌ learning_plans table issue: {e}")
            print("The table might not exist or have incorrect permissions")
            return False
        
        # Check if commitments table exists
        try:
            response = supabase.from_('commitments').select('count', count='exact').execute()
            print(f"✅ commitments table exists with {response.count} records")
        except Exception as e:
            print(f"❌ commitments table issue: {e}")
            return False
        
        # Check if tasks table exists
        try:
            response = supabase.from_('tasks').select('count', count='exact').execute()
            print(f"✅ tasks table exists with {response.count} records")
        except Exception as e:
            print(f"❌ tasks table issue: {e}")
            return False
        
        print("\n✅ All required tables verified successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Database setup failed: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Setting up database...")
    success = setup_database()
    if success:
        print("\n🎉 Database setup completed successfully!")
    else:
        print("\n💥 Database setup failed. Please check your configuration.")
        sys.exit(1)
