import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  CheckSquare, 
  Clock, 
  Plus, 
  Target, 
  Calendar, 
  ShoppingCart, 
  ArrowRight, 
  AlertCircle, 
  TrendingUp, 
  DollarSign,
  Sparkles,
  Timer,
  MapPin,
  Users
} from "lucide-react";
import { SectionCard } from "@/components/ui/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { QuickAddModal } from "@/components/modals/QuickAddModal";
import { useData } from "@/contexts/DataContext";
import { TaskCard } from "@/components/TaskCard";

export default function Dashboard() {
  const navigate = useNavigate();
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const { 
    tasks, 
    commitments, 
    groceries, 
    expenses, 
    reminders,
    loading 
  } = useData();
  
  // Calculate today's data
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  const todaysData = useMemo(() => {
    // Tasks due today or overdue
    const dueTasks = tasks.filter(task => {
      if (!task.due_date_local && !task.due_date) return false;
      const taskDate = new Date(task.due_date_local || task.due_date!).toISOString().split('T')[0];
      return taskDate <= todayStr && task.status !== 'Done';
    });

    // Today's commitments
    const todaysCommitments = commitments.filter(commitment => {
      const commitmentDate = new Date(commitment.start_time).toISOString().split('T')[0];
      return commitmentDate === todayStr;
    }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    // Upcoming reminders (next 7 days)
    const weekFromNow = new Date();
    weekFromNow.setDate(today.getDate() + 7);
    const upcomingReminders = reminders.filter(reminder => {
      if (!reminder.due_date_local && !reminder.due_date) return false;
      const reminderDate = new Date(reminder.due_date_local || reminder.due_date!);
      return reminderDate >= today && reminderDate <= weekFromNow;
    }).slice(0, 3);

    // Recent expenses (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 7);
    const recentExpenses = expenses.filter(expense => 
      new Date(expense.expense_date) >= weekAgo
    ).slice(0, 4);

    return {
      dueTasks,
      todaysCommitments,
      upcomingReminders,
      recentExpenses
    };
  }, [tasks, commitments, reminders, expenses, todayStr, today]);

  // Calculate grocery and budget stats
  const groceryStats = useMemo(() => {
    const weeklyBudget = 1500; // This could come from user preferences
    const totalSpent = groceries.filter(item => item.bought).reduce((sum, item) => sum + (item.price || item.estimated_price || 0), 0);
    const remainingBudget = weeklyBudget - totalSpent;
    const budgetProgress = Math.min((totalSpent / weeklyBudget) * 100, 100);
    const totalItems = groceries.length;
    const boughtItems = groceries.filter(item => item.bought).length;

    return {
      weeklyBudget,
      totalSpent,
      remainingBudget,
      budgetProgress,
      totalItems,
      boughtItems,
      completionRate: totalItems > 0 ? (boughtItems / totalItems) * 100 : 0
    };
  }, [groceries]);

  // Calculate task stats
  const taskStats = useMemo(() => {
    const totalEstimate = todaysData.dueTasks.reduce((acc, task) => acc + (task.estimate || 0), 0);
    const highPriorityTasks = todaysData.dueTasks.filter(task => task.priority === 1).length;
    const completedToday = tasks.filter(task => {
      if (task.status !== 'Done') return false;
      const completedDate = new Date(task.created_at).toISOString().split('T')[0];
      return completedDate === todayStr;
    }).length;

    return {
      totalEstimate,
      highPriorityTasks,
      completedToday
    };
  }, [todaysData.dueTasks, tasks, todayStr]);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const now = new Date();
    const target = new Date(dateString);
    const diffMs = target.getTime() - now.getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 24 && diffHours > 0) {
      return `in ${diffHours}h`;
    } else if (diffDays === 1) {
      return 'tomorrow';
    } else if (diffDays > 0) {
      return `in ${diffDays} days`;
    } else if (diffDays === 0) {
      return 'today';
    } else {
      return 'overdue';
    }
  };

  if (loading.tasks || loading.commitments || loading.groceries || loading.expenses) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-6 w-60" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-64 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
      {/* Page Header */}
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-primary" />
          Good morning! 👋
        </h1>
        <p className="text-lg text-muted-foreground">Here's what's happening in your day</p>
      </header>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Due Today</p>
                <p className="text-2xl font-bold text-foreground">{todaysData.dueTasks.length}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {taskStats.highPriorityTasks} high priority
                </p>
              </div>
              <CheckSquare className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Focus Time</p>
                <p className="text-2xl font-bold text-foreground">{Math.round(taskStats.totalEstimate / 60)}h</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {taskStats.totalEstimate % 60}m remaining
                </p>
              </div>
              <Timer className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Grocery Budget</p>
                <p className="text-2xl font-bold text-foreground">₹{Math.abs(groceryStats.remainingBudget)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {groceryStats.remainingBudget >= 0 ? 'remaining' : 'over budget'}
                </p>
              </div>
              <ShoppingCart className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed Today</p>
                <p className="text-2xl font-bold text-foreground">{taskStats.completedToday}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  tasks finished
                </p>
              </div>
              <Target className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today at a Glance */}
      <SectionCard
        title="Today at a Glance"
        description="Your schedule and priorities for today"
        action={{
          label: "Plan My Day",
          onClick: () => setIsQuickAddOpen(true),
          variant: "default"
        }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today's Schedule */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Today's Schedule
            </h4>
            <div className="space-y-3">
              {todaysData.todaysCommitments.length > 0 ? (
                todaysData.todaysCommitments.map((commitment) => (
                  <div key={commitment.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors">
                    <div className="text-sm font-medium text-primary w-20">
                      {formatTime(commitment.start_time)}
                    </div>
                    <div className="flex-1">
                      <h5 className="font-medium text-foreground">{commitment.title}</h5>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {commitment.type}
                        </Badge>
                        {commitment.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {commitment.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No commitments scheduled for today</p>
                  <Button variant="ghost" size="sm" className="mt-2" onClick={() => navigate('/commitments')}>
                    Add a commitment
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Focus Time Breakdown */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              <Timer className="w-4 h-4" />
              Focus Time Needed
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total estimated time</span>
                <span className="font-semibold">{Math.round(taskStats.totalEstimate / 60)}h {taskStats.totalEstimate % 60}m</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">High priority tasks</span>
                <Badge variant="destructive" className="text-xs">
                  {taskStats.highPriorityTasks} urgent
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Completion rate</span>
                <span className="font-semibold text-green-600">
                  {tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'Done').length / tasks.length) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Due & Overdue Tasks */}
        <SectionCard
          title="Due & Overdue Tasks"
          description={`${todaysData.dueTasks.length} tasks need your attention`}
          action={{
            label: "View All Tasks",
            onClick: () => navigate('/tasks'),
            variant: "outline"
          }}
        >
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {todaysData.dueTasks.slice(0, 5).map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
            {todaysData.dueTasks.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">All caught up! 🎉</p>
                <p className="text-sm">No overdue tasks.</p>
                <Button variant="ghost" size="sm" className="mt-3" onClick={() => setIsQuickAddOpen(true)}>
                  Add a new task
                </Button>
              </div>
            )}
          </div>
        </SectionCard>

        {/* Upcoming Commitments */}
        <SectionCard
          title="Upcoming Events"
          description="Next few days schedule"
          action={{
            label: "View Calendar",
            onClick: () => navigate('/commitments'),
            variant: "outline"
          }}
        >
          <div className="space-y-3">
            {commitments
              .filter(c => new Date(c.start_time) > today)
              .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
              .slice(0, 4)
              .map((commitment) => (
                <div key={commitment.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-foreground">{commitment.title}</h4>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatRelativeTime(commitment.start_time)}</span>
                      <span>•</span>
                      <Badge variant="outline" className="text-xs">
                        {commitment.type}
                      </Badge>
                      {commitment.location && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {commitment.location}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            
            {commitments.filter(c => new Date(c.start_time) > today).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No upcoming events</p>
                <p className="text-sm">Your schedule is clear!</p>
                <Button variant="ghost" size="sm" className="mt-3" onClick={() => navigate('/commitments')}>
                  Add an event
                </Button>
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Memory & Reminders */}
        <SectionCard
          title="Memory & Reminders"
          description="Things you asked me to remember"
          action={{
            label: "View All",
            onClick: () => navigate('/notifications'),
            variant: "outline"
          }}
        >
          <div className="space-y-3">
            {todaysData.upcomingReminders.map((reminder) => (
              <div key={reminder.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background">
                <AlertCircle className="w-4 h-4 text-blue-500" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-foreground">{reminder.title}</h4>
                  {reminder.due_date_local && (
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(reminder.due_date_local)}
                    </p>
                  )}
                </div>
                {reminder.category && (
                  <Badge variant="outline" className="text-xs">
                    {reminder.category}
                  </Badge>
                )}
              </div>
            ))}
            
            {todaysData.upcomingReminders.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No upcoming reminders</p>
                <p className="text-sm">All clear for now!</p>
              </div>
            )}
          </div>
        </SectionCard>

        {/* Grocery Budget Tracker */}
        <SectionCard
          title="Grocery Budget (Weekly)"
          description={`₹${Math.abs(groceryStats.remainingBudget)} ${groceryStats.remainingBudget >= 0 ? 'remaining' : 'over budget'} of ₹${groceryStats.weeklyBudget}`}
          action={{
            label: "View List",
            onClick: () => navigate('/grocery'),
            variant: "outline"
          }}
        >
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Spent</span>
                <span className="font-medium">₹{groceryStats.totalSpent} / ₹{groceryStats.weeklyBudget}</span>
              </div>
              <Progress 
                value={groceryStats.budgetProgress} 
                className={`h-3 ${groceryStats.budgetProgress > 100 ? 'bg-red-100' : ''}`}
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className={`text-lg font-semibold ${groceryStats.remainingBudget >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₹{Math.abs(groceryStats.remainingBudget)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {groceryStats.remainingBudget >= 0 ? 'Remaining' : 'Over Budget'}
                </div>
              </div>
              <div>
                <div className="text-lg font-semibold text-foreground">{groceryStats.totalItems}</div>
                <div className="text-xs text-muted-foreground">Total Items</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-blue-600">{Math.round(groceryStats.completionRate)}%</div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Recent Expenses */}
      <SectionCard
        title="Recent Expenses"
        description={`${todaysData.recentExpenses.length} expenses this week`}
        action={{
          label: "View All Expenses",
          onClick: () => navigate('/expenses'),
          variant: "outline"
        }}
      >
        <div className="space-y-3">
          {todaysData.recentExpenses.map((expense) => (
            <div key={expense.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <div>
                  <h4 className="text-sm font-medium text-foreground">{expense.description}</h4>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {expense.category}
                    </Badge>
                    <span>•</span>
                    <span>{new Date(expense.expense_date).toLocaleDateString()}</span>
                    {expense.payment_method && (
                      <>
                        <span>•</span>
                        <span>{expense.payment_method}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-foreground">₹{expense.amount.toLocaleString()}</div>
              </div>
            </div>
          ))}
          
          {todaysData.recentExpenses.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No recent expenses</p>
              <p className="text-sm">Start tracking your spending!</p>
              <Button variant="ghost" size="sm" className="mt-3" onClick={() => navigate('/expenses')}>
                Add an expense
              </Button>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Quick Actions */}
      <SectionCard
        title="Quick Actions"
        description="Common tasks to get things done faster"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button 
            variant="outline" 
            className="h-auto p-4 flex flex-col gap-2 hover:bg-primary/5 hover:border-primary/20 transition-colors" 
            onClick={() => setIsQuickAddOpen(true)}
          >
            <Sparkles className="w-6 h-6 text-primary" />
            <span className="text-sm font-medium">AI Quick Add</span>
            <span className="text-xs text-muted-foreground">Natural language</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="h-auto p-4 flex flex-col gap-2 hover:bg-blue-50 hover:border-blue-200 transition-colors" 
            onClick={() => navigate('/tasks')}
          >
            <Target className="w-6 h-6 text-blue-600" />
            <span className="text-sm font-medium">View Tasks</span>
            <span className="text-xs text-muted-foreground">{tasks.length} total</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="h-auto p-4 flex flex-col gap-2 hover:bg-green-50 hover:border-green-200 transition-colors" 
            onClick={() => navigate('/grocery')}
          >
            <ShoppingCart className="w-6 h-6 text-green-600" />
            <span className="text-sm font-medium">Grocery List</span>
            <span className="text-xs text-muted-foreground">{groceries.length} items</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="h-auto p-4 flex flex-col gap-2 hover:bg-purple-50 hover:border-purple-200 transition-colors" 
            onClick={() => navigate('/planner')}
          >
            <Calendar className="w-6 h-6 text-purple-600" />
            <span className="text-sm font-medium">Plan Week</span>
            <span className="text-xs text-muted-foreground">Schedule view</span>
          </Button>
        </div>
      </SectionCard>

      <QuickAddModal 
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
      />
    </div>
  );
}