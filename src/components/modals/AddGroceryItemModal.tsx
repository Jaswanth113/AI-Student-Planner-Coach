import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useGroceries, type Grocery } from '@/hooks/useSupabaseData';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface AddGroceryItemModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddGroceryItemModal = ({ isOpen, onClose }: AddGroceryItemModalProps) => {
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { addGrocery, updateGrocery, refetch: refetchGroceries } = useGroceries();
  const { toast } = useToast();

  const handleClose = () => {
    if (isSubmitting) return;
    setItemName('');
    setQuantity('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!itemName.trim()) {
      toast({ title: 'Item Name is required.', variant: 'destructive' });
      return;
    }
    if (!user) {
      toast({ title: 'You must be logged in.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      // Step A: Insert the new item into the groceries table
      const newGroceryData = {
        item_name: itemName.trim(),
        quantity: quantity.trim() || '1', // Default quantity if not provided
        bought: false,
        estimated_price: 0, // Default price, can be updated later
      };

      const { data: insertedItem, error: insertError } = await addGrocery(newGroceryData);

      if (insertError || !insertedItem) {
        throw new Error(insertError?.message || 'Failed to add grocery item.');
      }

      toast({
        title: 'Grocery item added!',
        description: `${insertedItem.item_name} has been added to your list.`,
      });

      // Step B: Immediately make a second, non-blocking API call to enrich grocery item
      if (insertedItem.id && insertedItem.item_name && user.id) {
        try {
          const fullQuery = `${insertedItem.quantity} ${insertedItem.item_name}`; // Construct the full query string

          const enrichResponse = await fetch('/api/enrich-grocery-item', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              item_name: fullQuery, // Use fullQuery here
              grocery_id: insertedItem.id,
              user_id: user.id,
            }),
          });

          if (!enrichResponse.ok) {
            console.warn('Failed to enrich grocery item:', await enrichResponse.text());
            // Do not throw error, as the item was already added
          } else {
            const enrichedItem: Grocery = await enrichResponse.json();
            // Update the local state with the enriched item
            await updateGrocery(enrichedItem.id, enrichedItem);
          }
        } catch (enrichError) {
          console.error('Error enriching grocery item:', enrichError);
        }
      }

      // Step C: Update the UI
      refetchGroceries(); // Ensure the main list updates

      // Step D: Close the modal
      handleClose();

    } catch (error: any) {
      console.error('Error in AddGroceryItemModal:', error);
      toast({
        title: 'Error',
        description: error.message || 'An error occurred while adding the grocery item.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Grocery Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="itemName" className="text-right">
              Item Name
            </Label>
            <Input
              id="itemName"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="col-span-3"
              placeholder="e.g., Milk"
              disabled={isSubmitting}
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quantity" className="text-right">
              Quantity
            </Label>
            <Input
              id="quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="col-span-3"
              placeholder="e.g., 2L or 6 eggs"
              disabled={isSubmitting}
            />
          </div>
          <Button type="submit" className="w-full mt-4" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Add Grocery'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
