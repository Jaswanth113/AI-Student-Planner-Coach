CREATE TABLE learning_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  topic TEXT NOT NULL,
  duration_months INT NOT NULL,
  weekly_milestones JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE learning_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own learning plans." ON learning_plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own learning plans." ON learning_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own learning plans." ON learning_plans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own learning plans." ON learning_plans
  FOR DELETE USING (auth.uid() = user_id);
