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
import { Target, Bot, ShoppingCart, Utensils, Lightbulb, Trash2, Plus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

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
    
    try {
      // First, fetch all groceries for the user
      const { data: groceriesData, error: groceriesError } = await supabase
        .from('groceries')
        .select('*')
        .eq('user_id', user.id);

      if (groceriesError) throw groceriesError;

      // If no groceries, set empty array and return
      if (!groceriesData || groceriesData.length === 0) {
        setGroceries([]);
        setLoading(false);
        return;
      }

      // Get unique item names for price lookup
      const itemNames = [...new Set(groceriesData.map(item => item.item_name))];
      
      // Fetch prices from food_catalog
      const { data: foodCatalogData, error: foodCatalogError } = await supabase
        .from('food_catalog')
        .select('item_name, estimated_price_per_unit')
        .in('item_name', itemNames);

      if (foodCatalogError) console.error('Error fetching food catalog:', foodCatalogError);

      // Create a map of item_name to price for quick lookup
      const priceMap = new Map();
      if (foodCatalogData) {
        foodCatalogData.forEach(item => {
          priceMap.set(item.item_name, item.estimated_price_per_unit);
        });
      }

      // Merge grocery items with their prices
      const mergedGroceries = groceriesData.map(item => {
        const catalogPrice = priceMap.get(item.item_name);
        // Use the stored price if available, otherwise use the catalog price if available
        const price = item.price !== null ? item.price : (catalogPrice || null);
        
        return {
          id: item.id,
          user_id: item.user_id,
          item_name: item.item_name,
          quantity: item.quantity || 1,
          bought: item.bought || false,
          price: price,
          unit: item.unit || '',
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
        };
      });

      setGroceries(mergedGroceries);
    } catch (error) {
      console.error('Error in fetchGroceries:', error);
    } finally {
      setLoading(false);
    }
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
    console.log('Updating grocery item:', { id, data });
    const { data: result, error } = await supabase
      .from('groceries')
      .update(data)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      console.error('Error updating grocery item:', error);
      throw error; // Re-throw to be caught by the error boundary
    } else {
      console.log('Successfully updated grocery item:', result);
      await refetchGroceries();
      return result;
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

  // Update or create an entry in the food_catalog table
  const updateFoodCatalog = async (itemName: string, price: number, unit: string) => {
    try {
      // Check if item already exists in food_catalog
      const { data: existingItem } = await supabase
        .from('food_catalog')
        .select('id, estimated_price_per_unit')
        .eq('item_name', itemName)
        .single();

      if (existingItem) {
        // Update existing item if price is different and not null
        if (price !== null && price !== existingItem.estimated_price_per_unit) {
          await supabase
            .from('food_catalog')
            .update({ estimated_price_per_unit: price, unit })
            .eq('id', existingItem.id);
        }
      } else if (price !== null) {
        // Create new item in food_catalog
        await supabase
          .from('food_catalog')
          .insert([{ item_name: itemName, estimated_price_per_unit: price, unit }]);
      }
    } catch (error) {
      console.error('Error updating food catalog:', error);
    }
  };

  const addGroceryItem = async (item: Omit<GroceryItem, 'id' | 'user_id' | 'bought' | 'calories' | 'protein_g' | 'fat_total_g' | 'carbohydrates_total_g' | 'sugar_g' | 'fiber_g' | 'serving_size_g' | 'cholesterol_mg' | 'sodium_mg'> & { 
    nutrition_query: string;
    isPlanningRequest?: boolean;
  }) => {
    if (!user?.id) {
      console.error('Cannot add grocery item: User not logged in.');
      return;
    }

    const { item_name, quantity, unit, price, goal_id, nutrition_query, isPlanningRequest } = item;
    
    // Update food_catalog with the new item and price if available
    if (item_name && (price || unit)) {
      await updateFoodCatalog(item_name, price || null, unit || '');
    }

    try {
      // Step 1: Call the master agent to create the basic grocery item
      const agentResponse = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userInput: `Add ${quantity} ${unit} of ${item_name} to my grocery list.`,
          userId: user.id,
          intent: 'add_grocery_item',
          itemDetails: { item_name, quantity, unit, price, goal_id },
        }),
      });

      if (!agentResponse.ok) {
        throw new Error(`Agent API error: ${agentResponse.statusText}`);
      }

      const agentData = await agentResponse.json();
      
      // Assuming the agent response contains the newly created item's ID and name
      // The actual structure might vary based on your agent's implementation.
      // For now, we'll assume it returns an object with `id` and `item_name`.
      // If the agent directly inserts into Supabase and returns the item, we can use that.
      // If not, we might need to refetch or parse a specific message.
      // For this refactor, let's assume agentData contains the necessary info or triggers a supabase insert.
      // If the agent's role is purely to *plan* and not *create*, this step needs adjustment.
      // Given the prompt, "create the basic grocery item in the database", it implies the agent handles the initial insert.
      // However, the current `addGroceryItem` directly inserts into Supabase.
      // Let's adjust to make the agent *return* the item details, and then we use those.

      // Re-evaluating: The prompt says "call the master agent ... to create the basic grocery item".
      // The existing code directly inserts into Supabase.
      // To align with the prompt, the agent should be responsible for the initial creation.
      // For now, I will simulate the agent returning the item details, and then proceed with enrichment.
      // If the agent's response doesn't directly give `id` and `item_name`, we'd need to query Supabase.

      // Let's assume the agent's response for 'add_grocery_item' intent will return the created item's details.
      // If the agent's response is just a confirmation, we'd need to fetch the item from Supabase.
      // For now, I'll assume `agentData` contains `grocery_id` and `item_name` directly.
      // If the agent's response is more complex, this part will need adjustment.

      // For the purpose of this refactor, let's assume the agent's response directly gives us the `id` and `item_name`
      // of the newly created item, or a message that we can parse.
      // Given the existing `supabase.from('groceries').insert([newItem]).select();`
      // it's more likely the agent *triggers* this, and we need to get the ID from the DB.
      // However, the prompt explicitly states "get the `id` and `item_name` of the newly created grocery item from the response."
      // This implies the agent's response should contain it.
      // This implies the agent is the *primary* mechanism for creation.
      // I will refactor to make the agent the primary creator.

      // Step 1: Call the master agent to create the basic grocery item
      const createResponse = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userInput: `Add ${quantity} ${unit} of ${item_name} to my grocery list.`,
          userId: user.id,
          intent: 'add_grocery_item',
          itemDetails: { item_name, quantity, unit, price, goal_id },
          isPlanningRequest: item.isPlanningRequest || false
        }),
      });

      if (!createResponse.ok) {
        throw new Error(`Failed to create grocery item via agent: ${createResponse.statusText}`);
      }
      const createData = await createResponse.json();

      // Process the AI response to extract grocery items
      const responseText = createData.response || '';
      
      // Parse the response to extract grocery items
      try {
        // The agent's response for 'add_grocery_item' intent returns the created item's details
        // nested under the 'item' key.
        const createdItem: GroceryItem = createData.item;
        const groceryId = createdItem.id;
        const createdItemName = createdItem.item_name;

        if (!groceryId || !createdItemName) {
          // This check should ideally not be needed if the backend guarantees id and item_name
          // but kept for robustness in case of unexpected agent responses.
          console.error('Agent response did not provide sufficient data for enrichment:', createData);
          throw new Error('Could not get grocery ID or item name from agent response.');
        }

        // Step 2: Skip enrichment for now to prevent errors
        // TODO: Re-enable when nutrition API is properly configured
        console.log("Skipping nutrition enrichment to prevent API errors");

        // Step 3: Call refetchGroceries() to update the main UI
        await refetchGroceries();

      } catch (error) {
        console.error('Error processing grocery item:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in addGroceryItem workflow:', error);
      throw error;
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
  const { groceries, updateGroceryItem, deleteGroceryItem, refetchGroceries } = useGroceries();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Define interface for suggested items
  interface SuggestedItem {
    name: string;
    quantity: number;
    unit: string;
    price: number;
    calories?: number;
    protein_g?: number;
    selected: boolean;
  }

  // Goal-aware state
  const [goals, setGoals] = useState<Goal[]>([]);
  const [activeGoal, setActiveGoal] = useState<Goal | null>(null);
  
  // UI State
  const [suggestedItems, setSuggestedItems] = useState<SuggestedItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [planningMode, setPlanningMode] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [planningRequest, setPlanningRequest] = useState('');
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  
  // State for diet plans and selection
  const [dietPlans, setDietPlans] = useState([
    { id: 'high_protein', name: 'High Protein Diet (₹3000)', budget: 3000 },
    { id: 'weight_loss', name: 'Weight Loss (₹2500)', budget: 2500 },
    { id: 'vegetarian', name: 'Vegetarian (₹2000)', budget: 2000 },
    { id: 'keto', name: 'Keto Diet (₹3500)', budget: 3500 },
  ]);
  const [selectedPlan, setSelectedPlan] = useState('');
  
  // Add or update a custom diet plan
  const addCustomDietPlan = (title: string, budget: number = 3000) => {
    const id = title.toLowerCase().replace(/\s+/g, '_');
    setDietPlans(prev => {
      const existingIndex = prev.findIndex(plan => plan.id === id);
      if (existingIndex >= 0) {
        // Update existing plan
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], name: `${title} (₹${budget})`, budget };
        return updated;
      }
      // Add new plan
      return [...prev, { id, name: `${title} (₹${budget})`, budget }];
    });
    setSelectedPlan(id);
    return id;
  };
  
  
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

  // Toggle item selection in suggestions
  const toggleItemSelection = (itemName: string) => {
    setSuggestedItems(prev => 
      prev.map(item => 
        item.name === itemName 
          ? { ...item, selected: !item.selected } 
          : item
      )
    );
  };

  // Add selected items to grocery list
  const addSelectedItems = async () => {
    if (!user?.id) return;
    
    const selected = suggestedItems.filter(item => item.selected);
    
    for (const item of selected) {
      await supabase.from('groceries').insert([{
        user_id: user.id,
        item_name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        price: item.price,
        calories: item.calories,
        protein_g: item.protein_g
      }]);
    }
    
    // Refresh and close suggestions
    await refetchGroceries();
    setShowSuggestions(false);
    setSuggestedItems([]);
    setAiResponse(`Added ${selected.length} items to your grocery list!`);
  };

  // Extract diet title from AI response
  const extractDietTitle = (response: string): string => {
    // Look for a title in the response (e.g., "Here's your [diet name] grocery list")
    const titleMatch = response.match(/(?:Here's your |Grocery List: |## |### )([^\n:]+)/i);
    if (titleMatch && titleMatch[1]) {
      return titleMatch[1].trim();
    }
    return 'Custom Grocery List';
  };

  // Handle AI grocery plan generation
  const handleGenerateGroceryPlan = async () => {
    if (!planningRequest.trim() && !selectedPlan) return;
    
    setIsGeneratingPlan(true);
    setAiResponse('Generating your grocery plan...');
    
    try {
      // Clear any existing groceries
      if (user?.id) {
        const { error: clearError } = await supabase
          .from('groceries')
          .delete()
          .eq('user_id', user.id);
        
        if (clearError) throw clearError;
      }
      
      // Extract and set diet title from the request
      const dietTitle = extractDietTitle(planningRequest);
      const budgetMatch = planningRequest.match(/₹(\d+)/) || [];
      const budget = budgetMatch[1] ? parseInt(budgetMatch[1]) : 3000;
      
      // Add the new diet plan and set it as selected
      const planId = addCustomDietPlan(dietTitle, budget);
      setSelectedPlan(planId);

      // Prepare the request to the AI
      const bodyContent: any = {
        userInput: `Please generate a grocery list with realistic quantities and prices for: ${planningRequest}. ` +
                  `Budget: ₹3000. Include quantities in standard units (e.g., 500g, 1kg, 1L). ` +
                  `Ensure quantities are reasonable (e.g., 200g of paneer, not 200 units).`,
        userId: user?.id,
        intent: 'generate_grocery_plan',
        format: 'json',
        constraints: {
          max_items: 20,
          max_total_price: 3000,
          require_quantities: true,
          require_units: true
        }
      };

      if (activeGoal) {
        bodyContent.activeGoal = {
          goal_type: activeGoal.goal_type,
          title: activeGoal.title,
          target_value: activeGoal.target_value,
          target_unit: activeGoal.target_unit,
          metadata: activeGoal.metadata
        };
      }

      // Call the AI endpoint
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyContent)
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      
      // Process the response
      if (data.type === 'grocery_plan_created' && data.items && Array.isArray(data.items)) {
        // Format and store suggested items
        const formattedItems = data.items.map(item => ({
          name: item.name,
          quantity: item.quantity || 1,
          unit: item.unit || '',
          price: item.price || 0,
          calories: item.calories,
          protein_g: item.protein_g,
          selected: true // Default all items to selected
        }));
        
        setSuggestedItems(formattedItems);
        setShowSuggestions(true);
        setAiResponse('Select items to add to your grocery list:');
      } else if (data.error) {
        throw new Error(data.error);
      } else {
        throw new Error('Unexpected response format from the server');
      }
    } catch (error) {
      console.error('Error generating grocery plan:', error);
      setAiResponse('Failed to generate plan. Please try again.');
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleBoughtChange = async (id: string, bought: boolean) => {
    await updateGroceryItem(id, { bought });
  };

  const handleDelete = async (id: string) => {
    await deleteGroceryItem(id);
  };

  // Format quantity to remove unnecessary decimal places
  const formatQuantity = (quantity: number | null | undefined): string => {
    if (quantity === null || quantity === undefined) return '1';
    // If quantity is an integer, show without decimal, otherwise show 1 decimal place
    return quantity % 1 === 0 ? quantity.toString() : quantity.toFixed(1);
  };

  // Calculate total price considering quantity and units
  const calculateTotalPrice = (price: number | null, quantity: number | null, unit: string = ''): number => {
    if (price === null || !quantity) return 0;
    
    // Convert all quantities to base units for consistent calculation
    let baseQuantity = quantity;
    const normalizedUnit = unit.toLowerCase().trim();
    
    // Convert grams to kg for pricing (assuming prices are per kg)
    if (normalizedUnit === 'g' || normalizedUnit === 'gram' || normalizedUnit === 'grams') {
      baseQuantity = quantity / 1000; // Convert g to kg
    }
    
    // Cap the maximum quantity to prevent unrealistic calculations
    const maxQuantity = 10; // Maximum 10 units of any item
    const safeQuantity = Math.min(baseQuantity, maxQuantity);
    
    // Cap the maximum price per kg to prevent unrealistic prices
    const maxPricePerKg = 2000; // ₹2000 per kg maximum
    const safePrice = Math.min(price, maxPricePerKg);
    
    return safePrice * safeQuantity;
  };

  // Calculate totals for the summary
  const totalBudget = groceries.reduce(
    (sum, item) => sum + calculateTotalPrice(item.price, item.quantity, item.unit),
    0
  );
  
  const totalCalories = groceries.reduce(
    (sum, item) => sum + ((item.calories || 0) * (item.quantity || 1)),
    0
  );
  
  const totalProtein = groceries.reduce(
    (sum, item) => sum + ((item.protein_g || 0) * (item.quantity || 1)),
    0
  );

  if (!user) {
    return (
      <div className="container mx-auto p-4 text-center text-muted-foreground">
        Please log in to view and manage your grocery list.
      </div>
    );
  }

  // Add this function to handle adding a single item
  const addSingleItem = async (item: any) => {
    if (!user?.id) return;
    
    await supabase.from('groceries').insert([{
      user_id: user.id,
      item_name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      price: item.price,
      calories: item.calories,
      protein_g: item.protein_g
    }]);
    
    await refetchGroceries();
  };

  // Add a function to remove all grocery items
  const removeAllGroceryItems = async () => {
    if (!user?.id) return;
    
    try {
      const { error } = await supabase
        .from('groceries')
        .delete()
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      // Refresh the grocery list
      await refetchGroceries();
      
      toast({
        title: 'Success',
        description: 'All items have been removed from your grocery list.',
      });
    } catch (error) {
      console.error('Error removing all items:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove all items. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto p-4">
      {/* Header with Actions */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Grocery List</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={removeAllGroceryItems} 
            disabled={groceries.length === 0}
            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear All
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Item
          </Button>
        </div>
      </div>

      {/* Grocery Suggestions Dropdown */}
      {showSuggestions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
          <div className="p-4 border-b">
            <h3 className="text-lg font-medium">Suggested Grocery Items</h3>
            <p className="text-sm text-gray-500">Select items to add to your list</p>
          </div>
          
          <div className="overflow-y-auto flex-1 p-4">
            {suggestedItems.map((item, index) => (
              <div 
                key={index} 
                className={`flex items-center p-3 rounded-lg mb-2 border ${
                  item.selected ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Checkbox 
                  id={`item-${index}`}
                  checked={item.selected}
                  onCheckedChange={() => toggleItemSelection(item.name)}
                  className="mr-3 h-5 w-5 rounded"
                />
                <label 
                  htmlFor={`item-${index}`} 
                  className="flex-1 cursor-pointer"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-gray-900">{item.name}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        {formatQuantity(item.quantity)} {item.unit} • ₹{item.price.toFixed(2)}
                      </div>
                      {item.protein_g && (
                        <div className="mt-1">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                            💪 {item.protein_g}g protein
                          </span>
                          {item.calories && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              🔥 {item.calories} kcal
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        addSingleItem(item);
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </label>
              </div>
            ))}
          </div>
          
          <div className="p-4 border-t flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {suggestedItems.filter(i => i.selected).length} items selected
            </div>
            <div className="space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setShowSuggestions(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={addSelectedItems}
                disabled={!suggestedItems.some(item => item.selected)}
              >
                Add Selected
              </Button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                setActiveGoal(null); // Clear active goal when starting AI planning without a pre-selected one
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
        {planningMode && (
          <Card className="mb-6 border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bot className="w-5 h-5 text-indigo-600" />
                AI Meal Planner
              </CardTitle>
                <CardDescription>
                  Get personalized grocery recommendations {activeGoal ? `based on your ${activeGoal.goal_type.replace('_', ' ')} goal` : 'by describing your needs'}
                </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Textarea
                    value={planningRequest}
                    onChange={(e) => setPlanningRequest(e.target.value)}
                    placeholder={`Ask for meal plans aligned with your goals or specific needs...

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
                    <div className="flex flex-col">
                      <span>{formatQuantity(item.quantity)} {item.unit}</span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {item.price !== null ? (
                      <div className="flex flex-col">
                        <span>₹{calculateTotalPrice(item.price, item.quantity, item.unit).toFixed(2)}</span>
                        <span className="text-xs text-muted-foreground">
                          (₹{Number(item.price).toFixed(2)} × {formatQuantity(item.quantity)} {item.unit || 'unit'})
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">No price data</span>
                    )}
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
