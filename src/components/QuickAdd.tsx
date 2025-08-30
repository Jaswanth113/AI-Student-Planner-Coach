import { useRef, useState } from 'react';
import { Mic, Square, CornerDownLeft, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface QuickAddProps {
  onSuccess?: () => void; // Optional callback
}

export function QuickAdd({ onSuccess }: QuickAddProps) {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const { createWithAI } = useData();

  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: 'Voice input not supported', variant: 'destructive' });
      return;
    }

    if (!recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => (prev ? `${prev} ${transcript}` : transcript));
      };
      recognition.onend = () => setIsRecording(false);
      recognition.onerror = () => {
        setIsRecording(false);
        toast({ title: 'Voice recognition error', variant: 'destructive' });
      };
      recognitionRef.current = recognition;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      setIsRecording(true);
      recognitionRef.current.start();
    }
  };

  const handleSubmit = async () => {
    if (!input.trim() || !user) return;

    setIsProcessing(true);
    try {
      const result = await createWithAI(input.trim());
      
      toast({ 
        title: 'Success!', 
        description: `Created ${result.type}: ${result.item?.title || result.item?.item_name || 'New item'}` 
      });
      
      setInput('');
      onSuccess?.(); // Call optional callback
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to process your request', 
        variant: 'destructive' 
      });
    }
    setIsProcessing(false);
  };

  return (
    <div className="fixed bottom-6 right-6 w-full max-w-md z-50">
      <div className="relative rounded-xl border bg-card text-card-foreground shadow-2xl backdrop-blur-sm">
        <div className="flex items-center gap-2 p-2">
          <div className="flex items-center gap-1 px-3 py-1 bg-primary/10 rounded-lg">
            <Sparkles className="w-3 h-3 text-primary" />
            <span className="text-xs font-medium text-primary">AI</span>
          </div>
          <Input
            placeholder='Try "Buy milk tomorrow" or "Remind me to call mom at 5pm"...'
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent text-sm"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
            disabled={isProcessing}
          />
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant={isRecording ? 'destructive' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={handleVoiceInput}
              title={isRecording ? 'Stop recording' : 'Start voice input'}
              disabled={isProcessing}
            >
              {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSubmit}
              disabled={!input.trim() || isProcessing}
              className="h-8"
            >
              {isProcessing ? (
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs">Adding...</span>
                </div>
              ) : (
                <CornerDownLeft className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
        
        {isRecording && (
          <div className="px-4 pb-2">
            <div className="flex items-center gap-2 text-xs text-red-600">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span>Listening... Click stop when done</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}