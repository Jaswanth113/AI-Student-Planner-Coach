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

      if (result.error) {
        throw new Error(result.error);
      }

      if (result.plan) {
        toast({
          title: 'Success',
          description: 'Learning plan generated!',
        });

        // Save the generated plan to Supabase
        const { error: insertError } = await supabase.from('learning_plans').insert({
          user_id: user.id,
          topic: topic,
          duration_months: parseInt(duration),
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

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Personal Learning Coach</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Generate New Learning Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="topic">Topic to Learn</Label>
              <Input
                id="topic"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Python, Web Development, Quantum Physics"
                required
              />
            </div>
            <div>
              <Label htmlFor="duration">Duration in Months</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {m} Month{m > 1 ? 's' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={loading || agentLoading}>
              {(loading || agentLoading) ? 'Generating...' : 'Generate Plan'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <h2 className="text-2xl font-bold mb-4">Your Learning Plans</h2>
      {learningPlans.length === 0 ? (
        <p>No learning plans yet. Generate one above!</p>
      ) : (
        <Accordion type="single" collapsible className="w-full">
          {learningPlans.map((plan) => (
            <Card key={plan.id} className="mb-4">
              <AccordionItem value={plan.id}>
                <AccordionTrigger className="px-6 py-4 text-lg font-semibold">
                  {plan.topic} ({plan.duration_months} months) - Created: {new Date(plan.created_at).toLocaleDateString()}
                </AccordionTrigger>
                <AccordionContent className="px-6 py-4">
                  <h3 className="text-xl font-semibold mb-2">Weekly Milestones:</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {plan.weekly_milestones.map((milestone, index) => (
                      <li key={index}>{milestone}</li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Card>
          ))}
        </Accordion>
      )}
    </div>
  );
}
