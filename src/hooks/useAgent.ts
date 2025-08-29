import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './use-toast'; // Assuming use-toast is in the same hooks directory

interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AgentResponse {
  message?: string;
  item?: any; // For create intent
  plan?: { weekly_milestones: string[] }; // For generate_goal_plan intent
  text?: string; // For answer_question intent
  type?: string; // Add type for agent response
  error?: string;
}

export function useAgent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversationHistory, setConversationHistory] = useState<AgentMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const sendMessageToAgent = async (userInput: string): Promise<AgentResponse> => {
    if (!user) {
      toast({
        title: 'Authentication Error',
        description: 'You must be logged in to use the AI agent.',
        variant: 'destructive',
      });
      return { error: 'User not authenticated' };
    }

    setLoading(true);
    const userMessage: AgentMessage = { role: 'user', content: userInput };
    const newHistory = [...conversationHistory, userMessage];
    setConversationHistory(newHistory);

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userInput,
          userId: user.id,
          history: newHistory, // Send the updated history
        }),
      });

      const responseText = await response.text(); // Read the response body once as text

      if (response.ok) {
        try {
          const data: AgentResponse = JSON.parse(responseText);
          const agentResponseContent = data.message || data.text || (data.plan ? `Generated plan for: ${userInput}` : 'Agent responded.');
          const agentMessage: AgentMessage = { role: 'assistant', content: agentResponseContent };
          setConversationHistory((prev) => [...prev, agentMessage]);
          return data;
        } catch (jsonParseError) {
          // If response.ok but not valid JSON, treat as a generic success with text content
          const agentMessage: AgentMessage = { role: 'assistant', content: responseText };
          setConversationHistory((prev) => [...prev, agentMessage]);
          return { message: responseText };
        }
      } else {
        let errorMessage = 'Failed to get response from agent.';
        try {
          // Attempt to parse as JSON, if it's a structured error
          const errorData: AgentResponse = JSON.parse(responseText);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (jsonParseError) {
          // If not JSON, use the raw text as the error message
          errorMessage = responseText || `Server responded with status ${response.status}`;
        }
        
        toast({
          title: 'Agent Error',
          description: errorMessage,
          variant: 'destructive',
        });
        const agentMessage: AgentMessage = { role: 'assistant', content: `Error: ${errorMessage}` };
        setConversationHistory((prev) => [...prev, agentMessage]);
        return { error: errorMessage };
      }
    } catch (error: any) {
      console.error('Error communicating with agent:', error);
      toast({
        title: 'Network Error',
        description: 'Could not connect to the AI agent.',
        variant: 'destructive',
      });
      const agentMessage: AgentMessage = { role: 'assistant', content: `Network error: ${error.message}` };
      setConversationHistory((prev) => [...prev, agentMessage]);
      return { error: error.message };
    } finally {
      setLoading(false);
    }
  };

  return { sendMessageToAgent, conversationHistory, loading };
}
