import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Target, Calendar, TrendingUp, X, Save } from 'lucide-react';

interface Goal {
  id: string;
  goal_type: string;
  title: string;
  description?: string;
  target_value?: number;
  target_unit?: string;
  current_value: number;
  start_date: string;
  end_date?: string;
  status: 'active' | 'completed' | 'paused';
  metadata?: any;
  created_at: string;
}

interface NewGoalForm {
  goal_type: string;
  title: string;
  description: string;
  target_value: number;
  target_unit: string;
  end_date: string;
  metadata: any;
}

const GOAL_TYPES = [
  { value: 'weight_loss', label: 'Weight Loss', unit: 'kg', icon: '🏃‍♀️' },
  { value: 'muscle_gain', label: 'Muscle Gain', unit: 'kg', icon: '💪' },
  { value: 'budget_eating', label: 'Budget Eating', unit: 'rupees', icon: '💰' },
  { value: 'healthy_eating', label: 'Healthy Eating', unit: 'score', icon: '🥗' },
  { value: 'save_money', label: 'Save Money', unit: 'rupees', icon: '🏦' },
  { value: 'fitness', label: 'Fitness Goal', unit: 'days', icon: '🏋️' },
  { value: 'nutrition', label: 'Nutrition Target', unit: 'calories', icon: '🍎' }
];

export default function Goals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newGoal, setNewGoal] = useState<NewGoalForm>({
    goal_type: '',
    title: '',
    description: '',
    target_value: 0,
    target_unit: '',
    end_date: '',
    metadata: {}
  });

  // Fetch user's goals
  const fetchGoals = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGoals(data || []);
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, [user]);

  // Handle goal type selection in modal
  const handleGoalTypeChange = (goalType: string) => {
    const goalTypeConfig = GOAL_TYPES.find(gt => gt.value === goalType);
    setNewGoal(prev => ({
      ...prev,
      goal_type: goalType,
      target_unit: goalTypeConfig?.unit || '',
      title: goalTypeConfig?.label || '',
      metadata: goalType === 'weight_loss' ? { target_calories: 1800, target_protein: 120 } :
                goalType === 'budget_eating' ? { budget_type: 'monthly', categories: ['groceries'] } :
                goalType === 'muscle_gain' ? { target_calories: 2500, target_protein: 150 } : {}
    }));
  };

  // Create new goal
  const handleCreateGoal = async () => {
    if (!user?.id || !newGoal.goal_type || !newGoal.title) return;
    
    try {
      setSaving(true);
      
      const goalData = {
        user_id: user.id,
        goal_type: newGoal.goal_type,
        title: newGoal.title,
        description: newGoal.description || null,
        target_value: newGoal.target_value || null,
        target_unit: newGoal.target_unit || null,
        start_date: new Date().toISOString().split('T')[0], // Today's date
        end_date: newGoal.end_date || null,
        status: 'active',
        metadata: Object.keys(newGoal.metadata).length > 0 ? newGoal.metadata : null
      };

      const { data, error } = await supabase
        .from('goals')
        .insert([goalData])
        .select()
        .single();

      if (error) throw error;

      setGoals(prev => [data, ...prev]);
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error creating goal:', error);
      alert('Failed to create goal. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setNewGoal({
      goal_type: '',
      title: '',
      description: '',
      target_value: 0,
      target_unit: '',
      end_date: '',
      metadata: {}
    });
  };

  // Calculate progress percentage
  const calculateProgress = (goal: Goal) => {
    if (!goal.target_value || goal.target_value === 0) return 0;
    return Math.min(100, Math.max(0, (goal.current_value / goal.target_value) * 100));
  };

  // Get days remaining
  const getDaysRemaining = (endDate?: string) => {
    if (!endDate) return null;
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Goals</h1>
          <p className="text-gray-600 mt-2">Track your health, fitness, and financial objectives</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Goal
        </button>
      </div>

      {/* Goals Grid */}
      {goals.length === 0 ? (
        <div className="text-center py-12">
          <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Goals Yet</h3>
          <p className="text-gray-500 mb-6">Start your journey by creating your first goal!</p>
          <button
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Create Your First Goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map((goal) => {
            const goalTypeConfig = GOAL_TYPES.find(gt => gt.value === goal.goal_type);
            const progress = calculateProgress(goal);
            const daysRemaining = getDaysRemaining(goal.end_date);
            
            return (
              <div key={goal.id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
                {/* Goal Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{goalTypeConfig?.icon || '🎯'}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900">{goal.title}</h3>
                      <p className="text-sm text-gray-500 capitalize">{goal.goal_type.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    goal.status === 'active' ? 'bg-green-100 text-green-800' :
                    goal.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {goal.status}
                  </span>
                </div>

                {/* Description */}
                {goal.description && (
                  <p className="text-gray-600 text-sm mb-4">{goal.description}</p>
                )}

                {/* Progress */}
                {goal.target_value && (
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-medium">{progress.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>{goal.current_value} {goal.target_unit}</span>
                      <span>{goal.target_value} {goal.target_unit}</span>
                    </div>
                  </div>
                )}

                {/* Timeline */}
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(goal.start_date).toLocaleDateString()}</span>
                  </div>
                  {daysRemaining !== null && (
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" />
                      <span className={daysRemaining < 7 ? 'text-red-500 font-medium' : ''}>
                        {daysRemaining > 0 ? `${daysRemaining} days left` : 'Overdue'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Goal Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">Create New Goal</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Goal Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Goal Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {GOAL_TYPES.map((goalType) => (
                    <button
                      key={goalType.value}
                      onClick={() => handleGoalTypeChange(goalType.value)}
                      className={`p-3 rounded-lg border-2 text-left transition-colors ${
                        newGoal.goal_type === goalType.value
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{goalType.icon}</span>
                        <span className="text-sm font-medium">{goalType.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Goal Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Goal Title</label>
                <input
                  type="text"
                  value={newGoal.title}
                  onChange={(e) => setNewGoal(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., My Weight Loss Journey"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                <textarea
                  value={newGoal.description}
                  onChange={(e) => setNewGoal(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your goal in detail..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Target Value */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Target Value</label>
                  <input
                    type="number"
                    value={newGoal.target_value || ''}
                    onChange={(e) => setNewGoal(prev => ({ ...prev, target_value: parseFloat(e.target.value) || 0 }))}
                    placeholder="65"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
                  <input
                    type="text"
                    value={newGoal.target_unit}
                    onChange={(e) => setNewGoal(prev => ({ ...prev, target_unit: e.target.value }))}
                    placeholder="kg"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Target Date (Optional)</label>
                <input
                  type="date"
                  value={newGoal.end_date}
                  onChange={(e) => setNewGoal(prev => ({ ...prev, end_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Goal-specific metadata inputs */}
              {newGoal.goal_type === 'weight_loss' && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Daily Calories</label>
                    <input
                      type="number"
                      value={newGoal.metadata.target_calories || 1800}
                      onChange={(e) => setNewGoal(prev => ({
                        ...prev,
                        metadata: { ...prev.metadata, target_calories: parseInt(e.target.value) || 1800 }
                      }))}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Daily Protein (g)</label>
                    <input
                      type="number"
                      value={newGoal.metadata.target_protein || 120}
                      onChange={(e) => setNewGoal(prev => ({
                        ...prev,
                        metadata: { ...prev.metadata, target_protein: parseInt(e.target.value) || 120 }
                      }))}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                </div>
              )}

              {newGoal.goal_type === 'budget_eating' && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Budget Period</label>
                  <select
                    value={newGoal.metadata.budget_type || 'monthly'}
                    onChange={(e) => setNewGoal(prev => ({
                      ...prev,
                      metadata: { ...prev.metadata, budget_type: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                  </select>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGoal}
                disabled={saving || !newGoal.goal_type || !newGoal.title}
                className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Create Goal
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
