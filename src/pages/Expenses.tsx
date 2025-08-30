import { useState, useMemo, useEffect } from 'react';
import { 
  DollarSign, 
  PlusCircle, 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  Calendar, 
  Filter, 
  Download, 
  Edit, 
  Trash2,
  Receipt,
  BarChart3,
  Wallet,
  Bot,
  Mic,
  Plus,
  Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useData, Expense } from '@/contexts/DataContext';
import { ExpenseFormModal } from '@/components/modals/ExpenseFormModal';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';

export default function Expenses() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState('month');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const { expenses, loading, deleteExpense, addExpense } = useData();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // AI Natural Language Expense Input
  const [aiInputMode, setAiInputMode] = useState(false);
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('');
  const [isProcessingAiInput, setIsProcessingAiInput] = useState(false);

  // Get expenses for time range
  const filteredExpenses = useMemo(() => {
    const now = new Date();
    let startDate = new Date();

    switch (selectedTimeRange) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate = new Date(0); // All time
    }

    return expenses.filter(expense => {
      const expenseDate = new Date(expense.expense_date);
      const matchesTimeRange = expenseDate >= startDate;
      const matchesSearch = !searchQuery || 
        expense.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        expense.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || expense.category === selectedCategory;
      
      return matchesTimeRange && matchesSearch && matchesCategory;
    });
  }, [expenses, selectedTimeRange, searchQuery, selectedCategory]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const averageExpense = filteredExpenses.length > 0 ? totalExpenses / filteredExpenses.length : 0;
    
    // Group by category
    const expensesByCategory = filteredExpenses.reduce((acc, expense) => {
      const category = expense.category || 'Other';
      acc[category] = (acc[category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    // Group by payment method
    const expensesByPayment = filteredExpenses.reduce((acc, expense) => {
      const method = expense.payment_method || 'Unknown';
      acc[method] = (acc[method] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    // Calculate trend (compare with previous period)
    const previousPeriodStart = new Date();
    const currentPeriodStart = new Date();
    
    switch (selectedTimeRange) {
      case 'week':
        previousPeriodStart.setDate(previousPeriodStart.getDate() - 14);
        currentPeriodStart.setDate(currentPeriodStart.getDate() - 7);
        break;
      case 'month':
        previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 2);
        currentPeriodStart.setMonth(currentPeriodStart.getMonth() - 1);
        break;
      case 'year':
        previousPeriodStart.setFullYear(previousPeriodStart.getFullYear() - 2);
        currentPeriodStart.setFullYear(currentPeriodStart.getFullYear() - 1);
        break;
    }

    const previousPeriodExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.expense_date);
      return expenseDate >= previousPeriodStart && expenseDate < currentPeriodStart;
    }).reduce((sum, expense) => sum + expense.amount, 0);

    const trendPercentage = previousPeriodExpenses > 0 
      ? ((totalExpenses - previousPeriodExpenses) / previousPeriodExpenses) * 100 
      : 0;

    return {
      totalExpenses,
      averageExpense,
      expensesByCategory,
      expensesByPayment,
      trendPercentage,
      transactionCount: filteredExpenses.length
    };
  }, [filteredExpenses, expenses, selectedTimeRange]);

  // Sample budget data (in real app, this would come from user preferences)
  const budgets = {
    'Food & Dining': { budget: 15000, spent: stats.expensesByCategory['Food & Dining'] || 0 },
    'Transportation': { budget: 8000, spent: stats.expensesByCategory['Transportation'] || 0 },
    'Shopping': { budget: 12000, spent: stats.expensesByCategory['Shopping'] || 0 },
    'Entertainment': { budget: 6000, spent: stats.expensesByCategory['Entertainment'] || 0 },
    'Utilities': { budget: 5000, spent: stats.expensesByCategory['Utilities'] || 0 },
    'Groceries': { budget: 10000, spent: stats.expensesByCategory['Groceries'] || 0 }
  };

  const handleEdit = (expense: Expense) => {
    setSelectedExpense(expense);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this expense? This action cannot be undone.')) {
      try {
        await deleteExpense(id);
      } catch (error: any) {
        toast({ 
          title: 'Error', 
          description: error.message || 'Failed to delete expense', 
          variant: 'destructive' 
        });
      }
    }
  };

  const exportData = () => {
    const csvContent = [
      ['Date', 'Description', 'Category', 'Amount', 'Payment Method', 'Tags'].join(','),
      ...filteredExpenses.map(expense => [
        expense.expense_date,
        `"${expense.description}"`,
        expense.category,
        expense.amount,
        expense.payment_method || '',
        (expense.tags || []).join(';')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `expenses-${selectedTimeRange}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading.expenses) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
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
            <Wallet className="w-8 h-8" />
            Expenses
          </h1>
          <p className="text-lg text-muted-foreground">
            Track your spending and manage your budget
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportData}
            className="gap-2"
            disabled={filteredExpenses.length === 0}
          >
            <Download className="w-4 h-4" />
            Export
          </Button>

          <Button 
            className="gap-2" 
            onClick={() => {
              setSelectedExpense(null);
              setIsCreateModalOpen(true);
            }}
          >
            <PlusCircle className="w-4 h-4" />
            Add Expense
          </Button>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Spent</p>
                <p className="text-2xl font-bold text-foreground">₹{stats.totalExpenses.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-1">
                  {stats.trendPercentage > 0 ? (
                    <TrendingUp className="w-3 h-3 text-red-500" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-green-500" />
                  )}
                  <span className={`text-xs ${stats.trendPercentage > 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {Math.abs(stats.trendPercentage).toFixed(1)}% vs last period
                  </span>
                </div>
              </div>
              <DollarSign className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Transactions</p>
                <p className="text-2xl font-bold text-foreground">{stats.transactionCount}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedTimeRange === 'week' ? 'this week' : selectedTimeRange === 'month' ? 'this month' : 'this year'}
                </p>
              </div>
              <CreditCard className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Average</p>
                <p className="text-2xl font-bold text-foreground">₹{Math.round(stats.averageExpense).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">per transaction</p>
              </div>
              <BarChart3 className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Top Category</p>
                <p className="text-lg font-bold text-foreground">
                  {Object.entries(stats.expensesByCategory).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  ₹{Object.entries(stats.expensesByCategory).sort(([,a], [,b]) => b - a)[0]?.[1]?.toLocaleString() || '0'}
                </p>
              </div>
              <Receipt className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search expenses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-background"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.keys(stats.expensesByCategory).map(category => (
              <SelectItem key={category} value={category}>{category}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Button
          variant={aiInputMode ? "default" : "outline"}
          size="sm"
          onClick={() => setAiInputMode(!aiInputMode)}
          className="gap-2"
        >
          <Bot className="w-4 h-4" />
          AI Input
        </Button>
      </div>

      {/* AI Natural Language Input */}
      {aiInputMode && (
        <Card className="border-2 border-primary/20 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              AI Expense Assistant
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Add expenses using natural language. Try: "Spent 300 on Uber today" or "Bought groceries for 1200 yesterday"
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <div className="flex-1">
                <Textarea
                  value={naturalLanguageInput}
                  onChange={(e) => setNaturalLanguageInput(e.target.value)}
                  placeholder="Describe your expense in plain English...
                  
Examples:
• Spent 500 on dinner at restaurant yesterday
• Paid 2000 for electricity bill on 15th Jan
• Bought books for 800 using credit card"
                  rows={3}
                  className="resize-none"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="p-2"
                  disabled
                >
                  <Mic className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={async () => {
                    if (!naturalLanguageInput.trim() || isProcessingAiInput) return;
                    
                    setIsProcessingAiInput(true);
                    try {
                      const response = await fetch('/api/agent', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          userInput: naturalLanguageInput,
                          userId: user?.id,
                          intent: 'parse_expense'
                        })
                      });
                      
                      const data = await response.json();
                      
                      if (data.type === 'expense_parsed' && data.expense) {
                        await addExpense({
                          category: data.expense.category,
                          amount: data.expense.amount,
                          description: data.expense.description,
                          expense_date: data.expense.expense_date || new Date().toISOString().split('T')[0],
                          payment_method: data.expense.payment_method || undefined,
                          tags: data.expense.tags || []
                        });
                        
                        setNaturalLanguageInput('');
                        toast({
                          title: 'Expense Added!',
                          description: `₹${data.expense.amount} for ${data.expense.description}`
                        });
                      } else {
                        toast({
                          title: 'Could not parse expense',
                          description: 'Please try rephrasing your input',
                          variant: 'destructive'
                        });
                      }
                    } catch (error) {
                      console.error('Error processing AI input:', error);
                      toast({
                        title: 'Error',
                        description: 'Failed to process expense. Please try again.',
                        variant: 'destructive'
                      });
                    } finally {
                      setIsProcessingAiInput(false);
                    }
                  }}
                  disabled={!naturalLanguageInput.trim() || isProcessingAiInput}
                  className="p-2"
                >
                  {isProcessingAiInput ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Spending by Category
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(stats.expensesByCategory)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 6)
                  .map(([category, amount]) => {
                    const percentage = (amount / stats.totalExpenses) * 100;
                    return (
                      <div key={category} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{category}</span>
                          <div className="text-right">
                            <span className="text-sm font-semibold">₹{amount.toLocaleString()}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {percentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                {Object.keys(stats.expensesByCategory).length === 0 && (
                  <div className="text-center py-6 text-muted-foreground">
                    <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No expenses to analyze</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Payment Methods
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(stats.expensesByPayment)
                  .sort(([,a], [,b]) => b - a)
                  .map(([method, amount]) => {
                    const percentage = (amount / stats.totalExpenses) * 100;
                    return (
                      <div key={method} className="flex items-center justify-between p-3 rounded-lg border border-border">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{method}</span>
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

        <TabsContent value="transactions" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>All Transactions</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{filteredExpenses.length} transactions</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {filteredExpenses.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses
                      .sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime())
                      .map(expense => (
                        <TableRow key={expense.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">
                            <div>
                              <div>{expense.description}</div>
                              {expense.tags && expense.tags.length > 0 && (
                                <div className="flex gap-1 mt-1">
                                  {expense.tags.slice(0, 2).map(tag => (
                                    <Badge key={tag} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{expense.category}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(expense.expense_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            ₹{expense.amount.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {expense.payment_method && (
                              <Badge variant="secondary" className="text-xs">
                                {expense.payment_method}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => handleEdit(expense)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-destructive hover:text-destructive" 
                                onClick={() => handleDelete(expense.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Receipt className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No expenses found</p>
                  <p className="text-sm">
                    {searchQuery || selectedCategory !== 'all' 
                      ? 'Try adjusting your filters or search terms'
                      : 'Add your first expense to get started!'
                    }
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-4" 
                    onClick={() => setIsCreateModalOpen(true)}
                  >
                    Add Expense
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budget" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(budgets).map(([category, { budget, spent }]) => {
              const percentage = (spent / budget) * 100;
              const isOverBudget = spent > budget;
              const remaining = budget - spent;

              return (
                <Card key={category} className={isOverBudget ? 'border-red-200 bg-red-50/50' : ''}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-foreground">{category}</h3>
                      <Badge 
                        variant={isOverBudget ? 'destructive' : percentage > 80 ? 'default' : 'secondary'}
                        className="font-medium"
                      >
                        {Math.round(percentage)}%
                      </Badge>
                    </div>
                    
                    <div className="space-y-3">
                      <Progress 
                        value={Math.min(percentage, 100)} 
                        className={`h-3 ${isOverBudget ? 'bg-red-100' : ''}`}
                      />
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">₹{spent.toLocaleString()} spent</span>
                        <span className="text-muted-foreground">₹{budget.toLocaleString()} budget</span>
                      </div>
                      
                      {isOverBudget ? (
                        <div className="flex items-center gap-1 text-sm text-red-600 bg-red-50 p-2 rounded">
                          <TrendingUp className="w-4 h-4" />
                          <span>Over budget by ₹{(spent - budget).toLocaleString()}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-sm text-green-600 bg-green-50 p-2 rounded">
                          <TrendingDown className="w-4 h-4" />
                          <span>₹{remaining.toLocaleString()} remaining</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <ExpenseFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        expense={null}
      />
      
      <ExpenseFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        expense={selectedExpense}
      />
    </div>
  );
}