import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, History, Settings, Mic, Square, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
import { useAgent } from '@/hooks/useAgent'; // Import useAgent

interface AgentMessage { // Re-using the AgentMessage interface from useAgent
  role: 'user' | 'assistant';
  content: string;
}

export default function AIAssistant() {
  const [inputMessage, setInputMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth(); // Get user from AuthContext
  const { sendMessageToAgent, conversationHistory: messages, loading: agentLoading } = useAgent(); // Use useAgent hook

  // Initialize messages with a default assistant message if history is empty
  useEffect(() => {
    if (messages.length === 0) {
      // This initial message will be added to the useAgent's conversationHistory
      // when the component mounts, but only if it's truly empty.
      // For now, we'll let useAgent manage its own history.
      // If we want a persistent initial message, it should be handled within useAgent or passed as an initial state.
      // For this refactor, we'll assume useAgent starts with an empty history and the first user input will populate it.
      // The initial assistant message will be handled by the backend agent's first response or a default in the UI.
    }
  }, [messages]);

  // Sample conversation history (will be replaced by actual history from backend/context later)
  const conversationHistory = [
    {
      id: '1',
      title: 'Task Planning for Project',
      preview: 'Created 5 tasks for the mobile app project...',
      timestamp: '2 hours ago',
    },
    {
      id: '2',
      title: 'Weekly Schedule Review',
      preview: 'Analyzed your schedule and suggested optimizations...',
      timestamp: '1 day ago',
    },
    {
      id: '3',
      title: 'Budget Analysis',
      preview: 'Reviewed your expenses and provided insights...',
      timestamp: '3 days ago',
    },
  ];

  // Quick actions
  const quickActions = [
    { text: "Create a task for tomorrow", icon: "📝" },
    { text: "Plan my week", icon: "📅" },
    { text: "Analyze my budget", icon: "💰" },
    { text: "Set a reminder", icon: "⏰" },
    { text: "Review my goals", icon: "🎯" },
    { text: "Optimize my schedule", icon: "⚡" },
  ];

  // Scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle sending messages
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || agentLoading) return;

    setInputMessage(''); // Clear input immediately
    
    if (!user?.id) {
      // The useAgent hook already handles this, but adding a local toast for immediate feedback
      // if the user object is null before even calling sendMessageToAgent.
      // The useAgent hook will also add an error message to its history.
      return;
    }

    try {
      const result = await sendMessageToAgent(inputMessage.trim());

      if (result.error) {
        // Error handling is done within useAgent, which also updates its history.
        // No need to set local messages here.
        return;
      }

      // The useAgent hook already adds the assistant's response to its history.
      // No need to set local messages here.
    } catch (error: any) {
      console.error('Error sending message:', error);
      // Error handling is done within useAgent, which also updates its history.
      // No need to set local messages here.
    }
  };

  // Removed generateAIResponse as it's now handled by the backend API
  // const generateAIResponse = (input: string): string => { ... };

  // Handle voice input (placeholder)
  const toggleVoiceInput = () => {
    if (!isListening) {
      setIsListening(true);
      // Start voice recognition here
      setTimeout(() => {
        setIsListening(false);
        setInputMessage("Create a task to review the quarterly report by Friday");
      }, 3000);
    } else {
      setIsListening(false);
    }
  };

  // Handle quick action
  const handleQuickAction = (actionText: string) => {
    setInputMessage(actionText);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 h-[calc(100vh-8rem)]">
      <div className="h-full flex flex-col space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Bot className="w-8 h-8" />
              AI Assistant
            </h1>
            <p className="text-lg text-muted-foreground">
              Your intelligent life planning companion
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="w-3 h-3" />
              AI-Powered
            </Badge>
          </div>
        </header>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Chat Interface */}
          <div className="lg:col-span-3 flex flex-col">
            <Card className="flex-1 flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Chat</CardTitle>
              </CardHeader>
              
              {/* Messages */}
              <CardContent className="flex-1 flex flex-col px-0">
                <div className="flex-1 overflow-y-auto px-6 space-y-4">
                  {messages.map((message, index) => (
                    <div
                      key={index} // Using index as key since messages are managed by useAgent and don't have explicit IDs here
                      className={`flex gap-3 ${
                        message.role === 'assistant' ? 'justify-start' : 'justify-end'
                      }`}
                    >
                      {message.role === 'assistant' && (
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Bot className="w-4 h-4 text-primary" />
                          </div>
                        </div>
                      )}
                      
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          message.role === 'assistant'
                            ? 'bg-muted text-foreground'
                            : 'bg-primary text-primary-foreground ml-auto'
                        }`}
                      >
                        <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                        {/* Timestamp removed as useAgent's messages don't have it directly */}
                      </div>
                      
                      {message.role === 'user' && (
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                            <User className="w-4 h-4 text-primary-foreground" />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {agentLoading && (
                    <div className="flex gap-3 justify-start">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Bot className="w-4 h-4 text-primary" />
                        </div>
                      </div>
                      <div className="bg-muted text-foreground rounded-lg px-4 py-2">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="border-t px-6 pt-4">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Textarea
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder="Ask me anything about tasks, schedules, goals, or planning..."
                        className="min-h-[60px] resize-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={toggleVoiceInput}
                        className={`p-2 ${isListening ? 'bg-red-100 text-red-600' : ''}`}
                      >
                        {isListening ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSendMessage}
                        disabled={!inputMessage.trim() || agentLoading}
                        className="p-2"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {isListening && (
                    <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Listening... Click stop when done
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Tabs defaultValue="actions" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="actions">Quick Actions</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>

              <TabsContent value="actions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {quickActions.map((action, index) => (
                      <Button
                        key={index}
                        variant="ghost"
                        className="w-full justify-start text-left h-auto p-2 text-wrap"
                        onClick={() => handleQuickAction(action.text)}
                      >
                        <span className="mr-2">{action.icon}</span>
                        <span className="text-xs">{action.text}</span>
                      </Button>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <History className="w-4 h-4" />
                      Recent Conversations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Displaying actual conversation history from useAgent */}
                    {messages.length > 0 ? (
                      messages.map((message, index) => (
                        <div
                          key={index}
                          className="p-3 rounded-lg border border-border cursor-pointer hover:bg-muted/50 transition-colors"
                        >
                          <h4 className="font-medium text-sm mb-1">{message.role === 'user' ? 'You:' : 'AI:'}</h4>
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                            {message.content}
                          </p>
                          {/* <p className="text-xs text-muted-foreground">{formatTimestamp(message.timestamp)}</p> */}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No recent conversations.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* AI Features */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  AI Features
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Smart Task Creation</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Schedule Optimization</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Goal Planning</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Budget Analysis</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span>Voice Commands</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span>Data Insights</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
