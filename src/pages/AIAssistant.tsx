import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, History, Settings, Mic, Square, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useAgent, AgentResponse } from '@/hooks/useAgent'; // Import AgentResponse interface directly
import { useData } from '@/contexts/DataContext';
import { supabase } from '@/integrations/supabase/client';

export default function AIAssistant() {
  const [inputMessage, setInputMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { sendMessageToAgent, conversationHistory: messages, loading: agentLoading } = useAgent();
  const { tasks, expenses, commitments, groceries } = useData();
  
  // Context-aware state
  const [showContextPanel, setShowContextPanel] = useState(true);
  const [userContext, setUserContext] = useState<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || agentLoading) return;

    const currentInput = inputMessage.trim();
    setInputMessage('');
    
    if (!user?.id) {
      return;
    }

    try {
      await sendMessageToAgent(currentInput);
    } catch (error: any) {
      console.error('Error sending message:', error);
    }
  };

  const toggleVoiceInput = () => {
    if (!isListening) {
      setIsListening(true);
      setTimeout(() => {
        setIsListening(false);
        setInputMessage("Create a task to review the quarterly report by Friday");
      }, 3000);
    } else {
      setIsListening(false);
    }
  };

  const quickActions = [
    { text: "Create a task for tomorrow", icon: "📝" },
    { text: "Plan my week", icon: "📅" },
    { text: "Analyze my budget", icon: "💰" },
    { text: "Set a reminder", icon: "⏰" },
    { text: "Review my goals", icon: "🎯" },
    { text: "Optimize my schedule", icon: "⚡" },
  ];

  const handleQuickAction = (actionText: string) => {
    setInputMessage(actionText);
  };

  // Helper to render agent response content based on its type
  const renderAgentResponseContent = (message: { role: 'user' | 'assistant'; content: string; data?: AgentResponse }) => {
    if (message.role === 'user') {
      return <div className="text-sm whitespace-pre-wrap">{message.content}</div>;
    }

    const data = message.data; // Assuming the full AgentResponse is stored in message.data
    if (!data) {
      return <div className="text-sm whitespace-pre-wrap">{message.content}</div>;
    }

    switch (data.type) {
      case 'creation_success':
        return (
          <div className="text-sm">
            <p className="font-semibold">Success: {data.message || 'Item created!'}</p>
            {data.item && (
              <ul className="list-disc list-inside mt-1">
                <li>Type: {data.item.type || 'N/A'}</li>
                <li>Title: {data.item.title || data.item.item_name || 'N/A'}</li>
                {data.item.due_date_local && <li>Due: {new Date(data.item.due_date_local).toLocaleDateString()}</li>}
              </ul>
            )}
          </div>
        );
      case 'answer':
        return <div className="text-sm whitespace-pre-wrap">{data.text || 'AI provided an answer.'}</div>;
      case 'plan_created':
        return (
          <div className="text-sm">
            <p className="font-semibold">Learning Plan Created: {data.plan?.topic || 'N/A'}</p>
            {data.plan?.weekly_milestones && (
              <ul className="list-disc list-inside mt-1">
                {data.plan.weekly_milestones.map((milestone, i) => (
                  <li key={i}>{milestone}</li>
                ))}
              </ul>
            )}
          </div>
        );
      case 'error':
        return <div className="text-sm text-red-500 whitespace-pre-wrap">Error: {data.detail || data.message || data.error || 'An unknown error occurred.'}</div>;
      default:
        return <div className="text-sm whitespace-pre-wrap">{message.content}</div>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex flex-col space-y-6 min-h-[calc(100vh-8rem)]">
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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Chat Interface */}
          <div className="lg:col-span-3">
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="pb-3 flex-shrink-0">
                <CardTitle className="text-lg">Chat</CardTitle>
              </CardHeader>
              
              {/* Messages */}
              <CardContent className="flex-1 flex flex-col px-0 overflow-hidden">
                <div className="flex-1 overflow-y-auto px-6 space-y-4 min-h-0">
                  {messages.map((message, index) => (
                    <div
                      key={index}
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
                        {renderAgentResponseContent(message)}
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
                          <div className="text-xs text-muted-foreground mb-2 line-clamp-2">
                            {renderAgentResponseContent(message)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No recent conversations.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* User Context Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Your Context
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Active Tasks:</span>
                    <span className="font-medium">{tasks.filter(t => t.status !== 'Done').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Due Today:</span>
                    <span className="font-medium text-orange-600">
                      {tasks.filter(t => {
                        const today = new Date().toISOString().split('T')[0];
                        const taskDate = t.due_date_local || t.due_date;
                        return taskDate && taskDate.split('T')[0] === today && t.status !== 'Done';
                      }).length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Overdue:</span>
                    <span className="font-medium text-red-600">
                      {tasks.filter(t => {
                        const today = new Date().toISOString().split('T')[0];
                        const taskDate = t.due_date_local || t.due_date;
                        return taskDate && taskDate.split('T')[0] < today && t.status !== 'Done';
                      }).length}
                    </span>
                  </div>
                </div>
                
                <div className="border-t pt-2 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">This Month Expenses:</span>
                    <span className="font-medium">₹{expenses.filter(e => {
                      const thisMonth = new Date().toISOString().slice(0, 7);
                      return e.expense_date.slice(0, 7) === thisMonth;
                    }).reduce((sum, e) => sum + e.amount, 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Grocery Items:</span>
                    <span className="font-medium">{groceries.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Upcoming Events:</span>
                    <span className="font-medium">{commitments.filter(c => new Date(c.start_time) > new Date()).length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

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
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Grocery Planning</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Expense Tracking</span>
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
