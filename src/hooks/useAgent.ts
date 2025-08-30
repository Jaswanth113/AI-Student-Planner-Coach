import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './use-toast'; // Assuming use-toast is in the same hooks directory

interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
  data?: AgentResponse; // Store the full agent response here
}

export interface AgentResponse {
  type?: 'creation_success' | 'answer' | 'plan_created' | 'error';
  message?: string; // Generic message for toasts/feedback
  item?: any; // For 'creation_success' intent
  plan?: { weekly_milestones: string[]; topic: string; duration_text: string }; // For 'plan_created' intent
  text?: string; // For 'answer' intent
  error?: string; // For general errors
  detail?: string; // For FastAPI error details
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
          let agentResponseContent: string;

          if (data.type === 'creation_success') {
            agentResponseContent = data.message || `Successfully created ${data.item?.title || data.item?.item_name || 'item'}.`;
          } else if (data.type === 'answer') {
            agentResponseContent = data.text || 'Agent provided an answer.';
          } else if (data.type === 'plan_created') {
            agentResponseContent = data.message || `Generated a learning plan for ${data.plan?.topic || 'your request'}.`;
          } else {
            agentResponseContent = data.message || 'Agent responded.';
          }
          
          const agentMessage: AgentMessage = { role: 'assistant', content: agentResponseContent, data: data };
          setConversationHistory((prev) => [...prev, agentMessage]);
          return data;
        } catch (jsonParseError) {
          console.error('JSON Parse Error (OK response):', jsonParseError);
          const errorResponse: AgentResponse = { type: 'error', message: responseText || 'Unparseable response from agent.' };
          const agentMessage: AgentMessage = { role: 'assistant', content: responseText || 'Agent responded with unparseable content.', data: errorResponse };
          setConversationHistory((prev) => [...prev, agentMessage]);
          return errorResponse;
        }
      } else {
        let errorMessage = `Server responded with status ${response.status}.`;
        try {
          const errorData: { detail?: string; error?: string; message?: string } = JSON.parse(responseText);
          errorMessage = errorData.detail || errorData.error || errorData.message || errorMessage;
        } catch (jsonParseError) {
          console.error('JSON Parse Error (Error response):', jsonParseError);
          errorMessage = responseText || errorMessage;
        }
        
        toast({
          title: 'Agent Error',
          description: errorMessage,
          variant: 'destructive',
        });
        const errorResponse: AgentResponse = { type: 'error', error: errorMessage, detail: errorMessage };
        const agentMessage: AgentMessage = { role: 'assistant', content: `Error: ${errorMessage}`, data: errorResponse };
        setConversationHistory((prev) => [...prev, agentMessage]);
        return errorResponse;
      }
    } catch (error: any) {
      console.error('Error communicating with agent:', error);
      toast({
        title: 'Network Error',
        description: 'Could not connect to the AI agent.',
        variant: 'destructive',
      });
      const errorResponse: AgentResponse = { type: 'error', error: error.message };
      const agentMessage: AgentMessage = { role: 'assistant', content: `Network error: ${error.message}`, data: errorResponse };
      setConversationHistory((prev) => [...prev, agentMessage]);
      return errorResponse;
    } finally {
      setLoading(false);
    }
  };

  return { sendMessageToAgent, conversationHistory, loading };
}
