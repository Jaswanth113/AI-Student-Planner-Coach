-- Add timezone-aware columns to tasks table
ALTER TABLE public.tasks 
ADD COLUMN due_date_utc TIMESTAMP WITH TIME ZONE,
ADD COLUMN due_date_local TIMESTAMP WITH TIME ZONE,
ADD COLUMN timezone TEXT DEFAULT 'Asia/Kolkata';

-- Update existing tasks to have the new timezone fields
UPDATE public.tasks 
SET 
  due_date_utc = due_date,
  due_date_local = due_date AT TIME ZONE 'Asia/Kolkata',
  timezone = 'Asia/Kolkata'
WHERE due_date IS NOT NULL;

-- Add timezone-aware columns to reminders table
ALTER TABLE public.reminders
ADD COLUMN due_date_utc TIMESTAMP WITH TIME ZONE,
ADD COLUMN due_date_local TIMESTAMP WITH TIME ZONE,
ADD COLUMN timezone TEXT DEFAULT 'Asia/Kolkata';

-- Update existing reminders to have the new timezone fields
UPDATE public.reminders
SET 
  due_date_utc = due_date,
  due_date_local = due_date AT TIME ZONE 'Asia/Kolkata',
  timezone = 'Asia/Kolkata'
WHERE due_date IS NOT NULL;

-- Add missing columns to commitments table for better integration
ALTER TABLE public.commitments
ADD COLUMN description TEXT,
ADD COLUMN attendees TEXT[],
ADD COLUMN link TEXT,
ADD COLUMN calendar_id TEXT,
ADD COLUMN recurring BOOLEAN DEFAULT false;

-- Update commitments type to include more options
ALTER TABLE public.commitments 
DROP CONSTRAINT IF EXISTS commitments_type_check;

ALTER TABLE public.commitments
ADD CONSTRAINT commitments_type_check 
CHECK (type IN ('meeting', 'call', 'appointment', 'event', 'deadline', 'personal', 'class', 'hackathon', 'gym', 'social', 'exam'));

-- Add missing columns to expenses table
ALTER TABLE public.expenses
ADD COLUMN description TEXT,
ADD COLUMN payment_method TEXT,
ADD COLUMN tags TEXT[];

-- Rename note to description for consistency and update existing data
UPDATE public.expenses SET description = note WHERE note IS NOT NULL;
ALTER TABLE public.expenses DROP COLUMN IF EXISTS note;

-- Update existing expenses with default category if missing
UPDATE public.expenses SET category = 'Other' WHERE category IS NULL OR category = '';
