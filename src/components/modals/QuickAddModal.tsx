import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useAgent } from '@/hooks/useAgent'; // Import the new hook
import { Loader2, Sparkles, Lightbulb } from 'lucide-react';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickAddModal = ({ isOpen, onClose }: QuickAddModalProps) => {
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { sendMessageToAgent, loading: agentLoading } = useAgent(); // Use the new hook
  const { refetchTasks, refetchGroceries, refetchReminders } = useData(); // Get refetch functions

  const handleClose = () => {
    if (isSubmitting) return;
    setText('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!text.trim()) {
      toast({ title: 'Input cannot be empty.', variant: 'destructive' });
      return;
    }
    if (!user) {
      toast({ title: 'You must be logged in.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await sendMessageToAgent(text.trim());
      
      if (result.error) {
        throw new Error(result.error);
      }

      let successMessage = result.message || 'Item created successfully!';

      if (result.type) {
        switch (result.type) {
          case 'task_creation_success':
          case 'task_update_success':
            successMessage = `Task created: ${result.item?.title || 'Unknown Task'}`;
            await refetchTasks();
            break;
          case 'grocery_creation_success':
          case 'grocery_update_success':
            successMessage = `Grocery item added: ${result.item?.item_name || 'Unknown Item'}`;
            await refetchGroceries();
            break;
          case 'reminder_creation_success':
          case 'reminder_update_success':
            successMessage = `Reminder set: ${result.item?.title || 'Unknown Reminder'}`;
            await refetchReminders();
            break;
          case 'creation_success': // Generic success if type is not specific
            if (result.item?.title) {
              successMessage = `Created: ${result.item.title}`;
            } else if (result.item?.item_name) {
              successMessage = `Created: ${result.item.item_name}`;
            } else {
              successMessage = result.message || 'Item created successfully!';
            }
            await refetchTasks(); // Refetch all relevant data for generic success
            await refetchGroceries();
            await refetchReminders();
            break;
          default:
            // Handle other types or a generic success
            successMessage = result.message || 'Operation completed successfully!';
            await refetchTasks(); // Refetch all relevant data for generic success
            await refetchGroceries();
            await refetchReminders();
            break;
        }
      }

      toast({ 
        title: 'Success!',
        description: successMessage
      });

      handleClose();
    } catch (error: any) {
      console.error('Error in QuickAddModal:', error);
      toast({ 
        title: 'Error',
        description: error.message || 'An error occurred while processing your request.',
        variant: 'destructive' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const examplePrompts = [
    "Buy milk and bread tomorrow",
    "Remind me to call the doctor next Tuesday at 10 AM",
    "Schedule a meeting with John on Friday at 2pm",
    "Add a task to review the quarterly report by Monday",
    "Set a reminder to pay rent on the 1st of next month"
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Quick Add with AI
          </DialogTitle>
          <DialogDescription>
            Describe a task, grocery item, or reminder in natural language. Our AI will understand and create it for you.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-2">
          <div className="space-y-2">
            <Textarea
              placeholder="e.g., Remind me to call the doctor next Tuesday at 10 AM"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={isSubmitting}
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Example prompts */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lightbulb className="w-4 h-4" />
              <span>Try these examples:</span>
            </div>
            <div className="grid gap-2">
              {examplePrompts.slice(0, 3).map((prompt, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  className="justify-start text-left h-auto p-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setText(prompt)}
                  disabled={isSubmitting}
                >
                  "{prompt}"
                </Button>
              ))}
            </div>
          </div>

          <Button 
            onClick={handleSubmit} 
            className="w-full" 
            disabled={isSubmitting || agentLoading || !text.trim()}
            size="lg"
          >
            {(isSubmitting || agentLoading) ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing with AI...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Create with AI
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
