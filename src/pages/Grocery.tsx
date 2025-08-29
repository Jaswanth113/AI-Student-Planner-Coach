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
import BrowseCatalogModal from '@/components/modals/BrowseCatalogModal';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth

// Define types for grocery items
interface GroceryItem {
  id: string;
  user_id: string;
  item_name: string;
  quantity: number;
  bought: boolean;
  price: number; // Now a required numeric field
  unit: string; // Now a required string field
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
      .select('id, user_id, item_name, quantity, bought, price, unit, calories, protein_g, fat_total_g, carbohydrates_total_g, sugar_g, fiber_g, serving_size_g, cholesterol_mg, sodium_mg')
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Grocery List</h1>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button>+ Add Item</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Browse Catalog</DialogTitle>
            </DialogHeader>
            <BrowseCatalogModal onClose={() => setIsModalOpen(false)} userId={user.id} />
          </DialogContent>
        </Dialog>
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

        {/* Totals Summary Card */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Totals</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Total Items:</span>
                <span>{groceries.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Items Bought:</span>
                <span>{groceries.filter(item => item.bought).length}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Total Budget:</span>
                <span>₹{totalBudget.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Total Calories:</span>
                <span>{totalCalories.toFixed(0)} kcal</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Total Protein:</span>
                <span>{totalProtein.toFixed(1)} g</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroceryPage;
