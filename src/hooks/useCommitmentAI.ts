import { useState, useCallback, useMemo } from 'react';
import { Commitment } from '../../types/api';
import { useTasks } from './useSupabaseData';
import { useToast } from './use-toast';
import {
  parseCommitmentInput,
  detectConflicts,
  suggestAlternativeSlots,
  calculatePriority,
  detectRecurringPatterns,
  suggestRelatedTasks,
  ParsedCommitmentData,
  ConflictDetection,
  TimeSlotSuggestion
} from '../utils/commitmentAI';

export interface AICommitmentSuggestion {
  type: 'conflict' | 'reschedule' | 'task' | 'recurring' | 'priority';
  title: string;
  description: string;
  action?: () => void;
  data?: any;
}

export function useCommitmentAI(commitments: Commitment[]) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [suggestions, setSuggestions] = useState<AICommitmentSuggestion[]>([]);
  const { addTask } = useTasks();
  const { toast } = useToast();

  // Parse natural language input for commitments
  const parseNaturalLanguage = useCallback((input: string): ParsedCommitmentData => {
    return parseCommitmentInput(input);
  }, []);

  // Check conflicts for a new commitment
  const checkConflicts = useCallback((newCommitment: {
    start_time: Date;
    end_time: Date;
  }): ConflictDetection => {
    return detectConflicts(newCommitment, commitments);
  }, [commitments]);

  // Get alternative time suggestions
  const getAlternativeSlots = useCallback((
    desiredStart: Date,
    durationMinutes: number,
    maxSuggestions: number = 3
  ): TimeSlotSuggestion[] => {
    return suggestAlternativeSlots(desiredStart, durationMinutes, commitments, maxSuggestions);
  }, [commitments]);

  // Auto-reschedule missed commitments
  const suggestReschedule = useCallback((missedCommitment: Commitment): TimeSlotSuggestion[] => {
    const now = new Date();
    const originalDuration = new Date(missedCommitment.end_time).getTime() - new Date(missedCommitment.start_time).getTime();
    const durationMinutes = Math.round(originalDuration / (1000 * 60));
    
    // Suggest slots starting from now
    const suggestions = suggestAlternativeSlots(now, durationMinutes, commitments);
    
    toast({
      title: 'Reschedule Suggestion',
      description: `Found ${suggestions.length} available slots for "${missedCommitment.title}"`
    });
    
    return suggestions;
  }, [commitments, toast]);

  // Analyze commitment patterns and generate insights
  const analyzePatterns = useCallback(() => {
    const patterns = detectRecurringPatterns(commitments);
    const newSuggestions: AICommitmentSuggestion[] = [];

    patterns.forEach(pattern => {
      if (pattern.confidence > 0.6) {
        newSuggestions.push({
          type: 'recurring',
          title: 'Recurring Pattern Detected',
          description: pattern.suggestion,
          data: pattern
        });
      }
    });

    return newSuggestions;
  }, [commitments]);

  // Generate task suggestions for commitments
  const generateTaskSuggestions = useCallback((commitment: Commitment) => {
    const taskSuggestions = suggestRelatedTasks(commitment);
    const aiSuggestions: AICommitmentSuggestion[] = [];

    taskSuggestions.forEach(taskSuggestion => {
      aiSuggestions.push({
        type: 'task',
        title: 'Related Task Suggestion',
        description: `Add "${taskSuggestion.title}" to your tasks?`,
        action: async () => {
          await addTask({
            title: taskSuggestion.title,
            description: taskSuggestion.description,
            priority: taskSuggestion.priority,
            estimate: taskSuggestion.estimate,
            status: 'Inbox',
            tags: [commitment.type],
            category: 'Personal',
            user_id: '' // Will be set by the hook
          });
          
          toast({
            title: 'Task Added',
            description: `"${taskSuggestion.title}" has been added to your tasks`
          });
        },
        data: taskSuggestion
      });
    });

    return aiSuggestions;
  }, [addTask, toast]);

  // Smart sorting of commitments
  const smartSortCommitments = useCallback((commitmentsToSort: Commitment[]) => {
    return commitmentsToSort.sort((a, b) => {
      const priorityA = calculatePriority({
        type: a.type,
        start_time: new Date(a.start_time),
        title: a.title
      });
      const priorityB = calculatePriority({
        type: b.type,
        start_time: new Date(b.start_time),
        title: b.title
      });

      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      const priorityDiff = priorityOrder[priorityA] - priorityOrder[priorityB];
      
      if (priorityDiff !== 0) return priorityDiff;
      
      // If same priority, sort by time
      return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
    });
  }, []);

  // Process natural language input and return commitment data with AI insights
  const processNaturalLanguageInput = useCallback(async (input: string) => {
    setIsProcessing(true);
    
    try {
      const parsed = parseNaturalLanguage(input);
      const newSuggestions: AICommitmentSuggestion[] = [];

      if (parsed.confidence < 0.7) {
        newSuggestions.push({
          type: 'priority',
          title: 'Input Clarity',
          description: `I'm ${Math.round(parsed.confidence * 100)}% confident about this parsing. Please verify the details.`
        });
      }

      // Check for conflicts if we have time data
      if (parsed.start_time && parsed.end_time) {
        const conflictCheck = checkConflicts({
          start_time: parsed.start_time,
          end_time: parsed.end_time
        });

        if (conflictCheck.hasConflict) {
          const alternatives = getAlternativeSlots(
            parsed.start_time,
            Math.round((parsed.end_time.getTime() - parsed.start_time.getTime()) / (1000 * 60))
          );

          newSuggestions.push({
            type: 'conflict',
            title: 'Schedule Conflict Detected',
            description: conflictCheck.suggestion || 'There are overlapping commitments',
            data: { conflicts: conflictCheck.conflictingCommitments, alternatives }
          });
        }
      }

      setSuggestions(newSuggestions);
      return parsed;
    } finally {
      setIsProcessing(false);
    }
  }, [parseNaturalLanguage, checkConflicts, getAlternativeSlots]);

  // Get AI suggestions for existing commitments
  const getAISuggestions = useCallback(() => {
    const allSuggestions: AICommitmentSuggestion[] = [];
    
    // Pattern analysis
    const patternSuggestions = analyzePatterns();
    allSuggestions.push(...patternSuggestions);

    // Urgent commitments needing attention
    const now = new Date();
    const urgentCommitments = commitments.filter(c => {
      const timeDiff = new Date(c.start_time).getTime() - now.getTime();
      const hoursUntil = timeDiff / (1000 * 60 * 60);
      return hoursUntil > 0 && hoursUntil <= 2;
    });

    urgentCommitments.forEach(commitment => {
      allSuggestions.push({
        type: 'priority',
        title: 'Urgent Commitment',
        description: `${commitment.title} starts soon - make sure you're prepared!`,
        data: commitment
      });
    });

    return allSuggestions;
  }, [commitments, analyzePatterns]);

  // Auto-suggest improvements for a commitment
  const suggestImprovements = useCallback((commitment: Commitment) => {
    const improvements: AICommitmentSuggestion[] = [];

    // Check if reminder time could be optimized
    if (commitment.reminder_minutes === 15 && commitment.type === 'exam') {
      improvements.push({
        type: 'priority',
        title: 'Reminder Optimization',
        description: 'Consider setting a longer reminder time (30-60 minutes) for exams to allow preparation time'
      });
    }

    // Suggest location improvements
    if (!commitment.location && commitment.type !== 'gym') {
      improvements.push({
        type: 'priority',
        title: 'Missing Location',
        description: 'Adding a location will help with travel time estimates and reminders'
      });
    }

    // Generate related task suggestions
    const taskSuggestions = generateTaskSuggestions(commitment);
    improvements.push(...taskSuggestions);

    return improvements;
  }, [generateTaskSuggestions]);

  // Memoized sorted commitments
  const sortedCommitments = useMemo(() => {
    return smartSortCommitments([...commitments]);
  }, [commitments, smartSortCommitments]);

  // Get commitments happening today
  const todaysCommitments = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    return commitments.filter(c => {
      const commitmentDate = new Date(c.start_time).toISOString().split('T')[0];
      return commitmentDate === todayStr;
    });
  }, [commitments]);

  // Get upcoming commitments (next 7 days)
  const upcomingCommitments = useMemo(() => {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return commitments.filter(c => {
      const commitmentTime = new Date(c.start_time);
      return commitmentTime >= now && commitmentTime <= weekFromNow;
    }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }, [commitments]);

  // Find the next available slot for a given duration
  const findNextAvailableSlot = useCallback((durationMinutes: number = 60): Date | null => {
    const now = new Date();
    const suggestions = suggestAlternativeSlots(now, durationMinutes, commitments, 1);
    return suggestions.length > 0 ? suggestions[0].start_time : null;
  }, [commitments]);

  return {
    // Core AI functions
    parseNaturalLanguage: processNaturalLanguageInput,
    checkConflicts,
    getAlternativeSlots,
    suggestReschedule,
    suggestImprovements,
    
    // Data with AI insights
    sortedCommitments,
    todaysCommitments,
    upcomingCommitments,
    
    // AI suggestions
    suggestions,
    setSuggestions,
    getAISuggestions,
    
    // Utilities
    findNextAvailableSlot,
    isProcessing,
    
    // Task integration
    generateTaskSuggestions
  };
}
