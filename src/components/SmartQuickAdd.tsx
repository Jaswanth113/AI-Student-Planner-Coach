import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Plus, Sparkles, AlertTriangle, Clock, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCommitmentAI } from '@/hooks/useCommitmentAI';
import { useCommitments } from '@/hooks/useSupabaseData';
import { useToast } from '@/hooks/use-toast';
import { Commitment } from '../../types/api';
import { formatTime, formatDate } from '@/utils/commitmentAI';

interface SmartQuickAddProps {
  onCommitmentCreated?: (commitment: Commitment) => void;
  placeholder?: string;
}

export function SmartQuickAdd({ onCommitmentCreated, placeholder = "Try: 'Gym session tomorrow at 6 PM for 1 hour'" }: SmartQuickAddProps) {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  const { parseNaturalLanguage, checkConflicts, getAlternativeSlots, suggestions } = useCommitmentAI([]);
  const { addCommitment } = useCommitments();
  const { toast } = useToast();
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      if (recognitionRef.current) {
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onstart = () => {
          setIsListening(true);
        };

        recognitionRef.current.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setInput(transcript);
          handleInputChange(transcript);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          toast({
            title: 'Voice Recognition Error',
            description: 'Could not process voice input. Please try typing instead.',
            variant: 'destructive'
          });
        };
      }
    }
  }, [toast]);

  // Handle voice input toggle
  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      toast({
        title: 'Voice Recognition Not Supported',
        description: 'Your browser does not support voice recognition.',
        variant: 'destructive'
      });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  // Handle input changes and AI parsing
  const handleInputChange = async (value: string) => {
    setInput(value);
    
    if (value.trim().length > 10) { // Only parse if input is substantial
      try {
        const parsed = await parseNaturalLanguage(value);
        setParsedData(parsed);
        setShowPreview(parsed.confidence > 0.5);
      } catch (error) {
        console.error('Error parsing input:', error);
      }
    } else {
      setShowPreview(false);
      setParsedData(null);
    }
  };

  // Create commitment from parsed data
  const createCommitment = async () => {
    if (!parsedData || !parsedData.start_time || !parsedData.end_time) {
      toast({
        title: 'Incomplete Information',
        description: 'Please provide at least a title, date, and time for the commitment.',
        variant: 'destructive'
      });
      return;
    }

    setIsCreating(true);
    
    try {
      const commitmentData = {
        title: parsedData.title || input.split(' ').slice(0, 3).join(' '),
        start_time: parsedData.start_time.toISOString(),
        end_time: parsedData.end_time.toISOString(),
        location: parsedData.location || '',
        type: parsedData.type || 'social' as const,
        reminder_minutes: 15,
        description: parsedData.description || '',
        user_id: '' // Will be set by the hook
      };

      const result = await addCommitment(commitmentData);
      
      if (result && !result.error) {
        toast({
          title: 'Commitment Created',
          description: `"${commitmentData.title}" has been added to your schedule`,
        });
        
        setInput('');
        setShowPreview(false);
        setParsedData(null);
        onCommitmentCreated?.(result.data as Commitment);
      }
    } catch (error: any) {
      toast({
        title: 'Error Creating Commitment',
        description: error.message || 'Failed to create commitment',
        variant: 'destructive'
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Handle quick actions from keyboard
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (showPreview && parsedData) {
        createCommitment();
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Input with voice recognition */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`pr-12 ${isListening ? 'border-red-300 bg-red-50' : ''}`}
          />
          <Button
            size="sm"
            variant="ghost"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
            onClick={toggleVoiceInput}
            disabled={!recognitionRef.current}
          >
            {isListening ? (
              <MicOff className="w-4 h-4 text-red-500" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </Button>
        </div>
        
        {showPreview && (
          <Button 
            onClick={createCommitment}
            disabled={isCreating}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            {isCreating ? 'Creating...' : 'Add'}
          </Button>
        )}
      </div>

      {/* Voice recognition indicator */}
      {isListening && (
        <Alert>
          <Mic className="h-4 w-4" />
          <AlertDescription>
            Listening... Speak your commitment details clearly.
          </AlertDescription>
        </Alert>
      )}

      {/* AI Preview */}
      {showPreview && parsedData && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">
                AI Parsed ({Math.round(parsedData.confidence * 100)}% confidence)
              </span>
            </div>
            
            <div className="space-y-2">
              {parsedData.title && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Title:</span>
                  <span className="text-sm">{parsedData.title}</span>
                </div>
              )}
              
              {parsedData.start_time && (
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  <span className="text-sm">
                    {formatDate(parsedData.start_time)} at {formatTime(parsedData.start_time)}
                    {parsedData.end_time && ` - ${formatTime(parsedData.end_time)}`}
                  </span>
                </div>
              )}
              
              {parsedData.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-3 h-3" />
                  <span className="text-sm">{parsedData.location}</span>
                </div>
              )}
              
              {parsedData.type && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {parsedData.type}
                  </Badge>
                </div>
              )}
            </div>

            {parsedData.confidence < 0.7 && (
              <Alert className="mt-3">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Low confidence parsing. Please verify the details before creating.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-2">
          {suggestions.map((suggestion, index) => (
            <Alert key={index} className={suggestion.type === 'conflict' ? 'border-orange-200 bg-orange-50' : ''}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <div>
                    <strong>{suggestion.title}:</strong> {suggestion.description}
                  </div>
                  {suggestion.action && (
                    <Button size="sm" variant="outline" onClick={suggestion.action}>
                      Apply
                    </Button>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Quick examples */}
      {!input && (
        <div className="text-xs text-muted-foreground">
          <p className="mb-1">Try natural language:</p>
          <div className="flex flex-wrap gap-1">
            {[
              "Gym tomorrow 6 PM",
              "Math class Monday 9 AM",
              "Coffee with Sarah Friday 2 PM",
              "Study session tonight 7 PM for 2 hours"
            ].map((example, index) => (
              <Button
                key={index}
                variant="ghost"
                size="sm"
                className="h-6 text-xs px-2 text-muted-foreground hover:text-foreground"
                onClick={() => handleInputChange(example)}
              >
                {example}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Extend the Window interface for TypeScript
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
