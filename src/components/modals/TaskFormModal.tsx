import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, Loader2 } from 'lucide-react';
import { useTasks, Task } from '@/hooks/useSupabaseData';
import { useToast } from '@/hooks/use-toast';
interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: Task | null; // If provided, we're editing, otherwise creating
}

export const TaskFormModal = ({ isOpen, onClose, task }: TaskFormModalProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [priority, setPriority] = useState<number>(2);
  const [category, setCategory] = useState('General');
  const [estimate, setEstimate] = useState(30);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { addTask, updateTask } = useTasks(); // Re-added addTask
  const { toast } = useToast();

  // Populate form when editing an existing task
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setPriority(task.priority);
      setEstimate(task.estimate);
      
      // Extract category from tags (first tag)
      setCategory(task.tags && task.tags.length > 0 ? task.tags[0] : 'General');
      
      // Use local time if available, fallback to UTC
      const dateToUse = task.due_date_local || task.due_date;
      if (dateToUse) {
        try {
          const dueDateTime = new Date(dateToUse);
          setDueDate(dueDateTime.toISOString().split('T')[0]);
          setDueTime(dueDateTime.toTimeString().slice(0, 5));
        } catch (error) {
          console.warn('Error parsing due date:', error);
        }
      }
    }
  }, [task]);

  const handleClose = () => {
    if (isSubmitting) return;
    
    // Reset form
    setTitle('');
    setDescription('');
    setDueDate('');
    setDueTime('');
    setPriority(2);
    setCategory('General');
    setEstimate(30);
    
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast({
        title: 'Title is required',
        description: 'Please enter a title for your task.',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let due_date_local: string | undefined = undefined;
      let due_date_utc: string | undefined = undefined;

      if (dueDate) {
        const localDateTime = new Date(`${dueDate}T${dueTime || '00:00'}`);
        due_date_local = localDateTime.toISOString();
        due_date_utc = localDateTime.toISOString(); // For simplicity, using local time as UTC for now, as backend handles parsing
      }
      
      const taskData = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        estimate,
        tags: [category],
        status: task?.status || 'Inbox' as const, // Use existing status or default to 'Inbox'
        due_date: due_date_local, // This field might be deprecated, but keeping for compatibility
        due_date_utc: due_date_utc,
        due_date_local: due_date_local,
        timezone: undefined // Remove timezone as backend handles it
      };

      if (task) {
        // Update existing task
        await updateTask(task.id, taskData);
        toast({
          title: 'Task updated',
          description: 'Your task has been updated successfully.'
        });
      } else {
        // Create new task
        await addTask(taskData);
        toast({
          title: 'Task created',
          description: 'Your task has been created successfully.'
        });
      }

      handleClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save task',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {task ? 'Edit Task' : 'Create New Task'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Enter task title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Add task description or notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              rows={3}
            />
          </div>

          {/* Due Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="due-date">Due Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={isSubmitting}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="due-time">Due Time</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="due-time"
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  disabled={isSubmitting || !dueDate}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Priority & Category */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select 
                value={priority.toString()} 
                onValueChange={(value) => setPriority(Number(value))}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">High Priority</SelectItem>
                  <SelectItem value="2">Medium Priority</SelectItem>
                  <SelectItem value="3">Low Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select 
                value={category} 
                onValueChange={setCategory}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="General">General</SelectItem>
                  <SelectItem value="Work">Work</SelectItem>
                  <SelectItem value="Personal">Personal</SelectItem>
                  <SelectItem value="School">School</SelectItem>
                  <SelectItem value="Health">Health</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Estimate */}
          <div className="space-y-2">
            <Label htmlFor="estimate">Time Estimate (minutes)</Label>
            <Input
              id="estimate"
              type="number"
              min="5"
              step="5"
              placeholder="30"
              value={estimate}
              onChange={(e) => setEstimate(Number(e.target.value))}
              disabled={isSubmitting}
            />
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !title.trim()}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                task ? 'Update Task' : 'Create Task'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
