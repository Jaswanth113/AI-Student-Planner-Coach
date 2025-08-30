import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useToast } from '../hooks/use-toast';
import { useAgent } from '../hooks/useAgent'; // Import useAgent
import { supabase } from '../integrations/supabase/client'; // Import the shared client
import { BookOpen, Calendar, Target, Clock, Brain, CheckSquare, TrendingUp, Award, Trash2, AlertTriangle } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { useData } from '../contexts/DataContext';

interface MilestoneTask {
  id?: string;
  title?: string;
  description?: string;
  completed?: boolean;
  due_date?: string;
}

interface Milestone {
  week: number;
  title: string;
  description?: string;
  topics_covered?: string[];
  tasks?: string[];
  learning_objectives?: string[];
  resources?: string[];
  estimated_hours?: number;
  [key: string]: any; // For any additional properties
}

type MilestoneType = string | Milestone;

interface LearningPlan {
  id: string;
  topic: string;
  duration_months: number;
  weekly_milestones: MilestoneType[];
  created_at: string;
}

export default function Learn() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState('1');
  const [loading, setLoading] = useState(false); // Keep local loading for form submission
  const [learningPlans, setLearningPlans] = useState<LearningPlan[]>([]);
  const [planToDelete, setPlanToDelete] = useState<LearningPlan | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { sendMessageToAgent, loading: agentLoading } = useAgent(); // Use useAgent hook
  // Removed local conversationHistory state as it's managed by useAgent

  const fetchLearningPlans = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('learning_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Ensure we have unique plans and valid data
      const uniquePlans = data.reduce((acc: any[], plan) => {
        // Skip if plan ID already exists
        if (acc.some(p => p.id === plan.id)) return acc;
        
        // Ensure weekly_milestones is an array
        acc.push({
          ...plan,
          weekly_milestones: Array.isArray(plan.weekly_milestones) 
            ? plan.weekly_milestones 
            : []
        });
        return acc;
      }, []);
      
      setLearningPlans(uniquePlans as LearningPlan[]);
    } catch (error) {
      console.error('Error fetching learning plans:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch learning plans. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLearningPlans();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !topic || !duration) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in both topic and duration.',
        variant: 'destructive',
      });
      return;
    }

    // Check for duplicates with a more specific check
    const normalizedTopic = topic.trim().toLowerCase();
    const isDuplicate = learningPlans.some(plan => 
      plan.topic.trim().toLowerCase() === normalizedTopic
    );

    if (isDuplicate) {
      toast({
        title: 'Duplicate Topic',
        description: 'A learning plan with this exact topic already exists.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    
    try {
      // Directly call the backend API to generate the learning plan
      const response = await fetch('http://localhost:8000/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userInput: `Create a detailed learning plan for ${topic} over ${duration} months`,
          userId: user.id,
          plan_details: {
            topic: topic,
            duration_months: parseInt(duration),
            duration_text: `${duration} month${parseInt(duration) > 1 ? 's' : ''}`
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate learning plan');
      }

      const result = await response.json();

      if (result.type === 'error') {
        throw new Error(result.detail || result.message || 'Failed to generate learning plan');
      }

      // Refresh the list of plans
      await fetchLearningPlans();
      
      toast({
        title: 'Success!',
        description: 'Your learning plan has been created successfully.',
      });
      
      setTopic('');
      setDuration('1');
      
    } catch (error: any) {
      console.error('Error creating learning plan:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create learning plan. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Check for duplicate topics to prevent multiple plans for the same subject
  const hasDuplicateTopic = (newTopic: string) => {
    if (!newTopic.trim() || !learningPlans.length) return false;
    
    const normalizedNewTopic = newTopic.toLowerCase().trim();
    return learningPlans.some(plan => {
      const normalizedPlanTopic = plan.topic.toLowerCase().trim();
      // Only check for exact matches to prevent false positives
      return normalizedPlanTopic === normalizedNewTopic;
    });
  };

  const { tasks, addTask } = useData();
  
  // Function to extend a learning plan milestones to tasks
  const convertToTasks = async (plan: LearningPlan) => {
    const tasksCreated = [];
    const startDate = new Date();
    
    for (let i = 0; i < plan.weekly_milestones.length; i++) {
      const milestone = plan.weekly_milestones[i];
      const dueDate = new Date(startDate);
      dueDate.setDate(startDate.getDate() + (i + 1) * 7); // Each milestone is due a week later
      
      // Ensure milestone is always treated as a Milestone object for consistent access
      const milestoneObj: Milestone = typeof milestone === 'string' 
        ? { 
            week: i + 1, 
            title: milestone, 
            description: `Learning milestone for ${plan.topic} - Week ${i + 1}`,
            tasks: [],
            learning_objectives: [],
            resources: [],
            estimated_hours: 0
          } 
        : milestone;

      const taskData = {
        title: `${plan.topic}: ${milestoneObj.title}`,
        description: milestoneObj.description,
        priority: 2 as const,
        // If estimated_hours is available, distribute it among tasks, otherwise default to 2 hours per task
        estimate: milestoneObj.estimated_hours && milestoneObj.tasks && milestoneObj.tasks.length > 0
          ? Math.round((milestoneObj.estimated_hours * 60) / milestoneObj.tasks.length)
          : 120, 
        due_date: dueDate.toISOString(),
        due_date_local: dueDate.toISOString(),
        tags: ['learning', plan.topic.toLowerCase().replace(/\s+/g, '-')],
        status: 'Planned' as const,
      };
      
      try {
        const result = await addTask(taskData);
        if (result.data) {
          tasksCreated.push(result.data);
        }
      } catch (error) {
        console.error('Error creating task for milestone:', milestone, error);
      }
    }
    
    toast({
      title: 'Tasks Created!',
      description: `Created ${tasksCreated.length} learning tasks for ${plan.topic}`,
    });
  };

  // Function to confirm and delete a learning plan
  const confirmDeletePlan = (plan: LearningPlan) => {
    setPlanToDelete(plan);
  };

  // Function to delete a learning plan
  const deletePlan = async () => {
    if (!user || !planToDelete) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('learning_plans')
        .delete()
        .eq('id', planToDelete.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `"${planToDelete.topic}" has been deleted.`,
      });

      // Refresh the list of plans and close the dialog
      await fetchLearningPlans();
      setPlanToDelete(null);
    } catch (error) {
      console.error('Error deleting learning plan:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete learning plan. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Function to extend a learning plan with additional weeks
  const extendPlan = async (planId: string) => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to extend a learning plan.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setLoading(true);
      
      // Show loading toast
      const loadingToast = toast({
        title: 'Extending Learning Plan',
        description: 'Adding more weeks to your learning plan...',
        variant: 'default',
      });
      
      // Call the API to extend the learning plan
      const response = await fetch('http://localhost:8000/api/extend-learning-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': user.id,
        },
        body: JSON.stringify({
          plan_id: planId,
          additional_weeks: 4, // Default to extending by 4 weeks
        }),
      });

      // Parse the response
      const result = await response.json();
      
      // Dismiss the loading toast
      loadingToast.dismiss();

      if (!response.ok) {
        throw new Error(result.detail || result.error || 'Failed to extend learning plan');
      }

      // Show success message
      toast({
        title: 'Success!',
        description: `Successfully extended learning plan with ${result.new_weeks_added} additional weeks. Total weeks: ${result.total_weeks}`,
        variant: 'default',
      });

      // Refresh the list of plans to show the updated version
      await fetchLearningPlans();
      
      // Log the successful extension
      console.log(`Extended learning plan ${planId} with ${result.new_weeks_added} weeks`);
      
    } catch (error: any) {
      console.error('Error extending learning plan:', error);
      
      // Show error toast with details
      toast({
        title: 'Error',
        description: error.message || 'An error occurred while extending the learning plan. Please try again.',
        variant: 'destructive',
      });
      
      // Log detailed error for debugging
      console.error('Error details:', {
        planId,
        error: error.message,
        stack: error.stack,
      });
      
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Brain className="w-8 h-8 text-indigo-600" />
          Personal Learning Coach
        </h1>
        <p className="text-lg text-muted-foreground">
          AI-powered learning plans tailored to your schedule and goals
        </p>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Plans</p>
                <p className="text-2xl font-bold text-indigo-600">{learningPlans.length}</p>
              </div>
              <BookOpen className="w-8 h-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Learning Tasks</p>
                <p className="text-2xl font-bold text-green-600">
                  {tasks.filter(t => t.tags?.includes('learning') && t.status !== 'Done').length}
                </p>
              </div>
              <CheckSquare className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-purple-600">
                  {tasks.filter(t => t.tags?.includes('learning') && t.status === 'Done').length}
                </p>
              </div>
              <Award className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create New Plan */}
      <Card className="border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Target className="w-6 h-6 text-indigo-600" />
            Create New Learning Plan
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Generate a personalized learning roadmap with AI-powered milestones
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="topic" className="text-sm font-medium">What would you like to learn?</Label>
                <Input
                  id="topic"
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Python, Web Development, Machine Learning, Data Structures"
                  className="mt-1"
                  required
                />
                {topic && hasDuplicateTopic(topic) && (
                  <p className="text-sm text-amber-600 mt-1 flex items-center gap-1">
                    <span>⚠️</span>
                    Similar learning plan already exists
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="duration" className="text-sm font-medium">Learning Duration</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select timeframe" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {m} Month{m > 1 ? 's' : ''} ({Math.round(m * 4.33)} weeks)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button 
              type="submit" 
              disabled={loading || agentLoading || (topic && hasDuplicateTopic(topic))}
              className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700"
            >
              {(loading || agentLoading) ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating Plan...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Generate Learning Plan
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Learning Plans */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Your Learning Plans</h2>
          {learningPlans.length > 0 && (
            <Badge variant="outline" className="px-3 py-1">
              {learningPlans.length} plan{learningPlans.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {learningPlans.length === 0 ? (
          <Card className="p-12 text-center">
            <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">No Learning Plans Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first AI-powered learning plan to get started on your educational journey!
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {learningPlans.map((plan, index) => {
              const weeksPassed = Math.floor((new Date().getTime() - new Date(plan.created_at).getTime()) / (1000 * 60 * 60 * 24 * 7));
              const totalWeeks = plan.weekly_milestones.length;
              const progress = Math.min((weeksPassed / totalWeeks) * 100, 100);
              const completedTasks = tasks.filter(t => 
                t.tags?.includes('learning') && 
                t.tags?.includes(plan.topic.toLowerCase().replace(/\s+/g, '-')) &&
                t.status === 'Done'
              ).length;
              
              return (
                <Card key={plan.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  {/* Plan Header */}
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                          <BookOpen className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold">{plan.topic}</h3>
                          <p className="text-indigo-100 text-sm">
                            {plan.duration_months} month{plan.duration_months !== 1 ? 's' : ''} • {totalWeeks} weeks
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                        Week {Math.min(weeksPassed + 1, totalWeeks)} of {totalWeeks}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{Math.round(progress)}% complete</span>
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-2">
                        <div 
                          className="bg-white h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Plan Content */}
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>Started {new Date(plan.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-4 h-4" />
                          <span>{completedTasks} tasks completed</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => convertToTasks(plan)}
                          className="gap-1"
                        >
                          <Target className="w-4 h-4" />
                          Create Tasks
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => extendPlan(plan.id)}
                          disabled={loading}
                          className="gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200"
                        >
                          {loading ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-indigo-600 mr-1"></div>
                              Extending...
                            </>
                          ) : (
                            <>
                              <Clock className="w-4 h-4" />
                              Extend
                            </>
                          )}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => confirmDeletePlan(plan)}
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          title="Delete Plan"
                          disabled={isDeleting}
                        >
                          {isDeleting ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600 mr-1"></div>
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <Accordion type="single" collapsible className="mt-4">
                      <AccordionItem value={plan.id} className="border-none">
                        <AccordionTrigger className="hover:no-underline py-2">
                          <span className="font-semibold text-left">View Weekly Milestones ({plan.weekly_milestones.length})</span>
                        </AccordionTrigger>
                        <AccordionContent className="pt-4">
                          <div className="space-y-3">
                            {plan.weekly_milestones.map((milestone: MilestoneType, index: number) => {
                              const isCurrentWeek = index === weeksPassed;
                              const isCompleted = index < weeksPassed;
                              const weekNumber = index + 1;
                              
                              // Handle both string and object milestone formats
                              const milestoneTitle = typeof milestone === 'string' 
                                ? milestone 
                                : milestone.title || `Week ${milestone.week || weekNumber}`;
                              
                              const milestoneDescription = typeof milestone === 'object' 
                                ? milestone.description 
                                : '';
                              
                              const milestoneTasks = typeof milestone === 'object' 
                                ? milestone.tasks 
                                : [];
                              
                              return (
                                <div 
                                  key={index} 
                                  className={`p-4 rounded-lg border-l-4 transition-colors ${
                                    isCurrentWeek 
                                      ? 'border-l-indigo-500 bg-indigo-50' 
                                      : isCompleted 
                                        ? 'border-l-green-500 bg-green-50' 
                                        : 'border-l-gray-300 bg-gray-50'
                                  }`}
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <Badge 
                                          variant={isCurrentWeek ? 'default' : isCompleted ? 'secondary' : 'outline'}
                                          className="text-xs"
                                        >
                                          Week {weekNumber}
                                        </Badge>
                                        {isCompleted && <CheckSquare className="w-4 h-4 text-green-600" />}
                                        {isCurrentWeek && <Clock className="w-4 h-4 text-indigo-600" />}
                                      </div>
                                      
                                      <h4 className="font-medium text-base mb-1">{milestoneTitle}</h4>
                                      
                                      {milestoneDescription && (
                                        <p className="text-sm text-gray-700 mb-2">{milestoneDescription}</p>
                                      )}

                                      {typeof milestone === 'object' && milestone.topics_covered && milestone.topics_covered.length > 0 && (
                                        <div className="mt-3 mb-3">
                                          <p className="text-xs font-medium text-gray-500 mb-2">Topics Covered:</p>
                                          <div className="flex flex-wrap gap-2">
                                            {milestone.topics_covered.map((topic: string, idx: number) => (
                                              <Badge key={idx} variant="secondary" className="text-xs">
                                                {topic}
                                              </Badge>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {typeof milestone === 'object' && milestone.learning_objectives && milestone.learning_objectives.length > 0 && (
                                        <div className="mt-3 mb-3">
                                          <p className="text-xs font-medium text-gray-500 mb-1">Learning Objectives:</p>
                                          <ul className="space-y-1 text-sm">
                                            {milestone.learning_objectives.map((objective: string, idx: number) => (
                                              <li key={idx} className="flex items-start">
                                                <span className="text-green-500 mr-2">✓</span>
                                                <span>{objective}</span>
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                      
                                      {milestoneTasks.length > 0 && (
                                        <div className="mt-4 mb-4">
                                          <p className="text-xs font-medium text-gray-500 mb-2">This Week's Tasks:</p>
                                          <ul className="space-y-3">
                                            {milestoneTasks.map((task: string, taskIndex: number) => {
                                              // Extract time estimate if present in the task string
                                              const timeMatch = task.match(/\((\d+h?\s*\d*m?)\)/);
                                              const timeEstimate = timeMatch ? timeMatch[1] : null;
                                              const taskText = timeMatch ? task.replace(/\(\d+h?\s*\d*m?\)/, '').trim() : task;
                                              
                                              return (
                                                <li key={taskIndex} className="flex items-start p-3 bg-white rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                                  <span className="flex-shrink-0 w-5 h-5 mt-0.5 mr-3 border border-gray-300 rounded flex items-center justify-center group">
                                                    <input 
                                                      type="checkbox" 
                                                      className="form-checkbox h-3.5 w-3.5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                                                      onChange={() => {}} // Add task completion logic here
                                                    />
                                                  </span>
                                                  <div className="flex-1">
                                                    <div className="flex items-start justify-between">
                                                      <span className="text-sm font-medium text-gray-800">{taskText}</span>
                                                      {timeEstimate && (
                                                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full ml-2 whitespace-nowrap">
                                                          {timeEstimate}
                                                        </span>
                                                      )}
                                                    </div>
                                                    
                                                    {/* Add subtasks or additional details here if needed */}
                                                  </div>
                                                </li>
                                              );
                                            })}
                                          </ul>
                                          
                                          {/* Estimated hours for the week */}
                                          {typeof milestone === 'object' && milestone.estimated_hours && (
                                            <div className="mt-3 flex items-center text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
                                              <Clock className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />
                                              <span>Total estimated time this week: <span className="font-medium">{milestone.estimated_hours} hours</span></span>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                      
                                      {/* Tips Section */}
                                      {typeof milestone === 'object' && milestone.tips && milestone.tips.length > 0 && (
                                        <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-r">
                                          <p className="text-xs font-medium text-yellow-800 mb-2 flex items-center">
                                            <svg className="w-3.5 h-3.5 mr-1.5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
                                            </svg>
                                            Pro Tips & Best Practices
                                          </p>
                                          <ul className="space-y-1.5 text-sm text-yellow-700">
                                            {milestone.tips.map((tip: string, tipIndex: number) => (
                                              <li key={tipIndex} className="flex items-start">
                                                <span className="mr-2">•</span>
                                                <span>{tip}</span>
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}

                                      {typeof milestone === 'object' && milestone.resources && milestone.resources.length > 0 && (
                                        <div className="mt-3">
                                          <p className="text-xs font-medium text-gray-500 mb-1">Recommended Resources:</p>
                                          <ul className="space-y-1 text-sm">
                                            {milestone.resources.map((resource: string, idx: number) => (
                                              <li key={idx} className="flex items-start">
                                                <span className="text-blue-500 mr-2">🔗</span>
                                                <a href="#" className="text-blue-600 hover:underline" onClick={(e) => {
                                                  e.preventDefault();
                                                  window.open(resource.includes('http') ? resource : `https://www.google.com/search?q=${encodeURIComponent(resource)}`, '_blank');
                                                }}>
                                                  {resource.length > 50 ? resource.substring(0, 50) + '...' : resource}
                                                </a>
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {planToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold">Delete Learning Plan</h3>
              </div>
              
              <p className="text-gray-700 mb-6">
                Are you sure you want to delete the learning plan "<span className="font-medium">{planToDelete.topic}</span>"? 
                This action cannot be undone.
              </p>
              
              <div className="flex justify-end gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setPlanToDelete(null)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={deletePlan}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isDeleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Deleting...
                    </>
                  ) : (
                    'Delete Plan'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
