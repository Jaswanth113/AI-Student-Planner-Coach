import { useState } from 'react';
import { Task, useTasks } from '@/hooks/useSupabaseData';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MoreHorizontal, Edit, Trash2, Clock, Calendar } from 'lucide-react';
import { TaskFormModal } from '@/components/modals/TaskFormModal';
import { useToast } from '@/hooks/use-toast';
interface TaskCardProps {
  task: Task;
}

type PriorityMeta = {
  label: string;
  className: string;
};

const priorityMap: Record<number, PriorityMeta> = {
  1: { label: 'High',   className: 'bg-red-100 text-red-800' },
  2: { label: 'Medium', className: 'bg-yellow-100 text-yellow-800' },
  3: { label: 'Low',    className: 'bg-green-100 text-green-800' },
};

export function TaskCard({ task }: TaskCardProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { updateTask, deleteTask } = useTasks();
  const { toast } = useToast();
  
  const priorityMeta = priorityMap[task.priority] ?? priorityMap[2];
  const category = task.tags && task.tags.length > 0 ? task.tags[0] : 'General';
  
  const dateToCheck = task.due_date_local || task.due_date;
  const isCompleted = task.status === 'Done';
  const isOverdue = dateToCheck && !isCompleted && new Date(dateToCheck) < new Date(); // Check if due_date is in the past and not completed

  const handleStatusChange = async (completed: boolean) => {
    try {
      await updateTask(task.id, { 
        status: completed ? 'Done' : 'Inbox' 
      });
      toast({
        title: completed ? 'Task completed!' : 'Task reopened',
        description: completed ? 'Great job finishing this task!' : 'Task moved back to inbox'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update task status',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      try {
        await deleteTask(task.id);
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to delete task',
          variant: 'destructive'
        });
      }
    }
  };

  const formatDueDateTime = (due: string | undefined) => {
    if (!due) return null;
    try {
      const date = new Date(due);
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      if (date.toDateString() === today.toDateString()) {
        return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
      } else if (date.toDateString() === tomorrow.toDateString()) {
        return `Tomorrow at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
      } else {
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true
        });
      }
    } catch {
      return null;
    }
  };

  const getDaysAgo = (dateStr: string) => {
    const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    return `${days} days ago`;
  };

  return (
    <>
      <div className={`rounded-lg border p-4 transition-all hover:shadow-md ${
        isCompleted 
          ? 'bg-muted/30 border-muted' 
          : 'bg-background border-border hover:border-primary/20'
      }`}>
        <div className="flex items-start gap-3">
          {/* Checkbox for completion */}
          <Checkbox
            checked={isCompleted}
            onCheckedChange={handleStatusChange}
            className="mt-1"
          />
          
          <div className="flex-1 min-w-0">
            {/* Title and Priority */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className={`font-semibold leading-tight ${
                isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'
              }`}>
                {task.title}
              </h3>
              
              <div className="flex items-center gap-1 shrink-0">
                {isOverdue && (
                  <Badge variant="destructive" className="text-xs">
                    Overdue
                  </Badge>
                )}
                <Badge 
                  variant={task.priority === 1 ? 'destructive' : task.priority === 2 ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {priorityMeta.label}
                </Badge>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setIsEditModalOpen(true)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            {/* Description */}
            {task.description && (
              <p className={`text-sm mb-3 leading-relaxed ${
                isCompleted ? 'text-muted-foreground' : 'text-muted-foreground'
              }`}>
                {task.description}
              </p>
            )}
            
            {/* Due Date with tooltip */}
            {dateToCheck && (
              <div className={`flex items-center gap-1 text-sm mb-3 text-muted-foreground`}>
                <Calendar className="w-3 h-3" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help">
                      {formatDueDateTime(dateToCheck)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{new Date(dateToCheck).toLocaleString('en-US', { 
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long', 
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
            
            {/* Footer: Tags, Estimate, Created Date */}
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {category}
                </Badge>
                {task.estimate > 0 && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{task.estimate}m</span>
                  </div>
                )}
              </div>
              
              <div className="text-xs text-muted-foreground">
                Created {getDaysAgo(task.created_at)}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Edit Modal */}
      <TaskFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        task={task}
      />
    </>
  );
}
