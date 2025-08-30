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
import { BookOpen, Calendar, Target, Clock, Brain, CheckSquare, TrendingUp, Award } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { useData } from '../contexts/DataContext';

interface LearningPlan {
  id: string;
  topic: string;
  duration_months: number;
  weekly_milestones: string[];
  created_at: string;
}

export default function Learn() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState('1');
  const [loading, setLoading] = useState(false); // Keep local loading for form submission
  const [learningPlans, setLearningPlans] = useState<LearningPlan[]>([]);
  const { sendMessageToAgent, loading: agentLoading } = useAgent(); // Use useAgent hook
  // Removed local conversationHistory state as it's managed by useAgent

  const fetchLearningPlans = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('learning_plans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching learning plans:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch learning plans.',
        variant: 'destructive',
      });
    } else {
      setLearningPlans(data as LearningPlan[]);
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

    setLoading(true); // Keep local loading for form submission
    const userMessageContent = `Generate a plan for "${topic}" in ${duration} months`;

    try {
      const result = await sendMessageToAgent(userMessageContent); // Use sendMessageToAgent

      if (result.type === 'error') {
        throw new Error(result.detail || result.message || result.error || 'An unknown error occurred.');
      }

      if (result.type === 'plan_created' && result.plan) {
        toast({
          title: 'Success',
          description: result.message || 'Learning plan generated!',
        });

        // Save the generated plan to Supabase
        const { error: insertError } = await supabase.from('learning_plans').insert({
          user_id: user.id,
          topic: result.plan.topic, // Use topic from agent response
          duration_months: parseInt(duration), // Duration is still from local state
          weekly_milestones: result.plan.weekly_milestones,
        });

        if (insertError) {
          console.error('Error saving learning plan:', insertError);
          toast({
            title: 'Error',
            description: 'Failed to save learning plan.',
            variant: 'destructive',
          });
        } else {
          setTopic('');
          setDuration('1');
          fetchLearningPlans(); // Refresh the list of plans
        }
      } else {
        const errorMessage = result.message || result.text || 'Failed to generate learning plan.';
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error calling AI agent:', error);
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Check for duplicate topics to prevent multiple plans for the same subject
  const hasDuplicateTopic = (newTopic: string) => {
    return learningPlans.some(plan => 
      plan.topic.toLowerCase().includes(newTopic.toLowerCase()) || 
      newTopic.toLowerCase().includes(plan.topic.toLowerCase())
    );
  };

  const { tasks, addTask } = useData();
  
  // Function to convert plan milestones to tasks
  const convertToTasks = async (plan: LearningPlan) => {
    const tasksCreated = [];
    const startDate = new Date();
    
    for (let i = 0; i < plan.weekly_milestones.length; i++) {
      const milestone = plan.weekly_milestones[i];
      const dueDate = new Date(startDate);
      dueDate.setDate(startDate.getDate() + (i + 1) * 7); // Each milestone is due a week later
      
      const taskData = {
        title: `${plan.topic}: ${milestone}`,
        description: `Learning milestone for ${plan.topic} - Week ${i + 1}`,
        priority: 2 as const,
        estimate: 120, // 2 hours estimate for learning tasks
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
                          <CheckSquare className="w-4 h-4" />
                          <span>{completedTasks} tasks completed</span>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => convertToTasks(plan)}
                        className="gap-2"
                      >
                        <Target className="w-4 h-4" />
                        Create Tasks
                      </Button>
                    </div>

                    <Accordion type="single" collapsible>
                      <AccordionItem value={plan.id} className="border-none">
                        <AccordionTrigger className="hover:no-underline py-2">
                          <span className="font-semibold text-left">View Weekly Milestones ({plan.weekly_milestones.length})</span>
                        </AccordionTrigger>
                        <AccordionContent className="pt-4">
                          <div className="space-y-3">
                            {plan.weekly_milestones.map((milestone, index) => {
                              const isCurrentWeek = index === weeksPassed;
                              const isCompleted = index < weeksPassed;
                              const weekNumber = index + 1;
                              
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
                                      <p className={`text-sm ${
                                        isCurrentWeek 
                                          ? 'text-indigo-800 font-medium' 
                                          : isCompleted 
                                            ? 'text-green-800' 
                                            : 'text-gray-700'
                                      }`}>
                                        {milestone}
                                      </p>
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
    </div>
  );
}
