import React, { useState, useEffect } from 'react';
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { useGroceries } from '@/pages/Grocery'; // This will be defined in Grocery.tsx
import QuantityStepper from '@/components/ui/QuantityStepper'; // Import the new component

// Define types for food catalog items
interface FoodCatalogItem {
  id: string;
  item_name: string;
  category: string;
  unit: string;
  estimated_price_per_unit: number;
}

// Define types for items selected into the temporary cart
interface SelectedItem {
  id: string; // Catalog item ID
  item_name: string;
  quantity: number;
  unit: string;
  calculated_price: number;
}

// Define props for the modal
interface BrowseCatalogModalProps {
  onClose: () => void;
  userId: string;
}

const BrowseCatalogModal: React.FC<BrowseCatalogModalProps> = ({ onClose, userId }) => {
  const { addGroceryItem } = useGroceries();
  const [catalogItems, setCatalogItems] = useState<FoodCatalogItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({}); // To manage quantity for each item

  useEffect(() => {
    const fetchCatalog = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('food_catalog')
        .select('id, item_name, category, unit, estimated_price_per_unit');

      if (error) {
        console.error('Error fetching food catalog:', error);
      } else {
        setCatalogItems(data || []);
        // Initialize quantities to 1 for all items
        const initialQuantities: Record<string, number> = {};
        data?.forEach(item => {
          initialQuantities[item.id] = 1;
        });
        setItemQuantities(initialQuantities);
      }
      setLoading(false);
    };

    fetchCatalog();
  }, []);

  const handleQuantityChange = (itemId: string, quantity: number) => {
    setItemQuantities(prev => ({ ...prev, [itemId]: quantity }));
  };

  const handleAddItemToCart = (item: FoodCatalogItem) => {
    const quantity = itemQuantities[item.id] || 1;
    if (quantity <= 0) return; // Prevent adding items with zero or negative quantity

    const calculated_price = quantity * item.estimated_price_per_unit;

    const existingItemIndex = selectedItems.findIndex(selected => selected.id === item.id);

    if (existingItemIndex > -1) {
      // Update existing item in cart
      const updatedItems = [...selectedItems];
      updatedItems[existingItemIndex] = { ...item, quantity, calculated_price, unit: item.unit };
      setSelectedItems(updatedItems);
    } else {
      // Add new item to cart
      setSelectedItems(prev => [...prev, { ...item, quantity, calculated_price, unit: item.unit }]);
    }
  };

  const handleRemoveItemFromCart = (itemId: string) => {
    setSelectedItems(prev => prev.filter(item => item.id !== itemId));
  };

  const handleAddSelectedItems = async () => {
    setIsAdding(true);
    try {
      for (const item of selectedItems) {
        // Construct nutrition query string
        const nutritionQuery = `${item.quantity}${item.unit} ${item.item_name}`;

        // Add to groceries table
        // The addGroceryItem function in Grocery.tsx will now handle sending the correct
        // separate fields (item_name, quantity, unit, grocery_id, user_id)
        // to the /api/enrich-grocery-item endpoint.
        await addGroceryItem({
          item_name: item.item_name,
          quantity: item.quantity,
          price: item.calculated_price,
          unit: item.unit,
          nutrition_query: `${item.quantity}${item.unit} ${item.item_name}`, // Still pass this for now, but the backend will ignore it.
        });
      }
      onClose();
      setSelectedItems([]); // Clear cart after adding
    } catch (error) {
      console.error('Error adding selected items:', error);
      // Optionally show a toast notification for error
    } finally {
      setIsAdding(false);
    }
  };

  const filteredItems = catalogItems.filter(item =>
    item.item_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group items by category
  const itemsByCategory = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, FoodCatalogItem[]>);

  const totalCartPrice = selectedItems.reduce((sum, item) => sum + item.calculated_price, 0);

  return (
    <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
      <DialogHeader>
        <DialogTitle>Browse Food Catalog</DialogTitle>
      </DialogHeader>
      <div className="flex-grow overflow-y-auto space-y-4 py-2 pr-2">
        <div>
          <Label htmlFor="catalog-search">Search Catalog</Label>
          <Input
            id="catalog-search"
            placeholder="Search for items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mt-1"
          />
        </div>

        {loading ? (
          <div>Loading catalog...</div>
        ) : Object.keys(itemsByCategory).length === 0 ? (
          <div className="text-center text-muted-foreground">No items found for your search.</div>
        ) : (
          <Accordion type="multiple" className="w-full">
            {Object.entries(itemsByCategory).map(([category, items]) => (
              <AccordionItem key={category} value={category}>
                <AccordionTrigger className="capitalize">{category}</AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {items.map(item => {
                      const quantity = itemQuantities[item.id] || 0; // Default to 0 for stepper
                      const isInCart = selectedItems.some(selected => selected.id === item.id);
                      return (
                        <div key={item.id} className="flex items-center space-x-2 border p-2 rounded-md">
                          <div className="flex-grow">
                            <p className="font-medium">{item.item_name}</p>
                            <p className="text-sm text-muted-foreground">
                              ₹{item.estimated_price_per_unit.toFixed(2)}/{item.unit}
                            </p>
                          </div>
                          {item.unit === 'pc' ? (
                            <QuantityStepper
                              value={quantity}
                              onChange={(newValue) => handleQuantityChange(item.id, newValue)}
                            />
                          ) : (
                            <Input
                              type="number"
                              min="0.1"
                              step="0.1"
                              value={quantity === 0 ? '' : quantity} // Display empty for 0 to allow placeholder
                              onChange={(e) => handleQuantityChange(item.id, parseFloat(e.target.value))}
                              className="w-20"
                              placeholder="e.g., 0.5"
                              onClick={(e) => e.stopPropagation()} // Prevent accordion from toggling
                            />
                          )}
                          <Button
                            size="sm"
                            onClick={() => handleAddItemToCart(item)}
                            disabled={quantity <= 0}
                          >
                            {isInCart ? 'Update' : 'Add'}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}

        {selectedItems.length > 0 && (
          <div className="border-t pt-4 mt-4">
            <h3 className="text-lg font-semibold mb-2">Selected Items (Cart)</h3>
            <div className="space-y-2">
              {selectedItems.map(item => (
                <div key={item.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-md">
                  <span>
                    {item.item_name} ({item.quantity} {item.unit})
                  </span>
                  <span className="font-medium">₹{item.calculated_price.toFixed(2)}</span>
                  <Button variant="ghost" size="sm" onClick={() => handleRemoveItemFromCart(item.id)}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center font-bold text-lg mt-4">
              <span>Total Estimated:</span>
              <span>₹{totalCartPrice.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>
      <DialogFooter className="pt-4">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleAddSelectedItems} disabled={selectedItems.length === 0 || isAdding}>
          {isAdding ? 'Adding...' : `Add ${selectedItems.length} Item(s) to List`}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};

export default BrowseCatalogModal;
