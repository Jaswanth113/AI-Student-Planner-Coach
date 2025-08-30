import { useState, useCallback } from "react";
import { Plus, Filter, CheckSquare, Search, Calendar, Wand2, ChevronDown } from "lucide-react";
import { SectionCard } from "@/components/ui/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTasks } from "@/hooks/useSupabaseData";
import { QuickAddModal } from "@/components/modals/QuickAddModal";
import { TaskFormModal } from "@/components/modals/TaskFormModal";
import { TaskCard } from "@/components/TaskCard";

export default function Tasks() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isManualTaskModalOpen, setIsManualTaskModalOpen] = useState(false);
  const { tasks, updateTask } = useTasks();

  const handleMarkDone = async () => {
    const promises = selectedTasks.map(taskId => 
      updateTask(taskId, { status: 'Done' })
    );
    await Promise.all(promises);
    setSelectedTasks([]);
  };

  const handlePlanForDay = async () => {
    const today = new Date().toISOString();
    const promises = selectedTasks.map(taskId => 
      updateTask(taskId, { status: 'Planned', due_date: today })
    );
    await Promise.all(promises);
    setSelectedTasks([]);
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow";
    } else {
      return date.toLocaleDateString();
    }
  };

  const getTasksByStatus = useCallback((status: 'Inbox' | 'Planned' | 'Done') => {
    return (tasks || []).filter(t => t.status === status);
  }, [tasks]);

  const filteredTasks = useCallback((list: ReturnType<typeof getTasksByStatus>) => {
    if (!searchQuery) return list;
    return list.filter(task =>
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.tags || []).some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [searchQuery]);

  const handleTaskSelect = (taskId: string) => {
    setSelectedTasks(prev =>
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  // Rendering now handled by <TaskCard />

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Tasks & Goals</h1>
          <p className="text-muted-foreground mt-1">Manage your academic and personal tasks</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Task
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsManualTaskModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Manually
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsQuickAddOpen(true)}>
              <Wand2 className="w-4 h-4 mr-2" />
              Create with AI
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="w-4 h-4" />
          Filter
        </Button>
      </div>

      {/* Bulk Actions */}
      {selectedTasks.length > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted border border-border">
          <span className="text-sm font-medium">
            {selectedTasks.length} task{selectedTasks.length > 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleMarkDone}>Mark Done</Button>
            <Button size="sm" variant="outline" disabled>Set Priority</Button>
            <Button size="sm" variant="outline" onClick={handlePlanForDay}>Plan for Day</Button>
          </div>
        </div>
      )}

      {/* Tasks Tabs */}
      <Tabs defaultValue="inbox" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="inbox">
            Inbox ({getTasksByStatus("Inbox").length})
          </TabsTrigger>
          <TabsTrigger value="planned">
            Planned ({getTasksByStatus("Planned").length})
          </TabsTrigger>
          <TabsTrigger value="done">
            Done ({getTasksByStatus("Done").length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="space-y-4">
          <SectionCard title="Inbox" description="Tasks that need to be organized">
            <div className="space-y-3">
              {filteredTasks(getTasksByStatus("Inbox")).map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
              {filteredTasks(getTasksByStatus("Inbox")).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No tasks in inbox</p>
                  <p className="text-sm">Add a new task to get started!</p>
                </div>
              )}
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="planned" className="space-y-4">
          <SectionCard title="Planned" description="Tasks scheduled for specific times">
            <div className="space-y-3">
              {filteredTasks(getTasksByStatus("Planned")).map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
              {filteredTasks(getTasksByStatus("Planned")).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No planned tasks</p>
                  <p className="text-sm">Plan tasks from your inbox!</p>
                </div>
              )}
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="done" className="space-y-4">
          <SectionCard title="Completed" description="Tasks you've finished">
            <div className="space-y-3">
              {filteredTasks(getTasksByStatus("Done")).map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
              {filteredTasks(getTasksByStatus("Done")).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No completed tasks yet</p>
                  <p className="text-sm">Complete some tasks to see them here!</p>
                </div>
              )}
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>

    <QuickAddModal
      isOpen={isQuickAddOpen}
      onClose={() => setIsQuickAddOpen(false)}
    />
    <TaskFormModal
      isOpen={isManualTaskModalOpen}
      onClose={() => setIsManualTaskModalOpen(false)}
    />
    </div>
  );
}