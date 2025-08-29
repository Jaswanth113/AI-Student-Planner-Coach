import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useData, Expense } from '@/contexts/DataContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Receipt, CreditCard, Calendar, DollarSign } from 'lucide-react';

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense?: Expense | null; // If provided, we're editing, otherwise creating
}

export const ExpenseFormModal = ({ isOpen, onClose, expense }: ExpenseFormModalProps) => {
  const { addExpense, updateExpense } = useData();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    category: '',
    expense_date: new Date().toISOString().split('T')[0],
    payment_method: '',
    tags: '',
    receipt_url: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (expense) {
      setFormData({
        amount: expense.amount.toString(),
        description: expense.description || '',
        category: expense.category || '',
        expense_date: expense.expense_date || new Date().toISOString().split('T')[0],
        payment_method: expense.payment_method || '',
        tags: (expense.tags || []).join(', '),
        receipt_url: expense.receipt_url || ''
      });
    } else {
      // Reset form for new expense
      setFormData({
        amount: '',
        description: '',
        category: '',
        expense_date: new Date().toISOString().split('T')[0],
        payment_method: '',
        tags: '',
        receipt_url: ''
      });
    }
  }, [expense, isOpen]);

  const handleClose = () => {
    if (isSubmitting) return;
    setFormData({
      amount: '',
      description: '',
      category: '',
      expense_date: new Date().toISOString().split('T')[0],
      payment_method: '',
      tags: '',
      receipt_url: ''
    });
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || !formData.description || !formData.category || !formData.expense_date) {
      toast({
        title: 'Missing required fields',
        description: 'Amount, Description, Category, and Date are required.',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const expenseData = {
        amount: parseFloat(formData.amount),
        description: formData.description.trim(),
        category: formData.category,
        expense_date: formData.expense_date,
        payment_method: formData.payment_method || undefined,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        receipt_url: formData.receipt_url || undefined
      };

      if (expense) {
        // Update existing expense
        await updateExpense(expense.id, expenseData);
        toast({
          title: 'Expense updated',
          description: `Successfully updated ${expenseData.description}`
        });
      } else {
        // Create new expense
        await addExpense(expenseData);
        toast({
          title: 'Expense added',
          description: `Successfully recorded ${expenseData.description} for ₹${expenseData.amount}`
        });
      }

      handleClose();
    } catch (error: any) {
      console.error('Error saving expense:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save expense',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            {expense ? 'Edit Expense' : 'Add New Expense'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Amount and Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Amount*
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
                required
                disabled={isSubmitting}
                className="text-lg font-semibold"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense_date" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date*
              </Label>
              <Input
                id="expense_date"
                type="date"
                value={formData.expense_date}
                onChange={(e) => setFormData(prev => ({ ...prev, expense_date: e.target.value }))}
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description*</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="What was this expense for?"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Category and Payment Method */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category*</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))} 
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Food & Dining">🍽️ Food & Dining</SelectItem>
                  <SelectItem value="Transportation">🚗 Transportation</SelectItem>
                  <SelectItem value="Shopping">🛍️ Shopping</SelectItem>
                  <SelectItem value="Entertainment">🎬 Entertainment</SelectItem>
                  <SelectItem value="Utilities">⚡ Utilities</SelectItem>
                  <SelectItem value="Healthcare">🏥 Healthcare</SelectItem>
                  <SelectItem value="Education">📚 Education</SelectItem>
                  <SelectItem value="Travel">✈️ Travel</SelectItem>
                  <SelectItem value="Groceries">🛒 Groceries</SelectItem>
                  <SelectItem value="Other">📦 Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_method" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Payment Method
              </Label>
              <Select 
                value={formData.payment_method} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, payment_method: value }))} 
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="How did you pay?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">💵 Cash</SelectItem>
                  <SelectItem value="Credit Card">💳 Credit Card</SelectItem>
                  <SelectItem value="Debit Card">💳 Debit Card</SelectItem>
                  <SelectItem value="UPI">📱 UPI</SelectItem>
                  <SelectItem value="Net Banking">🏦 Net Banking</SelectItem>
                  <SelectItem value="Wallet">📱 Digital Wallet</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              placeholder="work, personal, urgent (comma-separated)"
              disabled={isSubmitting}
            />
          </div>

          {/* Receipt URL */}
          <div className="space-y-2">
            <Label htmlFor="receipt_url">Receipt URL</Label>
            <Input
              id="receipt_url"
              type="url"
              value={formData.receipt_url}
              onChange={(e) => setFormData(prev => ({ ...prev, receipt_url: e.target.value }))}
              placeholder="https://... (optional)"
              disabled={isSubmitting}
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                expense ? 'Update Expense' : 'Add Expense'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};