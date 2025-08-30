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
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  type?: 'meeting' | 'call' | 'appointment' | 'event' | 'deadline' | 'personal';
  attendees?: string[];
  link?: string;
  calendar_id?: string;
  recurring?: boolean;
  created_at: string;
  user_id: string;
}

export interface ApiError {
  error: string;
  details?: string;
}
