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
        <CardContent className=\"text-center p-8\">
          <Target className=\"w-12 h-12 text-gray-300 mx-auto mb-4\" />
          <h3 className=\"text-lg font-semibold text-gray-700 mb-2\">No Active Goals</h3>\n          <p className=\"text-gray-500\">Create a goal to start tracking your progress!</p>\n        </CardContent>\n      </Card>\n    );\n  }\n\n  return (\n    <div className=\"space-y-6\">\n      {/* Goal Selector */}\n      {showGoalSelector && (\n        <Card>\n          <CardHeader>\n            <CardTitle className=\"text-lg flex items-center gap-2\">\n              <PieChart className=\"w-5 h-5\" />\n              Progress Report\n            </CardTitle>\n            <CardDescription>Track your goal progress and spending</CardDescription>\n          </CardHeader>\n          <CardContent>\n            <Select onValueChange={handleGoalChange} value={selectedGoal?.id || ''}>\n              <SelectTrigger>\n                <SelectValue placeholder=\"Select a goal to view progress...\" />\n              </SelectTrigger>\n              <SelectContent>\n                {goals.map((goal) => (\n                  <SelectItem key={goal.id} value={goal.id}>\n                    <div className=\"flex items-center gap-2\">\n                      <span>🎯</span>\n                      <span>{goal.title}</span>\n                      <Badge variant=\"secondary\" className=\"text-xs\">\n                        {goal.goal_type.replace('_', ' ')}\n                      </Badge>\n                    </div>\n                  </SelectItem>\n                ))}\n              </SelectContent>\n            </Select>\n          </CardContent>\n        </Card>\n      )}\n\n      {/* Progress Data */}\n      {loading ? (\n        <div className=\"flex items-center justify-center h-32\">\n          <div className=\"animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600\"></div>\n        </div>\n      ) : progressData ? (\n        <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6\">\n          {/* Goal Overview */}\n          <Card className=\"md:col-span-2\">\n            <CardHeader>\n              <CardTitle className=\"flex items-center gap-2\">\n                <Target className=\"w-5 h-5 text-indigo-600\" />\n                {progressData.goal.title}\n              </CardTitle>\n              <CardDescription className=\"capitalize\">\n                {progressData.goal.goal_type.replace('_', ' ')} • Active for {progressData.daysActive} days\n              </CardDescription>\n            </CardHeader>\n            <CardContent>\n              <div className=\"space-y-4\">\n                {/* Progress Bar */}\n                {progressData.goal.target_value && (\n                  <div>\n                    <div className=\"flex justify-between text-sm mb-2\">\n                      <span>Progress</span>\n                      <span className=\"font-medium\">{progressData.progressPercentage.toFixed(1)}%</span>\n                    </div>\n                    <div className=\"w-full bg-gray-200 rounded-full h-3\">\n                      <div \n                        className=\"bg-indigo-600 h-3 rounded-full transition-all duration-500\"\n                        style={{ width: `${progressData.progressPercentage}%` }}\n                      ></div>\n                    </div>\n                    <div className=\"flex justify-between text-xs text-gray-500 mt-1\">\n                      <span>{progressData.goal.current_value} {progressData.goal.target_unit}</span>\n                      <span>{progressData.goal.target_value} {progressData.goal.target_unit}</span>\n                    </div>\n                  </div>\n                )}\n                \n                {/* Goal Description */}\n                {progressData.goal.description && (\n                  <p className=\"text-sm text-gray-600\">{progressData.goal.description}</p>\n                )}\n              </div>\n            </CardContent>\n          </Card>\n\n          {/* Spending Summary */}\n          <Card>\n            <CardHeader className=\"pb-3\">\n              <CardTitle className=\"text-base flex items-center gap-2\">\n                <DollarSign className=\"w-4 h-4\" />\n                Spending\n              </CardTitle>\n            </CardHeader>\n            <CardContent>\n              <div className=\"space-y-3\">\n                <div className=\"text-center\">\n                  <p className=\"text-2xl font-bold text-green-600\">₹{progressData.totalSpent.toFixed(2)}</p>\n                  <p className=\"text-xs text-gray-500\">Total Spent</p>\n                </div>\n                \n                {progressData.goal.goal_type === 'budget_eating' && progressData.goal.target_value && (\n                  <div className=\"bg-green-50 p-2 rounded\">\n                    <div className=\"text-xs text-green-700 mb-1\">\n                      Budget: ₹{progressData.goal.target_value}\n                    </div>\n                    <div className=\"w-full bg-green-200 rounded-full h-1.5\">\n                      <div \n                        className={`h-1.5 rounded-full ${\n                          progressData.budgetStatus === 'over' ? 'bg-red-500' :\n                          progressData.budgetStatus === 'under' ? 'bg-blue-500' : 'bg-green-500'\n                        }`}\n                        style={{ width: `${Math.min(100, (progressData.totalSpent / progressData.goal.target_value) * 100)}%` }}\n                      ></div>\n                    </div>\n                    <p className=\"text-xs mt-1 ${\n                      progressData.budgetStatus === 'over' ? 'text-red-600' :\n                      progressData.budgetStatus === 'under' ? 'text-blue-600' : 'text-green-600'\n                    }\">\n                      {progressData.budgetStatus === 'over' ? 'Over Budget' :\n                       progressData.budgetStatus === 'under' ? 'Under Budget' : 'On Track'}\n                    </p>\n                  </div>\n                )}\n                \n                <div className=\"grid grid-cols-2 gap-2 text-xs\">\n                  <div className=\"text-center bg-gray-50 p-2 rounded\">\n                    <p className=\"font-medium\">{progressData.itemCount}</p>\n                    <p className=\"text-gray-500\">Grocery Items</p>\n                  </div>\n                  <div className=\"text-center bg-gray-50 p-2 rounded\">\n                    <p className=\"font-medium\">{progressData.expenseCount}</p>\n                    <p className=\"text-gray-500\">Expenses</p>\n                  </div>\n                </div>\n              </div>\n            </CardContent>\n          </Card>\n\n          {/* Nutrition Summary */}\n          <Card>\n            <CardHeader className=\"pb-3\">\n              <CardTitle className=\"text-base flex items-center gap-2\">\n                🍎 Nutrition\n              </CardTitle>\n            </CardHeader>\n            <CardContent>\n              <div className=\"space-y-3\">\n                <div className=\"text-center\">\n                  <p className=\"text-xl font-bold text-orange-600\">{progressData.totalCalories.toFixed(0)}</p>\n                  <p className=\"text-xs text-gray-500\">Total Calories</p>\n                </div>\n                \n                <div className=\"text-center\">\n                  <p className=\"text-xl font-bold text-blue-600\">{progressData.totalProtein.toFixed(1)}g</p>\n                  <p className=\"text-xs text-gray-500\">Total Protein</p>\n                </div>\n                \n                {/* Daily Averages */}\n                <div className=\"bg-blue-50 p-2 rounded text-xs\">\n                  <div className=\"flex justify-between mb-1\">\n                    <span>Daily Avg Calories:</span>\n                    <span className=\"font-medium\">{progressData.nutritionInsights.dailyCalorieAverage.toFixed(0)}</span>\n                  </div>\n                  <div className=\"flex justify-between\">\n                    <span>Daily Avg Protein:</span>\n                    <span className=\"font-medium\">{progressData.nutritionInsights.dailyProteinAverage.toFixed(1)}g</span>\n                  </div>\n                  \n                  {/* Goal comparison */}\n                  {progressData.goal.metadata?.target_calories && (\n                    <div className=\"mt-2 pt-2 border-t border-blue-200\">\n                      <div className=\"flex justify-between\">\n                        <span>Calorie Target:</span>\n                        <span className={progressData.nutritionInsights.dailyCalorieAverage <= progressData.goal.metadata.target_calories ? 'text-green-600' : 'text-red-600'}>\n                          {progressData.goal.metadata.target_calories}/day\n                        </span>\n                      </div>\n                    </div>\n                  )}\n                </div>\n              </div>\n            </CardContent>\n          </Card>\n\n          {/* Timeline & Insights */}\n          <Card>\n            <CardHeader className=\"pb-3\">\n              <CardTitle className=\"text-base flex items-center gap-2\">\n                <Calendar className=\"w-4 h-4\" />\n                Timeline\n              </CardTitle>\n            </CardHeader>\n            <CardContent>\n              <div className=\"space-y-3 text-sm\">\n                <div className=\"flex justify-between\">\n                  <span>Started:</span>\n                  <span className=\"font-medium\">{new Date(progressData.goal.start_date).toLocaleDateString()}</span>\n                </div>\n                \n                {progressData.goal.end_date && (\n                  <div className=\"flex justify-between\">\n                    <span>Target Date:</span>\n                    <span className=\"font-medium\">{new Date(progressData.goal.end_date).toLocaleDateString()}</span>\n                  </div>\n                )}\n                \n                <div className=\"flex justify-between\">\n                  <span>Days Active:</span>\n                  <span className=\"font-medium\">{progressData.daysActive}</span>\n                </div>\n                \n                {/* Quick Insights */}\n                <div className=\"bg-purple-50 p-2 rounded\">\n                  <p className=\"text-xs font-medium text-purple-700 mb-1\">Quick Insights:</p>\n                  <ul className=\"text-xs text-purple-600 space-y-1\">\n                    <li>\n                      • Avg spending: ₹{(progressData.totalSpent / Math.max(1, progressData.daysActive)).toFixed(1)}/day\n                    </li>\n                    {progressData.goal.goal_type === 'weight_loss' && (\n                      <li>\n                        • {progressData.nutritionInsights.dailyCalorieAverage <= (progressData.goal.metadata?.target_calories || 2000) ? \n                           '✅ Staying within calorie goals' : '⚠️ Exceeding calorie targets'}\n                      </li>\n                    )}\n                    {progressData.goal.goal_type === 'muscle_gain' && (\n                      <li>\n                        • {progressData.nutritionInsights.dailyProteinAverage >= (progressData.goal.metadata?.target_protein || 100) ? \n                           '✅ Meeting protein targets' : '⚠️ Need more protein'}\n                      </li>\n                    )}\n                  </ul>\n                </div>\n              </div>\n            </CardContent>\n          </Card>\n        </div>\n      ) : selectedGoal ? (\n        <Card>\n          <CardContent className=\"text-center p-8\">\n            <p className=\"text-gray-500\">No data found for this goal yet.</p>\n            <p className=\"text-sm text-gray-400 mt-2\">Start adding groceries and expenses to see your progress!</p>\n          </CardContent>\n        </Card>\n      ) : null}\n      \n      {/* Detailed Breakdown (if data exists) */}\n      {progressData && (\n        <Card>\n          <CardHeader>\n            <CardTitle className=\"text-lg\">Detailed Breakdown</CardTitle>\n            <CardDescription>Comprehensive analysis of your goal progress</CardDescription>\n          </CardHeader>\n          <CardContent>\n            <div className=\"grid grid-cols-1 md:grid-cols-3 gap-6\">\n              {/* Weekly Nutrition Projection */}\n              {progressData.nutritionInsights.weeklyCalorieTarget > 0 && (\n                <div className=\"bg-orange-50 p-4 rounded-lg\">\n                  <h4 className=\"font-semibold text-orange-800 mb-2\">Weekly Nutrition</h4>\n                  <div className=\"space-y-2 text-sm\">\n                    <div className=\"flex justify-between\">\n                      <span>Calorie Target:</span>\n                      <span className=\"font-medium\">{progressData.nutritionInsights.weeklyCalorieTarget}</span>\n                    </div>\n                    <div className=\"flex justify-between\">\n                      <span>Current Track:</span>\n                      <span className=\"font-medium\">{(progressData.nutritionInsights.dailyCalorieAverage * 7).toFixed(0)}</span>\n                    </div>\n                    <div className=\"w-full bg-orange-200 rounded-full h-2\">\n                      <div \n                        className=\"bg-orange-500 h-2 rounded-full\"\n                        style={{ width: `${Math.min(100, ((progressData.nutritionInsights.dailyCalorieAverage * 7) / progressData.nutritionInsights.weeklyCalorieTarget) * 100)}%` }}\n                      ></div>\n                    </div>\n                  </div>\n                </div>\n              )}\n              \n              {/* Budget Projection */}\n              {progressData.goal.goal_type === 'budget_eating' && progressData.goal.target_value && (\n                <div className=\"bg-green-50 p-4 rounded-lg\">\n                  <h4 className=\"font-semibold text-green-800 mb-2\">Budget Analysis</h4>\n                  <div className=\"space-y-2 text-sm\">\n                    <div className=\"flex justify-between\">\n                      <span>Budget:</span>\n                      <span className=\"font-medium\">₹{progressData.goal.target_value}</span>\n                    </div>\n                    <div className=\"flex justify-between\">\n                      <span>Spent:</span>\n                      <span className={`font-medium ${\n                        progressData.budgetStatus === 'over' ? 'text-red-600' :\n                        progressData.budgetStatus === 'under' ? 'text-blue-600' : 'text-green-600'\n                      }`}>\n                        ₹{progressData.totalSpent.toFixed(2)}\n                      </span>\n                    </div>\n                    <div className=\"flex justify-between\">\n                      <span>Remaining:</span>\n                      <span className=\"font-medium\">\n                        ₹{Math.max(0, progressData.goal.target_value - progressData.totalSpent).toFixed(2)}\n                      </span>\n                    </div>\n                    \n                    {progressData.goal.metadata?.budget_type && (\n                      <Badge variant=\"outline\" className=\"text-xs\">\n                        {progressData.goal.metadata.budget_type} budget\n                      </Badge>\n                    )}\n                  </div>\n                </div>\n              )}\n              \n              {/* Performance Indicators */}\n              <div className=\"bg-purple-50 p-4 rounded-lg\">\n                <h4 className=\"font-semibold text-purple-800 mb-2\">Performance</h4>\n                <div className=\"space-y-2\">\n                  {progressData.goal.goal_type === 'weight_loss' && (\n                    <div className=\"flex items-center gap-2\">\n                      {progressData.nutritionInsights.dailyCalorieAverage <= (progressData.goal.metadata?.target_calories || 2000) ? (\n                        <>\n                          <TrendingUp className=\"w-4 h-4 text-green-500\" />\n                          <span className=\"text-sm text-green-700\">Calorie goals met</span>\n                        </>\n                      ) : (\n                        <>\n                          <TrendingDown className=\"w-4 h-4 text-red-500\" />\n                          <span className=\"text-sm text-red-700\">Over calorie target</span>\n                        </>\n                      )}\n                    </div>\n                  )}\n                  \n                  {progressData.goal.goal_type === 'muscle_gain' && (\n                    <div className=\"flex items-center gap-2\">\n                      {progressData.nutritionInsights.dailyProteinAverage >= (progressData.goal.metadata?.target_protein || 100) ? (\n                        <>\n                          <TrendingUp className=\"w-4 h-4 text-green-500\" />\n                          <span className=\"text-sm text-green-700\">Protein goals met</span>\n                        </>\n                      ) : (\n                        <>\n                          <TrendingDown className=\"w-4 h-4 text-red-500\" />\n                          <span className=\"text-sm text-red-700\">Need more protein</span>\n                        </>\n                      )}\n                    </div>\n                  )}\n                  \n                  <div className=\"flex items-center gap-2\">\n                    {progressData.budgetStatus === 'under' ? (\n                      <>\n                        <TrendingUp className=\"w-4 h-4 text-blue-500\" />\n                        <span className=\"text-sm text-blue-700\">Under budget</span>\n                      </>\n                    ) : progressData.budgetStatus === 'over' ? (\n                      <>\n                        <TrendingDown className=\"w-4 h-4 text-red-500\" />\n                        <span className=\"text-sm text-red-700\">Over budget</span>\n                      </>\n                    ) : (\n                      <>\n                        <TrendingUp className=\"w-4 h-4 text-green-500\" />\n                        <span className=\"text-sm text-green-700\">Budget on track</span>\n                      </>\n                    )}\n                  </div>\n                </div>\n              </div>\n            </div>\n          </CardContent>\n        </Card>\n      )}\n    </div>\n  );\n}
