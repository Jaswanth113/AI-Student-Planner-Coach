import React from 'react';
import { 
  Lightbulb, 
  AlertTriangle, 
  Clock, 
  Repeat, 
  CheckCircle, 
  X,
  ArrowRight,
  Calendar,
  MapPin
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AICommitmentSuggestion } from '@/hooks/useCommitmentAI';
import { SmartReminder } from '@/hooks/useSmartReminders';
import { formatTime, formatDate } from '../utils/commitmentAI';

interface AISuggestionsPanelProps {
  suggestions: AICommitmentSuggestion[];
  reminders: SmartReminder[];
  onDismissSuggestion: (index: number) => void;
  onDismissReminder: (reminderId: string) => void;
  onApplySuggestion: (suggestion: AICommitmentSuggestion) => void;
}

export function AISuggestionsPanel({
  suggestions,
  reminders,
  onDismissSuggestion,
  onDismissReminder,
  onApplySuggestion
}: AISuggestionsPanelProps) {
  const getSuggestionIcon = (type: AICommitmentSuggestion['type']) => {
    switch (type) {
      case 'conflict':
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case 'recurring':
        return <Repeat className="w-4 h-4 text-blue-600" />;
      case 'task':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'reschedule':
        return <Clock className="w-4 h-4 text-purple-600" />;
      case 'priority':
      default:
        return <Lightbulb className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getReminderIcon = (type: SmartReminder['type']) => {
    switch (type) {
      case 'urgent':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'travel':
        return <MapPin className="w-4 h-4 text-blue-600" />;
      case 'preparation':
        return <Clock className="w-4 h-4 text-orange-600" />;
      case 'upcoming':
      default:
        return <Calendar className="w-4 h-4 text-green-600" />;
    }
  };

  const getSuggestionColor = (type: AICommitmentSuggestion['type']) => {
    switch (type) {
      case 'conflict':
        return 'border-orange-200 bg-orange-50';
      case 'recurring':
        return 'border-blue-200 bg-blue-50';
      case 'task':
        return 'border-green-200 bg-green-50';
      case 'reschedule':
        return 'border-purple-200 bg-purple-50';
      case 'priority':
      default:
        return 'border-yellow-200 bg-yellow-50';
    }
  };

  const getReminderColor = (type: SmartReminder['type']) => {
    switch (type) {
      case 'urgent':
        return 'border-red-200 bg-red-50';
      case 'travel':
        return 'border-blue-200 bg-blue-50';
      case 'preparation':
        return 'border-orange-200 bg-orange-50';
      case 'upcoming':
      default:
        return 'border-green-200 bg-green-50';
    }
  };

  const activeReminders = reminders.filter(r => !r.dismissed && new Date(r.triggerTime) <= new Date());
  const upcomingReminders = reminders.filter(r => !r.dismissed && new Date(r.triggerTime) > new Date());

  if (suggestions.length === 0 && activeReminders.length === 0 && upcomingReminders.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Active Reminders */}
      {activeReminders.length > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-4 h-4" />
              Active Reminders
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {activeReminders.map((reminder) => (
              <Alert key={reminder.id} className={getReminderColor(reminder.type)}>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2 flex-1">
                    {getReminderIcon(reminder.type)}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{reminder.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(new Date(reminder.triggerTime))}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDismissReminder(reminder.id)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              AI Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {suggestions.map((suggestion, index) => (
              <Alert key={index} className={getSuggestionColor(suggestion.type)}>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2 flex-1">
                    {getSuggestionIcon(suggestion.type)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium">{suggestion.title}</p>
                        <Badge variant="outline" className="text-xs capitalize">
                          {suggestion.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {suggestion.description}
                      </p>
                      
                      {/* Show additional data for specific suggestion types */}
                      {suggestion.type === 'conflict' && suggestion.data?.alternatives && (
                        <div className="mt-2">
                          <p className="text-xs font-medium mb-1">Suggested times:</p>
                          <div className="space-y-1">
                            {suggestion.data.alternatives.slice(0, 2).map((alt: any, altIndex: number) => (
                              <div key={altIndex} className="flex items-center gap-1 text-xs">
                                <ArrowRight className="w-3 h-3" />
                                <span>{formatDate(alt.start_time)} at {formatTime(alt.start_time)}</span>
                                <span className="text-muted-foreground">({alt.reason})</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {suggestion.action && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onApplySuggestion(suggestion)}
                        className="h-6 text-xs px-2"
                      >
                        Apply
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDismissSuggestion(index)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Upcoming Reminders */}
      {upcomingReminders.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Upcoming Reminders
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {upcomingReminders.slice(0, 3).map((reminder) => (
              <Alert key={reminder.id} className={getReminderColor(reminder.type)}>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2 flex-1">
                    {getReminderIcon(reminder.type)}
                    <div className="flex-1">
                      <p className="text-sm">{reminder.message}</p>
                      <p className="text-xs text-muted-foreground">
                        in {Math.round((new Date(reminder.triggerTime).getTime() - new Date().getTime()) / (1000 * 60))} minutes
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDismissReminder(reminder.id)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </Alert>
            ))}
            
            {upcomingReminders.length > 3 && (
              <p className="text-xs text-muted-foreground text-center">
                ... and {upcomingReminders.length - 3} more upcoming reminders
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
