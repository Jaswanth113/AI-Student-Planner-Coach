import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { ChatGroq } from '@langchain/groq';
import { ChatPromptTemplate } from '@langchain/core/prompts';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize Groq LLM
const llm = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  modelName: 'mixtral-8x7b-32768',
  temperature: 0.7,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { plan_id, additional_weeks = 4 } = req.body;
  const userId = req.headers['user-id'];

  if (!userId || !plan_id) {
    return res.status(400).json({ error: 'User ID and plan ID are required' });
  }

  try {
    // Fetch the existing plan
    const { data: plan, error: fetchError } = await supabase
      .from('learning_plans')
      .select('*')
      .eq('id', plan_id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !plan) {
      return res.status(404).json({ error: 'Plan not found or access denied' });
    }

    // Generate additional milestones using AI
    const prompt = ChatPromptTemplate.fromTemplate(`
      You are an expert learning coach. Extend the following learning plan with {weeks} additional weeks of milestones.
      
      Topic: {topic}
      Current Duration: {duration} months
      Existing Milestones:
      {milestones}
      
      Generate {weeks} new weekly milestones that continue from where the last one left off.
      Return ONLY a JSON array of milestone strings, nothing else.
    `);

    const chain = prompt.pipe(llm);
    
    const response = await chain.invoke({
      topic: plan.topic,
      duration: plan.duration_months,
      weeks: additional_weeks,
      milestones: JSON.stringify(plan.weekly_milestones, null, 2)
    });

    let newMilestones: string[] = [];
    try {
      // Try to parse the response as JSON array
      newMilestones = JSON.parse(response.content.toString());
      if (!Array.isArray(newMilestones)) {
        throw new Error('Invalid response format');
      }
    } catch (e) {
      // Fallback: Split by newlines and clean up each line
      newMilestones = response.content
        .toString()
        .split('\n')
        .map(line => line.replace(/^\d+\.\s*|[-•]\s*|"/g, '').trim())
        .filter(line => line.length > 0);
    }

    // Update the plan with new milestones
    const updatedMilestones = [...plan.weekly_milestones, ...newMilestones];
    const updatedDuration = Math.ceil(updatedMilestones.length / 4); // Approximate months

    const { error: updateError } = await supabase
      .from('learning_plans')
      .update({
        weekly_milestones: updatedMilestones,
        duration_months: updatedDuration,
        updated_at: new Date().toISOString()
      })
      .eq('id', plan_id);

    if (updateError) {
      throw updateError;
    }

    return res.status(200).json({
      success: true,
      plan_id,
      new_weeks_added: newMilestones.length,
      total_weeks: updatedMilestones.length
    });

  } catch (error) {
    console.error('Error extending learning plan:', error);
    return res.status(500).json({ 
      error: 'Failed to extend learning plan',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
