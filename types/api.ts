export interface TaskInput {
  text: string;
  user_id: string;
}

export interface TaskData {
  title: string;
  due_date: string | null;
  category: string;
  user_id: string;
  status: 'Inbox' | 'Planned' | 'Done';
  priority: 1 | 2 | 3; // 1: High, 2: Medium, 3: Low
  created_at: string;
  description?: string;
  tags?: string[];
  estimate?: number; // in minutes
}

export interface HuggingFaceResponse {
  generated_text: string;
  // Add other fields from Hugging Face API response if needed
}

export interface Commitment {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location?: string;
  type: 'class' | 'hackathon' | 'gym' | 'social' | 'exam';
  reminder_minutes: number;
  created_at: string;
  user_id: string;
  // Optional fields for enhanced functionality
  description?: string;
  attendees?: string[];
  link?: string;
  recurring?: boolean;
  priority?: 'urgent' | 'high' | 'medium' | 'low';
}

export interface ApiError {
  error: string;
  details?: string;
}
