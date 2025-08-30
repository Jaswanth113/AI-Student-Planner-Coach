import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/hooks/use-toast';
import { Commitment } from '../../types/api';

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: number;
  estimate: number;
  due_date?: string;
  due_date_utc?: string;
  due_date_local?: string;
  timezone?: string;
  tags: string[];
  status: 'Inbox' | 'Planned' | 'Done';
  created_at: string;
}


export interface Grocery {
  id: string;
  item_name: string;
  quantity: string;
  store?: string;
  estimated_price: number;
  bought: boolean;
  created_at: string;
  calories?: number;
  protein_g?: number;
  fat_total_g?: number;
  carbohydrates_total_g?: number;
  // Add other nutrition fields as needed for detailed display
  sugar_g?: number;
  fiber_g?: number;
  serving_size_g?: number;
  cholesterol_mg?: number;
  sodium_mg?: number;
  price?: number; // New budgeting field
}

export interface FoodCatalogItem {
  id: string;
  item_name: string;
  category: string;
  created_at: string;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  description?: string;
  expense_date: string; // Changed from 'date' to 'expense_date'
  payment_method?: string;
  tags?: string[];
  receipt_url?: string;
  created_at: string;
}

export interface Reminder {
  id: string;
  title: string;
  due_date: string | null;
  due_date_utc?: string;
  due_date_local?: string;
  timezone?: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  name?: string;
  email?: string;
  avatar_url?: string;
  timezone: string;
  default_study_duration: number;
  sleep_window_start: string;
  sleep_window_end: string;
  created_at: string;
}

// Tasks hook
export const useTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const { refetchKey } = useData();

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error loading tasks",
        description: error.message,
        variant: "destructive"
      });
    } else {
      setTasks((data || []) as Task[]);
    }
    setLoading(false);
  }, [user, refetchKey]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks, refetchKey]);

  const addTask = async (taskData: Omit<Task, 'id' | 'created_at'>) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('tasks')
      .insert([{ ...taskData, user_id: user.id }])
      .select()
      .single();

    if (error) {
      toast({
        title: "Error adding task",
        description: error.message,
        variant: "destructive"
      });
    } else {
      setTasks(prev => [data as Task, ...prev]);
      toast({
        title: "Task added",
        description: "Your task has been saved successfully."
      });
    }
    return { data, error };
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      toast({
        title: "Error updating task",
        description: error.message,
        variant: "destructive"
      });
    } else {
      setTasks(prev => prev.map(task => task.id === id ? data as Task : task));
    }
    return { data, error };
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error deleting task",
        description: error.message,
        variant: "destructive"
      });
    } else {
      setTasks(prev => prev.filter(task => task.id !== id));
      toast({
        title: "Task deleted",
        description: "Task has been removed successfully."
      });
    }
  };

  return { tasks, loading, addTask, updateTask, deleteTask, refetch: fetchTasks };
};

// Commitments hook
export const useCommitments = () => {
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const { refetchKey } = useData();

  const fetchCommitments = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('commitments')
      .select('*')
      .eq('user_id', user.id)
      .order('start_time', { ascending: true });

    if (error) {
      toast({
        title: "Error loading commitments",
        description: error.message,
        variant: "destructive"
      });
    } else {
      setCommitments((data || []) as Commitment[]);
    }
    setLoading(false);
  }, [user, refetchKey]);

  useEffect(() => {
    fetchCommitments();
  }, [fetchCommitments, refetchKey]);

  const addCommitment = async (commitmentData: Omit<Commitment, 'id' | 'created_at'>) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('commitments')
      .insert([{ ...commitmentData, user_id: user.id }])
      .select()
      .single();

    if (error) {
      toast({
        title: "Error adding commitment",
        description: error.message,
        variant: "destructive"
      });
    } else {
      setCommitments(prev => [...prev, data as Commitment].sort((a, b) => 
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      ));
      toast({
        title: "Commitment added",
        description: "Your commitment has been saved successfully."
      });
    }
    return { data, error };
  };

  const updateCommitment = async (id: string, updates: Partial<Commitment>) => {
    const { data, error } = await supabase
      .from('commitments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      toast({
        title: "Error updating commitment",
        description: error.message,
        variant: "destructive"
      });
    } else {
      setCommitments(prev => prev.map(comm => comm.id === id ? data as Commitment : comm));
    }
    return { data, error };
  };

  const deleteCommitment = async (id: string) => {
    const { error } = await supabase
      .from('commitments')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error deleting commitment",
        description: error.message,
        variant: "destructive"
      });
    } else {
      setCommitments(prev => prev.filter(comm => comm.id !== id));
      toast({
        title: "Commitment deleted",
        description: "Commitment has been removed successfully."
      });
    }
  };

  return { commitments, loading, addCommitment, updateCommitment, deleteCommitment, refetch: fetchCommitments };
};

// Groceries hook
export const useGroceries = () => {
  const [groceries, setGroceries] = useState<Grocery[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const { refetchKey } = useData();

  const fetchGroceries = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('groceries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error loading groceries",
        description: error.message,
        variant: "destructive"
      });
    } else {
      setGroceries(data || []);
    }
    setLoading(false);
  }, [user, refetchKey]);

  useEffect(() => {
    fetchGroceries();
  }, [fetchGroceries, refetchKey]);

  const addGrocery = async (groceryData: Omit<Grocery, 'id' | 'created_at'>) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('groceries')
      .insert([{ ...groceryData, user_id: user.id }])
      .select()
      .single();

    if (error) {
      toast({
        title: "Error adding grocery item",
        description: error.message,
        variant: "destructive"
      });
    } else {
      setGroceries(prev => [data, ...prev]);
      toast({
        title: "Item added",
        description: "Grocery item has been added to your list."
      });
    }
    return { data, error };
  };

  const updateGrocery = async (id: string, updates: Partial<Grocery>) => {
    const { data, error } = await supabase
      .from('groceries')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      toast({
        title: "Error updating grocery item",
        description: error.message,
        variant: "destructive"
      });
    } else {
      setGroceries(prev => prev.map(item => item.id === id ? data : item));
    }
    return { data, error };
  };

  const deleteGrocery = async (id: string) => {
    const { error } = await supabase
      .from('groceries')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error deleting grocery item",
        description: error.message,
        variant: "destructive"
      });
    } else {
      setGroceries(prev => prev.filter(item => item.id !== id));
      toast({
        title: "Item removed",
        description: "Grocery item has been removed from your list."
      });
    }
  };

  return { groceries, loading, addGrocery, updateGrocery, deleteGrocery, refetch: fetchGroceries };
};

// Food Catalog hook
export const useFoodCatalog = () => {
  const [catalog, setCatalog] = useState<FoodCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth(); // Assuming catalog is user-specific or public but fetched via user context
  const { toast } = useToast();
  const { refetchKey } = useData(); // Use refetchKey to trigger re-fetches if needed

  const fetchCatalog = useCallback(async () => {
    // If catalog is public, user check might not be strictly necessary, but good practice
    // if there's any RLS or user-specific filtering. For now, assuming public.
    // if (!user) return; 
    
    const { data, error } = await supabase
      .from('food_catalog')
      .select('*')
      .order('category', { ascending: true })
      .order('item_name', { ascending: true });

    if (error) {
      toast({
        title: "Error loading food catalog",
        description: error.message,
        variant: "destructive"
      });
    } else {
      setCatalog((data || []) as FoodCatalogItem[]);
    }
    setLoading(false);
  }, [refetchKey, toast]); // Removed user from dependency as catalog is assumed public

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog, refetchKey]);

  return { catalog, loading, refetch: fetchCatalog };
};


// Reminders hook
export const useReminders = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const { refetchKey } = useData();

  const fetchReminders = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error loading reminders",
        description: error.message,
        variant: "destructive"
      });
    } else {
      setReminders((data || []) as Reminder[]);
    }
    setLoading(false);
  }, [user, refetchKey, toast]);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders, refetchKey]);

  const addReminder = async (reminderData: Omit<Reminder, 'id' | 'created_at'>) => {
    if (!user) return { data: null, error: new Error('User not authenticated') };

    const { data, error } = await supabase
      .from('reminders')
      .insert([{ ...reminderData, user_id: user.id }])
      .select()
      .single();

    if (error) {
      toast({
        title: "Error adding reminder",
        description: error.message,
        variant: "destructive"
      });
    } else if (data) {
      setReminders(prev => [data as Reminder, ...prev]);
      toast({
        title: "Reminder added",
        description: "Your reminder has been saved successfully."
      });
    }
    return { data, error };
  };

  const updateReminder = async (id: string, updates: Partial<Reminder>) => {
    const { data, error } = await supabase
      .from('reminders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      toast({
        title: "Error updating reminder",
        description: error.message,
        variant: "destructive"
      });
    } else if (data) {
      setReminders(prev => prev.map(reminder => reminder.id === id ? data as Reminder : reminder));
    }
    return { data, error };
  };

  const deleteReminder = async (id: string) => {
    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error deleting reminder",
        description: error.message,
        variant: "destructive"
      });
    } else {
      setReminders(prev => prev.filter(reminder => reminder.id !== id));
      toast({
        title: "Reminder deleted",
        description: "Reminder has been removed successfully."
      });
    }
  };

  return { reminders, loading, addReminder, updateReminder, deleteReminder, refetch: fetchReminders };
};

// Expenses hook
export const useExpenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const { refetchKey } = useData();

  const fetchExpenses = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (error) {
      toast({
        title: "Error loading expenses",
        description: error.message,
        variant: "destructive"
      });
    } else {
      setExpenses(data || []);
    }
    setLoading(false);
  }, [user, toast, refetchKey]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses, refetchKey]);

  const addExpense = async (expenseData: Omit<Expense, 'id' | 'created_at'>) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('expenses')
      .insert([{ ...expenseData, user_id: user.id }])
      .select()
      .single();

    if (error) {
      toast({
        title: "Error adding expense",
        description: error.message,
        variant: "destructive"
      });
    } else {
      setExpenses(prev => [data, ...prev]);
      toast({
        title: "Expense added",
        description: "Your expense has been recorded successfully."
      });
    }
    return { data, error };
  };

  const updateExpense = async (id: string, updates: Partial<Expense>) => {
    const { data, error } = await supabase
      .from('expenses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      toast({
        title: "Error updating expense",
        description: error.message,
        variant: "destructive"
      });
    } else {
      setExpenses(prev => prev.map(exp => exp.id === id ? data : exp));
    }
    return { data, error };
  };

  const deleteExpense = async (id: string) => {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error deleting expense",
        description: error.message,
        variant: "destructive"
      });
    } else {
      setExpenses(prev => prev.filter(exp => exp.id !== id));
      toast({
        title: "Expense deleted",
        description: "Expense has been removed successfully."
      });
    }
  };

  return { expenses, loading, addExpense, updateExpense, deleteExpense, refetch: fetchExpenses };
};

// User profile hook
export const useUserProfile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error loading profile:', error);
    } else {
      setProfile(data);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive"
      });
    } else {
      setProfile(data);
      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully."
      });
    }
    return { data, error };
  };

  return { profile, loading, updateProfile, refetch: fetchProfile };
};

// New interface for the 'profiles' table
export interface ProfileData {
  id: string;
  updated_at?: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  website?: string;
}

// User profile hook (for public profiles table)
export const useProfile = () => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found, which is fine for a new user
      console.error('Error loading profile:', error);
      toast({
        title: "Error loading profile",
        description: error.message,
        variant: "destructive"
      });
    } else if (data) {
      setProfile(data as ProfileData);
    } else {
      setProfile(null); // No profile found
    }
    setLoading(false);
  }, [user, toast]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const upsertProfile = async (updates: Partial<ProfileData>) => {
    if (!user) {
      toast({ title: 'You must be logged in.', variant: 'destructive' });
      return { data: null, error: new Error('User not authenticated') };
    }

    const { data, error } = await supabase
      .from('profiles')
      .upsert({ ...updates, id: user.id, updated_at: new Date().toISOString() })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive"
      });
    } else {
      setProfile(data as ProfileData);
      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully."
      });
    }
    return { data, error };
  };

  return { profile, loading, upsertProfile, refetch: fetchProfile };
};
