import { useState, useEffect, useMemo } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  PlusCircle, 
  Target, 
  AlertTriangle, 
  CheckCircle,
  Bot,
  ShoppingCart,
  Receipt,
  Calendar,
  Edit,
  Trash2,
  DollarSign,
  Lightbulb
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Budget {
  id: string;
  user_id: string;
  category: string;
  allocated_amount: number;
  spent_amount: number;
  period: 'weekly' | 'monthly' | 'yearly';
  start_date: string;
  end_date: string;
  created_at: string;
}

interface BudgetGoal {
  id: string;
  user_id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  category: string;
  target_date: string;
  status: 'active' | 'completed' | 'paused';
  created_at: string;
}

export default function Budget() {
  const { expenses, groceries } = useData();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [budgetGoals, setBudgetGoals] = useState<BudgetGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  
  // Budget creation form state
  const [isCreatingBudget, setIsCreatingBudget] = useState(false);
  const [newBudgetCategory, setNewBudgetCategory] = useState('');
  const [newBudgetAmount, setNewBudgetAmount] = useState('');
  
  // AI suggestions state
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const [aiSuggestionRequest, setAiSuggestionRequest] = useState('');
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState('');

  // Fetch budgets and goals
  const fetchBudgets = async () => {
    if (!user?.id) return;
    
    try {
      const { data: budgetData, error: budgetError } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      const { data: goalData, error: goalError } = await supabase
        .from('budget_goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (budgetError) throw budgetError;
      if (goalError) throw goalError;
      
      setBudgets(budgetData || []);
      setBudgetGoals(goalData || []);
    } catch (error: any) {
      console.error('Error fetching budget data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load budget data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, [user]);

  // Calculate budget statistics
  const budgetStats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    const currentWeek = getWeekStart(now).toISOString().slice(0, 10);
    
    // Calculate spent amounts by category for current period
    const expensesByCategory = expenses
      .filter(expense => {
        const expenseDate = expense.expense_date;
        if (selectedPeriod === 'monthly') {
          return expenseDate.slice(0, 7) === currentMonth;
        } else if (selectedPeriod === 'weekly') {
          const expenseWeek = getWeekStart(new Date(expenseDate)).toISOString().slice(0, 10);
          return expenseWeek === currentWeek;
        }
        return true; // yearly
      })
      .reduce((acc, expense) => {
        acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
        return acc;
      }, {} as Record<string, number>);

    // Include grocery spending
    const grocerySpent = groceries
      .filter(item => item.bought)
      .reduce((sum, item) => sum + (item.price || 0), 0);
    
    expensesByCategory['Groceries'] = (expensesByCategory['Groceries'] || 0) + grocerySpent;

    // Calculate budget performance
    const budgetPerformance = budgets.map(budget => {
      const spent = expensesByCategory[budget.category] || 0;
      const percentage = budget.allocated_amount > 0 ? (spent / budget.allocated_amount) * 100 : 0;
      const remaining = budget.allocated_amount - spent;
      
      return {
        ...budget,
        spent_amount: spent,
        percentage,
        remaining,
        status: spent > budget.allocated_amount ? 'overbudget' : percentage > 80 ? 'warning' : 'good'
      };
    });

    const totalAllocated = budgets.reduce((sum, budget) => sum + budget.allocated_amount, 0);
    const totalSpent = Object.values(expensesByCategory).reduce((sum, amount) => sum + amount, 0);
    
    return {
      budgetPerformance,
      totalAllocated,
      totalSpent,
      totalRemaining: totalAllocated - totalSpent,
      expensesByCategory
    };
  }, [budgets, expenses, groceries, selectedPeriod]);

  // Helper function to get week start date
  function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  }

  // Create new budget
  const createBudget = async () => {
    if (!user?.id || !newBudgetCategory || !newBudgetAmount) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all fields',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('budgets')
        .insert([{
          user_id: user.id,
          category: newBudgetCategory,
          allocated_amount: parseFloat(newBudgetAmount),
          spent_amount: 0,
          period: selectedPeriod,
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + (selectedPeriod === 'weekly' ? 7 : selectedPeriod === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000).toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      
      setBudgets(prev => [data, ...prev]);
      setNewBudgetCategory('');
      setNewBudgetAmount('');
      setIsCreatingBudget(false);
      
      toast({
        title: 'Budget Created',
        description: `Budget for ${newBudgetCategory} has been set`
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  // Generate AI budget suggestions
  const generateAiSuggestions = async () => {
    if (!aiSuggestionRequest.trim()) return;
    
    setIsGeneratingSuggestions(true);
    setAiSuggestions('');
    
    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userInput: aiSuggestionRequest,
          userId: user?.id,
          context: {
            currentBudgets: budgets,
            recentExpenses: expenses.slice(0, 20),
            grocerySpending: groceries.filter(item => item.bought).reduce((sum, item) => sum + (item.price || 0), 0),
            totalSpent: budgetStats.totalSpent,
            totalAllocated: budgetStats.totalAllocated
          },
          intent: 'budget_analysis'
        })
      });
      
      const data = await response.json();
      
      if (data.type === 'budget_analysis') {
        setAiSuggestions(data.analysis || 'Analysis complete! Check your budget recommendations.');
      } else {
        setAiSuggestions(data.message || 'Analysis generated successfully!');
      }
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
      setAiSuggestions('Failed to generate suggestions. Please try again.');
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Wallet className="w-8 h-8 text-indigo-600" />
            Budget Management
          </h1>
          <p className="text-lg text-muted-foreground">
            Track spending, set budgets, and optimize your finances with AI
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            className="gap-2" 
            onClick={() => setIsCreatingBudget(true)}
          >
            <PlusCircle className="w-4 h-4" />
            Add Budget
          </Button>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-indigo-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Allocated</p>
                <p className="text-2xl font-bold text-foreground">₹{budgetStats.totalAllocated.toLocaleString()}</p>
              </div>
              <Target className="w-8 h-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Spent</p>
                <p className="text-2xl font-bold text-foreground">₹{budgetStats.totalSpent.toLocaleString()}</p>
              </div>
              <Receipt className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Remaining</p>
                <p className="text-2xl font-bold text-foreground">₹{budgetStats.totalRemaining.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Categories</p>
                <p className="text-2xl font-bold text-foreground">{budgets.length}</p>
              </div>
              <ShoppingCart className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Budget Assistant */}
      <Card className="border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bot className="w-5 h-5 text-indigo-600" />
            AI Budget Assistant
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Get personalized budget recommendations and spending insights
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Textarea
                value={aiSuggestionRequest}
                onChange={(e) => setAiSuggestionRequest(e.target.value)}
                placeholder="Ask for budget advice...

Examples:
• Analyze my spending patterns and suggest improvements
• My budget is ₹25000 per month, help me optimize it
• I want to save ₹50000 in 6 months, create a plan
• Suggest cheaper alternatives for my grocery spending"
                rows={3}
                className="resize-none"
              />
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                onClick={generateAiSuggestions}
                disabled={isGeneratingSuggestions || !aiSuggestionRequest.trim()}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700"
              >
                {isGeneratingSuggestions ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Lightbulb className="w-4 h-4" />
                    Get AI Suggestions
                  </>
                )}
              </Button>
            </div>
            
            {aiSuggestions && (
              <div className="bg-white border border-indigo-200 rounded-lg p-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{aiSuggestions}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="budgets">Budgets</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Budget Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Budget Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {budgetStats.budgetPerformance.map((budget) => (
                  <div key={budget.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{budget.category}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">₹{budget.spent_amount.toLocaleString()}</span>
                        <span className="text-xs text-muted-foreground">/ ₹{budget.allocated_amount.toLocaleString()}</span>
                        <Badge 
                          variant={
                            budget.status === 'overbudget' ? 'destructive' :
                            budget.status === 'warning' ? 'default' : 'secondary'
                          }
                          className="text-xs"
                        >
                          {Math.round(budget.percentage)}%
                        </Badge>
                      </div>
                    </div>
                    <Progress 
                      value={Math.min(budget.percentage, 100)} 
                      className={`h-2 ${budget.status === 'overbudget' ? 'bg-red-100' : ''}`}
                    />
                    {budget.status === 'overbudget' && (
                      <div className="flex items-center gap-1 text-xs text-red-600">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Over budget by ₹{(budget.spent_amount - budget.allocated_amount).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                ))}
                
                {budgetStats.budgetPerformance.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground">
                    <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No budgets set up yet</p>
                    <Button 
                      variant="outline" 
                      className="mt-2" 
                      onClick={() => setIsCreatingBudget(true)}
                    >
                      Create Your First Budget
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Spending Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="w-5 h-5" />
                  Spending Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(budgetStats.expensesByCategory)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 6)
                  .map(([category, amount]) => {
                    const percentage = budgetStats.totalSpent > 0 ? (amount / budgetStats.totalSpent) * 100 : 0;
                    return (
                      <div key={category} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-primary rounded-full"></div>
                          <span className="text-sm font-medium">{category}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold">₹{amount.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</div>
                        </div>
                      </div>
                    );
                  })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="budgets" className="space-y-6">
          {/* Create Budget Form */}
          {isCreatingBudget && (
            <Card className="border-l-4 border-l-indigo-500">
              <CardHeader>
                <CardTitle>Create New Budget</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={newBudgetCategory}
                      onChange={(e) => setNewBudgetCategory(e.target.value)}
                      placeholder="e.g., Food & Dining, Transportation"
                    />
                  </div>
                  <div>
                    <Label htmlFor="amount">Budget Amount (₹)</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={newBudgetAmount}
                      onChange={(e) => setNewBudgetAmount(e.target.value)}
                      placeholder="15000"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button onClick={createBudget}>Create Budget</Button>
                  <Button variant="outline" onClick={() => setIsCreatingBudget(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Budget List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {budgetStats.budgetPerformance.map((budget) => (
              <Card key={budget.id} className={budget.status === 'overbudget' ? 'border-red-200 bg-red-50/50' : ''}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-foreground">{budget.category}</h3>
                    <Badge 
                      variant={
                        budget.status === 'overbudget' ? 'destructive' :
                        budget.status === 'warning' ? 'default' : 'secondary'
                      }
                    >
                      {Math.round(budget.percentage)}%
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    <Progress 
                      value={Math.min(budget.percentage, 100)} 
                      className={`h-3 ${budget.status === 'overbudget' ? 'bg-red-100' : ''}`}
                    />
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">₹{budget.spent_amount.toLocaleString()} spent</span>
                      <span className="text-muted-foreground">₹{budget.allocated_amount.toLocaleString()} budget</span>
                    </div>
                    
                    {budget.status === 'overbudget' ? (
                      <div className="flex items-center gap-1 text-sm text-red-600 bg-red-50 p-2 rounded">
                        <TrendingUp className="w-4 h-4" />
                        <span>Over budget by ₹{(budget.spent_amount - budget.allocated_amount).toLocaleString()}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-sm text-green-600 bg-green-50 p-2 rounded">
                        <TrendingDown className="w-4 h-4" />
                        <span>₹{budget.remaining.toLocaleString()} remaining</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="goals" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Budget Goals</CardTitle>
              <p className="text-sm text-muted-foreground">Set and track your financial goals</p>
            </CardHeader>
            <CardContent>
              {budgetGoals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No budget goals set</p>
                  <p className="text-sm">Create goals to track your financial progress</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {budgetGoals.map((goal) => (
                    <div key={goal.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{goal.title}</h3>
                        <Badge variant={goal.status === 'active' ? 'default' : 'secondary'}>
                          {goal.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mb-3">
                        Target: ₹{goal.target_amount.toLocaleString()} by {new Date(goal.target_date).toLocaleDateString()}
                      </div>
                      <Progress 
                        value={(goal.current_amount / goal.target_amount) * 100} 
                        className="h-2"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>₹{goal.current_amount.toLocaleString()}</span>
                        <span>₹{goal.target_amount.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
