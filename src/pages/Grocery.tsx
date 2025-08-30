import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import BrowseCatalogModal from '@/components/modals/BrowseCatalogModal';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Target, Bot, ShoppingCart, Utensils, Lightbulb } from 'lucide-react';

// Define types for grocery items
interface GroceryItem {
  id: string;
  user_id: string;
  item_name: string;
  quantity: number;
  bought: boolean;
  price: number;
  unit: string;
  goal_id?: string; // Link to active goal
  calories?: number;
  protein_g?: number;
  fat_total_g?: number;
  carbohydrates_total_g?: number;
  sugar_g?: number;
  fiber_g?: number;
  serving_size_g?: number;
  cholesterol_mg?: number;
  sodium_mg?: number;
}

// Interface for goals
interface Goal {
  id: string;
  goal_type: string;
  title: string;
  description?: string;
  target_value?: number;
  target_unit?: string;
  current_value: number;
  start_date: string;
  end_date?: string;
  status: 'active' | 'completed' | 'paused';
  metadata?: any;
}

// Context for managing grocery data
interface GroceryContextType {
  groceries: GroceryItem[];
  refetchGroceries: () => Promise<void>;
  updateGroceryItem: (id: string, data: Partial<GroceryItem>) => Promise<void>;
  deleteGroceryItem: (id: string) => Promise<void>;
  addGroceryItem: (item: Omit<GroceryItem, 'id' | 'user_id' | 'bought' | 'calories' | 'protein_g' | 'fat_total_g' | 'carbohydrates_total_g' | 'sugar_g' | 'fiber_g' | 'serving_size_g' | 'cholesterol_mg' | 'sodium_mg'> & { nutrition_query: string }) => Promise<void>;
}

const GroceryContext = createContext<GroceryContextType | undefined>(undefined);

export const useGroceries = () => {
  const context = useContext(GroceryContext);
  if (!context) {
    throw new Error('useGroceries must be used within a GroceryProvider');
  }
  return context;
};

// GroceryProvider component
export const GroceryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [groceries, setGroceries] = useState<GroceryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGroceries = async () => {
    if (!user?.id) {
      setGroceries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('groceries')
      .select('id, user_id, item_name, quantity, bought, price, unit, goal_id, calories, protein_g, fat_total_g, carbohydrates_total_g, sugar_g, fiber_g, serving_size_g, cholesterol_mg, sodium_mg')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching groceries:', error);
    } else {
      const fetchedGroceries: GroceryItem[] = (data || []).map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        item_name: item.item_name,
        quantity: item.quantity || 0, // Default to 0 if null/undefined
        bought: item.bought || false,
        price: item.price || 0, // Default to 0 if null/undefined
        unit: item.unit || '', // Default to empty string if null/undefined
        goal_id: item.goal_id || undefined,
        calories: item.calories ?? undefined,
        protein_g: item.protein_g ?? undefined,
        fat_total_g: item.fat_total_g ?? undefined,
        carbohydrates_total_g: item.carbohydrates_total_g ?? undefined,
        sugar_g: item.sugar_g ?? undefined,
        fiber_g: item.fiber_g ?? undefined,
        serving_size_g: item.serving_size_g ?? undefined,
        cholesterol_mg: item.cholesterol_mg ?? undefined,
        sodium_mg: item.sodium_mg ?? undefined,
      }));
      setGroceries(fetchedGroceries);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading) {
      fetchGroceries();
    }
  }, [user?.id, authLoading]);

  const refetchGroceries = async () => {
    await fetchGroceries();
  };

  const updateGroceryItem = async (id: string, data: Partial<GroceryItem>) => {
    const { error } = await supabase.from('groceries').update(data).eq('id', id);
    if (error) {
      console.error('Error updating grocery item:', error);
    } else {
      await refetchGroceries();
    }
  };

  const deleteGroceryItem = async (id: string) => {
    const { error } = await supabase.from('groceries').delete().eq('id', id);
    if (error) {
      console.error('Error deleting grocery item:', error);
    } else {
      await refetchGroceries();
    }
  };

  const addGroceryItem = async (item: Omit<GroceryItem, 'id' | 'user_id' | 'bought' | 'calories' | 'protein_g' | 'fat_total_g' | 'carbohydrates_total_g' | 'sugar_g' | 'fiber_g' | 'serving_size_g' | 'cholesterol_mg' | 'sodium_mg'> & { nutrition_query: string }) => {
    if (!user?.id) {
      console.error('Cannot add grocery item: User not logged in.');
      return;
    }
    const { nutrition_query, ...itemToInsert } = item; // nutrition_query is no longer used for the API call directly

    const newItem = {
      ...itemToInsert,
      user_id: user.id,
      bought: false,
      quantity: itemToInsert.quantity || 0,
      price: itemToInsert.price || 0,
      unit: itemToInsert.unit || '',
    };
    const { data, error } = await supabase.from('groceries').insert([newItem]).select();
    if (error) {
      console.error('Error adding grocery item:', error);
    } else if (data && data.length > 0) {
      const groceryId = data[0].id;
      try {
        // New API call format with separate fields
        await fetch('/api/enrich-grocery-item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            item_name: itemToInsert.item_name,
            quantity: itemToInsert.quantity,
            unit: itemToInsert.unit,
            grocery_id: groceryId,
            user_id: user.id,
          }),
        });
      } catch (enrichError) {
        console.error(`Error enriching item ${itemToInsert.item_name}:`, enrichError);
      }
      await refetchGroceries();
    }
  };

  return (
    <GroceryContext.Provider value={{ groceries, refetchGroceries, updateGroceryItem, deleteGroceryItem, addGroceryItem }}>
      {children}
    </GroceryContext.Provider>
  );
};

// Main Grocery Page Component
const GroceryPage: React.FC = () => {
  const { groceries, updateGroceryItem, deleteGroceryItem } = useGroceries();
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Goal-aware state
  const [goals, setGoals] = useState<Goal[]>([]);
  const [activeGoal, setActiveGoal] = useState<Goal | null>(null);
  const [planningMode, setPlanningMode] = useState(false);
  const [planningRequest, setPlanningRequest] = useState('');
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [aiResponse, setAiResponse] = useState('');

  // Fetch user's active goals
  const fetchGoals = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGoals(data || []);
    } catch (error) {
      console.error('Error fetching goals:', error);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, [user]);

  // Handle goal selection
  const handleGoalSelection = (goalId: string) => {
    const selectedGoal = goals.find(g => g.id === goalId);
    setActiveGoal(selectedGoal || null);
    setPlanningMode(!!selectedGoal);
  };

  // Handle AI grocery plan generation
  const handleGenerateGroceryPlan = async () => {
    if (!activeGoal || !planningRequest.trim()) return;
    
    setIsGeneratingPlan(true);
    setAiResponse('');
    
    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userInput: planningRequest,
          userId: user?.id,
          activeGoal: {
            goal_type: activeGoal.goal_type,
            title: activeGoal.title,
            target_value: activeGoal.target_value,
            target_unit: activeGoal.target_unit,
            metadata: activeGoal.metadata
          },
          intent: 'generate_grocery_plan'
        })
      });
      
      const data = await response.json();
      
      if (data.type === 'grocery_plan_created') {
        setAiResponse(data.message || 'Grocery plan generated successfully!');
        // Refresh groceries to show new items
        setTimeout(() => {
          window.location.reload(); // Simple refresh - could be optimized
        }, 2000);
      } else if (data.type === 'error') {
        setAiResponse(`Error: ${data.error}`);
      } else {
        setAiResponse('Plan generated! Check your grocery list.');
      }
    } catch (error) {
      console.error('Error generating grocery plan:', error);
      setAiResponse('Failed to generate plan. Please try again.');
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handlePriceChange = async (id: string, price: number) => {
    await updateGroceryItem(id, { price });
  };

  const handleBoughtChange = async (id: string, bought: boolean) => {
    await updateGroceryItem(id, { bought });
  };

  const handleDelete = async (id: string) => {
    await deleteGroceryItem(id);
  };

  const totalBudget = groceries.reduce((sum, item) => sum + (item.price || 0), 0);
  const totalCalories = groceries.reduce((sum, item) => sum + (item.calories || 0), 0);
  const totalProtein = groceries.reduce((sum, item) => sum + (item.protein_g || 0), 0);

  if (!user) {
    return (
      <div className="container mx-auto p-4 text-center text-muted-foreground">
        Please log in to view and manage your grocery list.
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      {/* Header with Goal Selection */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <ShoppingCart className="w-8 h-8 text-indigo-600" />
              Grocery & Meal Planning
            </h1>
            <p className="text-gray-600 mt-1">Smart shopping powered by your goals</p>
          </div>
          
          <div className="flex gap-3">
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  Manual Add
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>Browse Catalog</DialogTitle>
                </DialogHeader>
                <BrowseCatalogModal onClose={() => setIsModalOpen(false)} userId={user.id} />
              </DialogContent>
            </Dialog>
            
            {/* AI Grocery Generator Button */}
            <Button 
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              onClick={() => {
                setActiveGoal(goals.length > 0 ? goals[0] : null);
                setPlanningMode(true);
                setPlanningRequest('');
              }}
            >
              <Bot className="w-4 h-4" />
              Add Grocery with AI
            </Button>
          </div>
        </div>

        {/* Goal Selection Card */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-600" />
              Active Goal
            </CardTitle>
            <CardDescription>
              Select a goal to enable AI-powered grocery planning
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Select onValueChange={handleGoalSelection} value={activeGoal?.id || ''}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your active goal..." />
                  </SelectTrigger>
                  <SelectContent>
                    {goals.length === 0 ? (
                      <SelectItem value="no-goals" disabled>
                        No active goals found
                      </SelectItem>
                    ) : (
                      goals.map((goal) => (
                        <SelectItem key={goal.id} value={goal.id}>
                          <div className="flex items-center gap-2">
                            <span>🎯</span>
                            <span>{goal.title}</span>
                            <Badge variant="secondary" className="text-xs">
                              {goal.goal_type.replace('_', ' ')}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              {activeGoal && (
                <div className="bg-indigo-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-indigo-800">{activeGoal.title}</p>
                  <p className="text-xs text-indigo-600">
                    Target: {activeGoal.target_value} {activeGoal.target_unit}
                  </p>
                  {activeGoal.metadata && (
                    <div className="flex gap-2 mt-1">
                      {activeGoal.metadata.target_calories && (
                        <Badge variant="outline" className="text-xs">
                          📊 {activeGoal.metadata.target_calories} cal/day
                        </Badge>
                      )}
                      {activeGoal.metadata.target_protein && (
                        <Badge variant="outline" className="text-xs">
                          💪 {activeGoal.metadata.target_protein}g protein/day
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* AI Planning Mode */}
        {planningMode && activeGoal && (
          <Card className="mb-6 border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bot className="w-5 h-5 text-indigo-600" />
                AI Meal Planner
              </CardTitle>
              <CardDescription>
                Get personalized grocery recommendations based on your {activeGoal.goal_type.replace('_', ' ')} goal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Textarea
                    value={planningRequest}
                    onChange={(e) => setPlanningRequest(e.target.value)}
                    placeholder={`Ask for meal plans aligned with your ${activeGoal.goal_type.replace('_', ' ')} goal...

Examples:
• "Give me a week's grocery list for healthy weight loss meals under ₹2000"
• "Plan high-protein vegetarian meals for muscle gain this week"
• "Suggest budget-friendly nutritious meals for a family of 4"`}
                    rows={4}
                    className="resize-none"
                  />
                </div>
                
                <div className="flex items-center gap-3">
                  <Button 
                    onClick={handleGenerateGroceryPlan}
                    disabled={isGeneratingPlan || !planningRequest.trim()}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700"
                  >
                    {isGeneratingPlan ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Generating Plan...
                      </>
                    ) : (
                      <>
                        <Utensils className="w-4 h-4" />
                        Generate Grocery Plan
                      </>
                    )}
                  </Button>
                  
                  {goals.length === 0 && (
                    <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1 rounded-md text-sm">
                      <Lightbulb className="w-4 h-4" />
                      <span>Create a goal first to unlock AI planning</span>
                    </div>
                  )}
                </div>
                
                {aiResponse && (
                  <div className="bg-white border border-indigo-200 rounded-lg p-4">
                    <p className="text-sm text-gray-700">{aiResponse}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Grocery List */}
        <div className="lg:col-span-2">
          <Table>
            <TableCaption>A list of your grocery items.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Bought</TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="w-[150px]">Quantity</TableHead>
                <TableHead className="w-[120px]">Price</TableHead>
                <TableHead className="w-[200px]">Nutrition</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groceries.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    <Checkbox
                      checked={item.bought}
                      onCheckedChange={(checked) => handleBoughtChange(item.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell>{item.item_name}</TableCell>
                  <TableCell>
                    {item.quantity} {item.unit}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={item.price}
                      className="w-24"
                      placeholder="Price"
                      readOnly // Make the price input read-only
                    />
                  </TableCell>
                  <TableCell>
                    {item.calories !== undefined ? (
                      <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                        🔥 {item.calories} kcal
                      </Badge>
                    ) : (
                      <Badge variant="outline">Loading...</Badge>
                    )}
                    {item.protein_g !== undefined && (
                      <Badge variant="outline" className="bg-blue-100 text-blue-800 ml-1">
                        💪 {item.protein_g}g Protein
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => handleDelete(item.id)}>
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Enhanced Totals Summary Card */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Shopping Summary</CardTitle>
              {activeGoal && (
                <CardDescription className="text-sm">
                  Progress towards your {activeGoal.goal_type.replace('_', ' ')} goal
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Basic Stats */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span>Total Items:</span>
                  <span className="font-medium">{groceries.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Items Bought:</span>
                  <span className="font-medium">{groceries.filter(item => item.bought).length}</span>
                </div>
              </div>
              
              {/* Budget Section */}
              <div className="border-t pt-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold">Total Budget:</span>
                  <span className="font-bold text-lg">₹{totalBudget.toFixed(2)}</span>
                </div>
                {activeGoal && activeGoal.goal_type === 'budget_eating' && activeGoal.target_value && (
                  <div className="bg-green-50 p-2 rounded">
                    <div className="flex justify-between text-xs text-green-700">
                      <span>Budget Goal:</span>
                      <span>₹{activeGoal.target_value}</span>
                    </div>
                    <div className="w-full bg-green-200 rounded-full h-1.5 mt-1">
                      <div 
                        className="bg-green-600 h-1.5 rounded-full"
                        style={{ width: `${Math.min(100, (totalBudget / activeGoal.target_value) * 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-green-600 mt-1">
                      {totalBudget <= activeGoal.target_value ? 
                        `₹${(activeGoal.target_value - totalBudget).toFixed(2)} remaining` :
                        `₹${(totalBudget - activeGoal.target_value).toFixed(2)} over budget`
                      }
                    </p>
                  </div>
                )}
              </div>
              
              {/* Nutrition Section */}
              <div className="border-t pt-3">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-semibold">Total Calories:</span>
                    <span className="font-bold">{totalCalories.toFixed(0)} kcal</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Total Protein:</span>
                    <span className="font-bold">{totalProtein.toFixed(1)} g</span>
                  </div>
                  
                  {/* Goal-specific nutrition progress */}
                  {activeGoal && activeGoal.metadata && (
                    <div className="bg-blue-50 p-2 rounded mt-2">
                      {activeGoal.metadata.target_calories && (
                        <div className="mb-2">
                          <div className="flex justify-between text-xs text-blue-700">
                            <span>Daily Calorie Goal:</span>
                            <span>{activeGoal.metadata.target_calories} kcal</span>
                          </div>
                          <div className="text-xs text-blue-600">
                            Current groceries cover ~{Math.round(totalCalories / activeGoal.metadata.target_calories)} days
                          </div>
                        </div>
                      )}
                      {activeGoal.metadata.target_protein && (
                        <div>
                          <div className="flex justify-between text-xs text-blue-700">
                            <span>Daily Protein Goal:</span>
                            <span>{activeGoal.metadata.target_protein}g</span>
                          </div>
                          <div className="text-xs text-blue-600">
                            Current groceries cover ~{Math.round(totalProtein / activeGoal.metadata.target_protein)} days
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Goal-linked items */}
              {activeGoal && (
                <div className="border-t pt-3">
                  <p className="text-sm text-gray-600 mb-1">Items for this goal:</p>
                  <p className="font-medium text-indigo-600">
                    {groceries.filter(item => item.goal_id === activeGoal.id).length} / {groceries.length} items
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default GroceryPage;
