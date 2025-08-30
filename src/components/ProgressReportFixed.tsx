import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, Target, DollarSign, Calendar, PieChart } from 'lucide-react';

interface Goal {
  id: string;
  goal_type: string;
  title: string;
  target_value?: number;
  target_unit?: string;
  current_value: number;
  start_date: string;
  end_date?: string;
  metadata?: any;
}

interface GoalProgress {
  goal: Goal;
  totalSpent: number;
  totalCalories: number;
  totalProtein: number;
  itemCount: number;
  expenseCount: number;
  daysActive: number;
  progressPercentage: number;
  budgetStatus: 'under' | 'over' | 'on_track';
  nutritionInsights: {
    dailyCalorieAverage: number;
    dailyProteinAverage: number;
    weeklyCalorieTarget: number;
    weeklyProteinTarget: number;
  };
}

interface ProgressReportProps {
  selectedGoalId?: string;
  showGoalSelector?: boolean;
}

export default function ProgressReport({ selectedGoalId, showGoalSelector = true }: ProgressReportProps) {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [progressData, setProgressData] = useState<GoalProgress | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch user's goals
  const fetchGoals = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const goalsData = data || [];
      setGoals(goalsData);
      
      // Auto-select goal if provided or select first goal
      if (selectedGoalId) {
        const goal = goalsData.find(g => g.id === selectedGoalId);
        if (goal) {
          setSelectedGoal(goal);
          await fetchProgressData(goal);
        }
      } else if (goalsData.length > 0 && !selectedGoal) {
        setSelectedGoal(goalsData[0]);
        await fetchProgressData(goalsData[0]);
      }
    } catch (error) {
      console.error('Error fetching goals:', error);
    }
  };

  // Fetch progress data for selected goal
  const fetchProgressData = async (goal: Goal) => {
    if (!user?.id || !goal) return;
    
    setLoading(true);
    try {
      // Fetch groceries linked to this goal
      const { data: groceriesData, error: groceriesError } = await supabase
        .from('groceries')
        .select('price, calories, protein_g, bought, created_at')
        .eq('user_id', user.id)
        .eq('goal_id', goal.id);

      if (groceriesError) throw groceriesError;

      // Fetch expenses linked to this goal
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('amount, expense_date, category')
        .eq('user_id', user.id)
        .eq('goal_id', goal.id);

      if (expensesError) throw expensesError;

      // Calculate progress metrics
      const groceries = groceriesData || [];
      const expenses = expensesData || [];
      
      const totalSpent = groceries.reduce((sum, item) => sum + (item.price || 0), 0) + 
                        expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
      
      const totalCalories = groceries.reduce((sum, item) => sum + (item.calories || 0), 0);
      const totalProtein = groceries.reduce((sum, item) => sum + (item.protein_g || 0), 0);
      
      // Calculate days since goal started
      const startDate = new Date(goal.start_date);
      const today = new Date();
      const daysActive = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Calculate progress percentage
      const progressPercentage = goal.target_value ? 
        Math.min(100, Math.max(0, (goal.current_value / goal.target_value) * 100)) : 0;
      
      // Determine budget status
      let budgetStatus: 'under' | 'over' | 'on_track' = 'on_track';
      if (goal.goal_type === 'budget_eating' && goal.target_value) {
        if (totalSpent > goal.target_value * 1.1) budgetStatus = 'over';
        else if (totalSpent < goal.target_value * 0.8) budgetStatus = 'under';
      }
      
      // Calculate nutrition insights
      const dailyCalorieAverage = daysActive > 0 ? totalCalories / daysActive : 0;
      const dailyProteinAverage = daysActive > 0 ? totalProtein / daysActive : 0;
      const weeklyCalorieTarget = goal.metadata?.target_calories ? goal.metadata.target_calories * 7 : 0;
      const weeklyProteinTarget = goal.metadata?.target_protein ? goal.metadata.target_protein * 7 : 0;
      
      const progress: GoalProgress = {
        goal,
        totalSpent,
        totalCalories,
        totalProtein,
        itemCount: groceries.length,
        expenseCount: expenses.length,
        daysActive,
        progressPercentage,
        budgetStatus,
        nutritionInsights: {
          dailyCalorieAverage,
          dailyProteinAverage,
          weeklyCalorieTarget,
          weeklyProteinTarget
        }
      };
      
      setProgressData(progress);
    } catch (error) {
      console.error('Error fetching progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, [user, selectedGoalId]);

  // Handle goal selection change
  const handleGoalChange = (goalId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (goal) {
      setSelectedGoal(goal);
      fetchProgressData(goal);
    }
  };

  if (!user) {
    return (
      <div className="text-center p-8 text-gray-500">
        Please log in to view progress reports
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <Card>
        <CardContent className="text-center p-8">
          <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Active Goals</h3>
          <p className="text-gray-500">Create a goal to start tracking your progress!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Goal Selector */}
      {showGoalSelector && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Progress Report
            </CardTitle>
            <CardDescription>Track your goal progress and spending</CardDescription>
          </CardHeader>
          <CardContent>
            <Select onValueChange={handleGoalChange} value={selectedGoal?.id || ''}>
              <SelectTrigger>
                <SelectValue placeholder="Select a goal to view progress..." />
              </SelectTrigger>
              <SelectContent>
                {goals.map((goal) => (
                  <SelectItem key={goal.id} value={goal.id}>
                    <div className="flex items-center gap-2">
                      <span>🎯</span>
                      <span>{goal.title}</span>
                      <Badge variant="secondary" className="text-xs">
                        {goal.goal_type.replace('_', ' ')}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Progress Data */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : progressData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Goal Overview */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-600" />
                {progressData.goal.title}
              </CardTitle>
              <CardDescription className="capitalize">
                {progressData.goal.goal_type.replace('_', ' ')} • Active for {progressData.daysActive} days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Progress Bar */}
                {progressData.goal.target_value && (
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Progress</span>
                      <span className="font-medium">{progressData.progressPercentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-indigo-600 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${progressData.progressPercentage}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>{progressData.goal.current_value} {progressData.goal.target_unit}</span>
                      <span>{progressData.goal.target_value} {progressData.goal.target_unit}</span>
                    </div>
                  </div>
                )}
                
                {/* Goal Description */}
                {progressData.goal.description && (
                  <p className="text-sm text-gray-600">{progressData.goal.description}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Spending Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Spending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">₹{progressData.totalSpent.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">Total Spent</p>
                </div>
                
                {progressData.goal.goal_type === 'budget_eating' && progressData.goal.target_value && (
                  <div className="bg-green-50 p-2 rounded">
                    <div className="text-xs text-green-700 mb-1">
                      Budget: ₹{progressData.goal.target_value}
                    </div>
                    <div className="w-full bg-green-200 rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full ${
                          progressData.budgetStatus === 'over' ? 'bg-red-500' :
                          progressData.budgetStatus === 'under' ? 'bg-blue-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(100, (progressData.totalSpent / progressData.goal.target_value) * 100)}%` }}
                      ></div>
                    </div>
                    <p className={`text-xs mt-1 ${
                      progressData.budgetStatus === 'over' ? 'text-red-600' :
                      progressData.budgetStatus === 'under' ? 'text-blue-600' : 'text-green-600'
                    }`}>
                      {progressData.budgetStatus === 'over' ? 'Over Budget' :
                       progressData.budgetStatus === 'under' ? 'Under Budget' : 'On Track'}
                    </p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-center bg-gray-50 p-2 rounded">
                    <p className="font-medium">{progressData.itemCount}</p>
                    <p className="text-gray-500">Grocery Items</p>
                  </div>
                  <div className="text-center bg-gray-50 p-2 rounded">
                    <p className="font-medium">{progressData.expenseCount}</p>
                    <p className="text-gray-500">Expenses</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Nutrition Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                🍎 Nutrition
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-center">
                  <p className="text-xl font-bold text-orange-600">{progressData.totalCalories.toFixed(0)}</p>
                  <p className="text-xs text-gray-500">Total Calories</p>
                </div>
                
                <div className="text-center">
                  <p className="text-xl font-bold text-blue-600">{progressData.totalProtein.toFixed(1)}g</p>
                  <p className="text-xs text-gray-500">Total Protein</p>
                </div>
                
                {/* Daily Averages */}
                <div className="bg-blue-50 p-2 rounded text-xs">
                  <div className="flex justify-between mb-1">
                    <span>Daily Avg Calories:</span>
                    <span className="font-medium">{progressData.nutritionInsights.dailyCalorieAverage.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Daily Avg Protein:</span>
                    <span className="font-medium">{progressData.nutritionInsights.dailyProteinAverage.toFixed(1)}g</span>
                  </div>
                  
                  {/* Goal comparison */}
                  {progressData.goal.metadata?.target_calories && (
                    <div className="mt-2 pt-2 border-t border-blue-200">
                      <div className="flex justify-between">
                        <span>Calorie Target:</span>
                        <span className={progressData.nutritionInsights.dailyCalorieAverage <= progressData.goal.metadata.target_calories ? 'text-green-600' : 'text-red-600'}>
                          {progressData.goal.metadata.target_calories}/day
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline & Insights */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>Started:</span>
                  <span className="font-medium">{new Date(progressData.goal.start_date).toLocaleDateString()}</span>
                </div>
                
                {progressData.goal.end_date && (
                  <div className="flex justify-between">
                    <span>Target Date:</span>
                    <span className="font-medium">{new Date(progressData.goal.end_date).toLocaleDateString()}</span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span>Days Active:</span>
                  <span className="font-medium">{progressData.daysActive}</span>
                </div>
                
                {/* Quick Insights */}
                <div className="bg-purple-50 p-2 rounded">
                  <p className="text-xs font-medium text-purple-700 mb-1">Quick Insights:</p>
                  <ul className="text-xs text-purple-600 space-y-1">
                    <li>
                      • Avg spending: ₹{(progressData.totalSpent / Math.max(1, progressData.daysActive)).toFixed(1)}/day
                    </li>
                    {progressData.goal.goal_type === 'weight_loss' && (
                      <li>
                        • {progressData.nutritionInsights.dailyCalorieAverage <= (progressData.goal.metadata?.target_calories || 2000) ? 
                           '✅ Staying within calorie goals' : '⚠️ Exceeding calorie targets'}
                      </li>
                    )}
                    {progressData.goal.goal_type === 'muscle_gain' && (
                      <li>
                        • {progressData.nutritionInsights.dailyProteinAverage >= (progressData.goal.metadata?.target_protein || 100) ? 
                           '✅ Meeting protein targets' : '⚠️ Need more protein'}
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : selectedGoal ? (
        <Card>
          <CardContent className="text-center p-8">
            <p className="text-gray-500">No data found for this goal yet.</p>
            <p className="text-sm text-gray-400 mt-2">Start adding groceries and expenses to see your progress!</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
