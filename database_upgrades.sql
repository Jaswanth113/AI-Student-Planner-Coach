-- AI Life Planner Database Upgrades for Goal-Oriented Features
-- Run these SQL commands in your Supabase SQL editor

-- 1. Create the enhanced goals table
CREATE TABLE goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal_type VARCHAR(50) NOT NULL, -- 'weight_loss', 'budget_eating', 'muscle_gain', 'healthy_eating', 'save_money', etc.
    title VARCHAR(255) NOT NULL, -- User-friendly title like "My Weight Loss Journey"
    description TEXT, -- Optional detailed description
    target_value DECIMAL(10,2), -- Target weight, budget amount, etc.
    target_unit VARCHAR(20), -- 'kg', 'rupees', 'calories', etc.
    current_value DECIMAL(10,2) DEFAULT 0, -- Current progress value
    start_date DATE NOT NULL,
    end_date DATE, -- Optional end date
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed', 'paused'
    metadata JSONB, -- Additional goal-specific data like target calories, macros, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add goal_id foreign key to groceries table
ALTER TABLE groceries 
ADD COLUMN goal_id UUID REFERENCES goals(id) ON DELETE SET NULL;

-- 3. Add goal_id foreign key to expenses table  
ALTER TABLE expenses 
ADD COLUMN goal_id UUID REFERENCES goals(id) ON DELETE SET NULL;

-- 4. Create indexes for better performance
CREATE INDEX idx_goals_user_id ON goals(user_id);
CREATE INDEX idx_goals_status ON goals(status);
CREATE INDEX idx_groceries_goal_id ON groceries(goal_id);
CREATE INDEX idx_expenses_goal_id ON expenses(goal_id);

-- 5. Create a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_goals_updated_at 
    BEFORE UPDATE ON goals 
    FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();

-- 6. Add Row Level Security (RLS) policies for goals table
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see and modify their own goals
CREATE POLICY "Users can view their own goals" ON goals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals" ON goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals" ON goals
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals" ON goals
    FOR DELETE USING (auth.uid() = user_id);

-- 7. Insert some sample goal types for reference (optional)
INSERT INTO goals (user_id, goal_type, title, description, target_value, target_unit, start_date, end_date, metadata) VALUES
-- Note: Replace 'your-user-id-here' with an actual user ID from your users table for testing
-- ('your-user-id-here', 'weight_loss', 'Lose 10 kg in 6 months', 'Healthy weight loss journey with balanced nutrition', 65.0, 'kg', CURRENT_DATE, CURRENT_DATE + INTERVAL '6 months', '{"target_calories": 1800, "target_protein": 120}'),
-- ('your-user-id-here', 'budget_eating', 'Monthly Grocery Budget', 'Stay within ₹5000 monthly grocery budget while eating healthy', 5000.0, 'rupees', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 month', '{"budget_type": "monthly", "categories": ["groceries", "dining"]}');

-- Uncomment and modify the above INSERT statements with your actual user ID for testing
