import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// Enhanced Types based on the Supabase schema
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
  location?: string;
  created_at: string;
  user_id: string;
}

export interface Commitment {
  id: string;
  title: string;
  description?: string;
  type: string;
  start_time: string;
  end_time: string;
  location?: string;
  attendees?: string[];
  link?: string;
  calendar_id?: string;
  recurring?: boolean;
  reminder_minutes: number;
  created_at: string;
  user_id: string;
}

export interface Grocery {
  id: string;
  item_name: string;
  quantity: string;
  store?: string;
  estimated_price: number;
  bought: boolean;
  calories?: number;
  protein_g?: number;
  fat_total_g?: number;
  carbohydrates_total_g?: number;
  sugar_g?: number;
  fiber_g?: number;
  serving_size_g?: number;
  cholesterol_mg?: number;
  sodium_mg?: number;
  price?: number;
  unit?: string;
  created_at: string;
  user_id: string;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  description?: string;
  expense_date: string;
  payment_method?: string;
  tags?: string[];
  receipt_url?: string;
  created_at: string;
  user_id: string;
}

export interface Reminder {
  id: string;
  title: string;
  due_date?: string;
  due_date_utc?: string;
  due_date_local?: string;
  timezone?: string;
  category?: string;
  created_at: string;
  user_id: string;
}

interface DataContextType {
  // Data arrays
  tasks: Task[];
  commitments: Commitment[];
  groceries: Grocery[];
  expenses: Expense[];
  reminders: Reminder[];
  
  // Loading states
  loading: {
    tasks: boolean;
    commitments: boolean;
    groceries: boolean;
    expenses: boolean;
    reminders: boolean;
  };

  // Global refresh functions
  refetchTasks: () => Promise<void>;
  refetchCommitments: () => Promise<void>;
  refetchGroceries: () => Promise<void>;
  refetchExpenses: () => Promise<void>;
  refetchReminders: () => Promise<void>;
  refetchAll: () => Promise<void>;

  // CRUD functions for Tasks
  addTask: (taskData: Omit<Task, 'id' | 'created_at' | 'user_id'>) => Promise<{ data: any; error: any }>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<{ data: any; error: any }>;
  deleteTask: (id: string) => Promise<void>;

  // CRUD functions for Commitments
  addCommitment: (commitmentData: Omit<Commitment, 'id' | 'created_at' | 'user_id'>) => Promise<{ data: any; error: any }>;
  updateCommitment: (id: string, updates: Partial<Commitment>) => Promise<{ data: any; error: any }>;
  deleteCommitment: (id: string) => Promise<void>;

  // CRUD functions for Groceries
  addGrocery: (groceryData: Omit<Grocery, 'id' | 'created_at' | 'user_id'>) => Promise<{ data: any; error: any }>;
  updateGrocery: (id: string, updates: Partial<Grocery>) => Promise<{ data: any; error: any }>;
  deleteGrocery: (id: string) => Promise<void>;

  // CRUD functions for Expenses
  addExpense: (expenseData: Omit<Expense, 'id' | 'created_at' | 'user_id'>) => Promise<{ data: any; error: any }>;
  updateExpense: (id: string, updates: Partial<Expense>) => Promise<{ data: any; error: any }>;
  deleteExpense: (id: string) => Promise<void>;

  // CRUD functions for Reminders
  addReminder: (reminderData: Omit<Reminder, 'id' | 'created_at' | 'user_id'>) => Promise<{ data: any; error: any }>;
  updateReminder: (id: string, updates: Partial<Reminder>) => Promise<{ data: any; error: any }>;
  deleteReminder: (id: string) => Promise<void>;

  // AI-powered functions
  enrichGroceryItem: (groceryId: string, itemName: string, quantity: number, unit: string) => Promise<void>;

  // Utility for triggering refetch from external components
  refetchKey: number;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();

  // State for all data
  const [tasks, setTasks] = useState<Task[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [groceries, setGroceries] = useState<Grocery[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [refetchKey, setRefetchKey] = useState(0);

  // Loading states
  const [loading, setLoading] = useState({
    tasks: true,
    commitments: true,
    groceries: true,
    expenses: true,
    reminders: true,
  });

  // Trigger refetch from external components
  const triggerRefetch = useCallback(() => {
    setRefetchKey(prev => prev + 1);
  }, []);

  // Fetch functions
  const refetchTasks = useCallback(async () => {
    if (!user) return;
    
    setLoading(prev => ({ ...prev, tasks: true }));
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading tasks",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(prev => ({ ...prev, tasks: false }));
    }
  }, [user, toast]);

  const refetchCommitments = useCallback(async () => {
    if (!user) return;
    
    setLoading(prev => ({ ...prev, commitments: true }));
    try {
      const { data, error } = await supabase
        .from('commitments')
        .select('*')
        .eq('user_id', user.id)
        .order('start_time', { ascending: true });

      if (error) throw error;
      setCommitments(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading commitments",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(prev => ({ ...prev, commitments: false }));
    }
  }, [user, toast]);

  const refetchGroceries = useCallback(async () => {
    if (!user) return;
    
    setLoading(prev => ({ ...prev, groceries: true }));
    try {
      const { data, error } = await supabase
        .from('groceries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGroceries(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading groceries",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(prev => ({ ...prev, groceries: false }));
    }
  }, [user, toast]);

  const refetchExpenses = useCallback(async () => {
    if (!user) return;
    
    setLoading(prev => ({ ...prev, expenses: true }));
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .order('expense_date', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading expenses",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(prev => ({ ...prev, expenses: false }));
    }
  }, [user, toast]);

  const refetchReminders = useCallback(async () => {
    if (!user) return;
    
    setLoading(prev => ({ ...prev, reminders: true }));
    try {
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReminders(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading reminders",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(prev => ({ ...prev, reminders: false }));
    }
  }, [user, toast]);

  const refetchAll = useCallback(async () => {
    await Promise.all([
      refetchTasks(),
      refetchCommitments(),
      refetchGroceries(),
      refetchExpenses(),
      refetchReminders(),
    ]);
  }, [refetchTasks, refetchCommitments, refetchGroceries, refetchExpenses, refetchReminders]);

  // Load data when user changes
  useEffect(() => {
    if (user) {
      refetchAll();
    } else {
      // Clear data when user logs out
      setTasks([]);
      setCommitments([]);
      setGroceries([]);
      setExpenses([]);
      setReminders([]);
      setLoading({
        tasks: false,
        commitments: false,
        groceries: false,
        expenses: false,
        reminders: false,
      });
    }
  }, [user, refetchAll]);


  // Supabase Realtime Subscription for Tasks, Groceries, and Reminders
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('public:tables');

    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'tasks' },
      (payload) => {
        console.log('New task received!', payload.new);
        setTasks((currentTasks) => [...currentTasks, payload.new as Task]);
        toast({
          title: "New Task Added!",
          description: `"${(payload.new as Task).title}" has been created.`,
        });
      }
    ).on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'groceries' },
      (payload) => {
        console.log('New grocery received!', payload.new);
        setGroceries((currentGroceries) => [...currentGroceries, payload.new as Grocery]);
        toast({
          title: "New Grocery Item Added!",
          description: `"${(payload.new as Grocery).item_name}" has been added to your list.`,
        });
      }
    ).on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'reminders' },
      (payload) => {
        console.log('New reminder received!', payload.new);
        setReminders((currentReminders) => [...currentReminders, payload.new as Reminder]);
        toast({
          title: "New Reminder Set!",
          description: `"${(payload.new as Reminder).title}" has been set.`,
        });
      }
    ).subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);


  // CRUD operations for Tasks
  const addTask = useCallback(async (taskData: Omit<Task, 'id' | 'created_at' | 'user_id'>) => {
    if (!user) return { data: null, error: new Error('User not authenticated') };

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([{ ...taskData, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;

      setTasks(prev => [data, ...prev]);
      toast({
        title: "Task added",
        description: "Your task has been saved successfully."
      });
      
      return { data, error: null };
    } catch (error: any) {
      toast({
        title: "Error adding task",
        description: error.message,
        variant: "destructive"
      });
      return { data: null, error };
    }
  }, [user, toast]);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setTasks(prev => prev.map(task => task.id === id ? data : task));
      return { data, error: null };
    } catch (error: any) {
      toast({
        title: "Error updating task",
        description: error.message,
        variant: "destructive"
      });
      return { data: null, error };
    }
  }, [toast]);

  const deleteTask = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTasks(prev => prev.filter(task => task.id !== id));
      toast({
        title: "Task deleted",
        description: "Task has been removed successfully."
      });
    } catch (error: any) {
      toast({
        title: "Error deleting task",
        description: error.message,
        variant: "destructive"
      });
    }
  }, [toast]);

  // CRUD operations for Commitments
  const addCommitment = useCallback(async (commitmentData: Omit<Commitment, 'id' | 'created_at' | 'user_id'>) => {
    if (!user) return { data: null, error: new Error('User not authenticated') };

    try {
      const { data, error } = await supabase
        .from('commitments')
        .insert([{ ...commitmentData, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;

      setCommitments(prev => [...prev, data].sort((a, b) => 
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      ));
      toast({
        title: "Commitment added",
        description: "Your commitment has been saved successfully."
      });
      
      return { data, error: null };
    } catch (error: any) {
      toast({
        title: "Error adding commitment",
        description: error.message,
        variant: "destructive"
      });
      return { data: null, error };
    }
  }, [user, toast]);

  const updateCommitment = useCallback(async (id: string, updates: Partial<Commitment>) => {
    try {
      const { data, error } = await supabase
        .from('commitments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setCommitments(prev => prev.map(comm => comm.id === id ? data : comm));
      return { data, error: null };
    } catch (error: any) {
      toast({
        title: "Error updating commitment",
        description: error.message,
        variant: "destructive"
      });
      return { data: null, error };
    }
  }, [toast]);

  const deleteCommitment = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('commitments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCommitments(prev => prev.filter(comm => comm.id !== id));
      toast({
        title: "Commitment deleted",
        description: "Commitment has been removed successfully."
      });
    } catch (error: any) {
      toast({
        title: "Error deleting commitment",
        description: error.message,
        variant: "destructive"
      });
    }
  }, [toast]);

  // CRUD operations for Groceries
  const addGrocery = useCallback(async (groceryData: Omit<Grocery, 'id' | 'created_at' | 'user_id'>) => {
    if (!user) return { data: null, error: new Error('User not authenticated') };

    try {
      const { data, error } = await supabase
        .from('groceries')
        .insert([{ ...groceryData, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;

      setGroceries(prev => [data, ...prev]);
      toast({
        title: "Item added",
        description: "Grocery item has been added to your list."
      });
      
      return { data, error: null };
    } catch (error: any) {
      toast({
        title: "Error adding grocery item",
        description: error.message,
        variant: "destructive"
      });
      return { data: null, error };
    }
  }, [user, toast]);

  const updateGrocery = useCallback(async (id: string, updates: Partial<Grocery>) => {
    try {
      const { data, error } = await supabase
        .from('groceries')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setGroceries(prev => prev.map(item => item.id === id ? data : item));
      return { data, error: null };
    } catch (error: any) {
      toast({
        title: "Error updating grocery item",
        description: error.message,
        variant: "destructive"
      });
      return { data: null, error };
    }
  }, [toast]);

  const deleteGrocery = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('groceries')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setGroceries(prev => prev.filter(item => item.id !== id));
      toast({
        title: "Item removed",
        description: "Grocery item has been removed from your list."
      });
    } catch (error: any) {
      toast({
        title: "Error deleting grocery item",
        description: error.message,
        variant: "destructive"
      });
    }
  }, [toast]);

  // CRUD operations for Expenses
  const addExpense = useCallback(async (expenseData: Omit<Expense, 'id' | 'created_at' | 'user_id'>) => {
    if (!user) return { data: null, error: new Error('User not authenticated') };

    try {
      const { data, error } = await supabase
        .from('expenses')
        .insert([{ ...expenseData, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;

      setExpenses(prev => [data, ...prev]);
      toast({
        title: "Expense added",
        description: "Your expense has been recorded successfully."
      });
      
      return { data, error: null };
    } catch (error: any) {
      toast({
        title: "Error adding expense",
        description: error.message,
        variant: "destructive"
      });
      return { data: null, error };
    }
  }, [user, toast]);

  const updateExpense = useCallback(async (id: string, updates: Partial<Expense>) => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setExpenses(prev => prev.map(expense => expense.id === id ? data : expense));
      return { data, error: null };
    } catch (error: any) {
      toast({
        title: "Error updating expense",
        description: error.message,
        variant: "destructive"
      });
      return { data: null, error };
    }
  }, [toast]);

  const deleteExpense = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setExpenses(prev => prev.filter(expense => expense.id !== id));
      toast({
        title: "Expense deleted",
        description: "Expense has been removed successfully."
      });
    } catch (error: any) {
      toast({
        title: "Error deleting expense",
        description: error.message,
        variant: "destructive"
      });
    }
  }, [toast]);

  // CRUD operations for Reminders
  const addReminder = useCallback(async (reminderData: Omit<Reminder, 'id' | 'created_at' | 'user_id'>) => {
    if (!user) return { data: null, error: new Error('User not authenticated') };

    try {
      const { data, error } = await supabase
        .from('reminders')
        .insert([{ ...reminderData, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;

      setReminders(prev => [data, ...prev]);
      toast({
        title: "Reminder added",
        description: "Your reminder has been saved successfully."
      });
      
      return { data, error: null };
    } catch (error: any) {
      toast({
        title: "Error adding reminder",
        description: error.message,
        variant: "destructive"
      });
      return { data: null, error };
    }
  }, [user, toast]);

  const updateReminder = useCallback(async (id: string, updates: Partial<Reminder>) => {
    try {
      const { data, error } = await supabase
        .from('reminders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setReminders(prev => prev.map(reminder => reminder.id === id ? data : reminder));
      return { data, error: null };
    } catch (error: any) {
      toast({
        title: "Error updating reminder",
        description: error.message,
        variant: "destructive"
      });
      return { data: null, error };
    }
  }, [toast]);

  const deleteReminder = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setReminders(prev => prev.filter(reminder => reminder.id !== id));
      toast({
        title: "Reminder deleted",
        description: "Reminder has been removed successfully."
      });
    } catch (error: any) {
      toast({
        title: "Error deleting reminder",
        description: error.message,
        variant: "destructive"
      });
    }
  }, [toast]);

  // AI-powered functions
  const enrichGroceryItem = useCallback(async (groceryId: string, itemName: string, quantity: number, unit: string) => {
    if (!user) return;

    try {
      const response = await fetch('/api/enrich-grocery-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_name: itemName,
          quantity,
          unit,
          grocery_id: groceryId,
          user_id: user.id,
        }),
      });

      if (!response.ok) {
        console.warn('Failed to enrich grocery item');
        return;
      }

      const enrichedItem = await response.json();
      setGroceries(prev => prev.map(item => item.id === groceryId ? enrichedItem : item));
    } catch (error) {
      console.error('Error enriching grocery item:', error);
    }
  }, [user]);

  const value: DataContextType = {
    // Data arrays
    tasks,
    commitments,
    groceries,
    expenses,
    reminders,
    
    // Loading states
    loading,

    // Refresh functions
    refetchTasks,
    refetchCommitments,
    refetchGroceries,
    refetchExpenses,
    refetchReminders,
    refetchAll,

    // CRUD functions
    addTask,
    updateTask,
    deleteTask,
    addCommitment,
    updateCommitment,
    deleteCommitment,
    addGrocery,
    updateGrocery,
    deleteGrocery,
    addExpense,
    updateExpense,
    deleteExpense,
    addReminder,
    updateReminder,
    deleteReminder,

    // AI functions
    enrichGroceryItem,

    // Utility
    refetchKey,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
