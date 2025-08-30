import { Commitment } from '../../types/api';

export interface ParsedCommitmentData {
  title?: string;
  start_time?: Date;
  end_time?: Date;
  location?: string;
  type?: 'class' | 'hackathon' | 'gym' | 'social' | 'exam';
  duration_minutes?: number;
  description?: string;
  confidence: number;
}

export interface ConflictDetection {
  hasConflict: boolean;
  conflictingCommitments: Commitment[];
  suggestion?: string;
}

export interface TimeSlotSuggestion {
  start_time: Date;
  end_time: Date;
  confidence: number;
  reason: string;
}

/**
 * Parse natural language input to extract commitment data
 */
export function parseCommitmentInput(input: string): ParsedCommitmentData {
  const lowercaseInput = input.toLowerCase();
  let confidence = 0.3; // Base confidence
  const result: ParsedCommitmentData = { confidence };

  // Extract title (usually comes first)
  const titleMatch = input.match(/^([^,]+?)(?:\s+(?:at|on|from|tomorrow|today|next|this))/i);
  if (titleMatch) {
    result.title = titleMatch[1].trim();
    confidence += 0.2;
  } else {
    // Fallback: use first part before time indicators
    const fallbackTitle = input.split(/\s+(?:at|on|from|tomorrow|today|next|this)/i)[0];
    if (fallbackTitle && fallbackTitle !== input) {
      result.title = fallbackTitle.trim();
      confidence += 0.1;
    }
  }

  // Extract type based on keywords
  const typeKeywords = {
    'class': ['class', 'lecture', 'course', 'lesson', 'seminar'],
    'gym': ['gym', 'workout', 'exercise', 'fitness', 'training'],
    'social': ['dinner', 'lunch', 'coffee', 'party', 'hangout', 'social'],
    'exam': ['exam', 'test', 'quiz', 'assessment'],
    'hackathon': ['hackathon', 'coding competition', 'hack']
  };

  for (const [type, keywords] of Object.entries(typeKeywords)) {
    if (keywords.some(keyword => lowercaseInput.includes(keyword))) {
      result.type = type as 'class' | 'hackathon' | 'gym' | 'social' | 'exam';
      confidence += 0.1;
      break;
    }
  }

  // Extract location
  const locationPatterns = [
    /at\s+([^,\n]+?)(?:\s+(?:from|for|at)\s+\d|$)/i,
    /in\s+([^,\n]+?)(?:\s+(?:from|for|at)\s+\d|$)/i,
    /location[:\s]+([^,\n]+?)(?:\s+(?:from|for|at)\s+\d|$)/i
  ];
  
  for (const pattern of locationPatterns) {
    const match = input.match(pattern);
    if (match) {
      result.location = match[1].trim();
      confidence += 0.1;
      break;
    }
  }

  // Extract time and date
  const timeResult = extractTimeAndDate(input);
  if (timeResult.start_time) {
    result.start_time = timeResult.start_time;
    confidence += 0.2;
  }
  if (timeResult.end_time) {
    result.end_time = timeResult.end_time;
    confidence += 0.1;
  } else if (timeResult.duration_minutes) {
    result.duration_minutes = timeResult.duration_minutes;
    if (result.start_time) {
      result.end_time = new Date(result.start_time.getTime() + timeResult.duration_minutes * 60000);
    }
    confidence += 0.1;
  }

  result.confidence = Math.min(confidence, 1.0);
  return result;
}

/**
 * Extract time and date information from natural language
 */
function extractTimeAndDate(input: string): {
  start_time?: Date;
  end_time?: Date;
  duration_minutes?: number;
} {
  const now = new Date();
  const result: { start_time?: Date; end_time?: Date; duration_minutes?: number } = {};

  // Extract duration
  const durationPatterns = [
    /for\s+(\d+)\s*h(?:our)?s?/i,
    /for\s+(\d+)\s*m(?:in)?(?:ute)?s?/i,
    /(\d+)\s*h(?:our)?s?\s*(?:long|duration)/i,
    /(\d+)\s*m(?:in)?(?:ute)?s?\s*(?:long|duration)/i,
    /(\d+\.?\d*)\s*h(?:our)?s?/i
  ];

  for (const pattern of durationPatterns) {
    const match = input.match(pattern);
    if (match) {
      const value = parseFloat(match[1]);
      if (pattern.source.includes('m')) {
        result.duration_minutes = value;
      } else {
        result.duration_minutes = value * 60;
      }
      break;
    }
  }

  // Extract time
  const timePatterns = [
    /at\s+(\d{1,2}):(\d{2})\s*(am|pm)?/i,
    /at\s+(\d{1,2})\s*(am|pm)/i,
    /(\d{1,2}):(\d{2})\s*(am|pm)/i,
    /(\d{1,2})\s*(am|pm)/i
  ];

  let timeMatch;
  for (const pattern of timePatterns) {
    timeMatch = input.match(pattern);
    if (timeMatch) break;
  }

  if (timeMatch) {
    let hours = parseInt(timeMatch[1]);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const ampm = timeMatch[3] || timeMatch[4]; // Handle different capture groups

    if (ampm?.toLowerCase() === 'pm' && hours !== 12) {
      hours += 12;
    } else if (ampm?.toLowerCase() === 'am' && hours === 12) {
      hours = 0;
    }

    // Extract date
    const dateResult = extractDate(input, now);
    const startDate = new Date(dateResult);
    startDate.setHours(hours, minutes, 0, 0);
    result.start_time = startDate;

    if (result.duration_minutes) {
      result.end_time = new Date(startDate.getTime() + result.duration_minutes * 60000);
    }
  }

  return result;
}

/**
 * Extract date from natural language relative to current date
 */
function extractDate(input: string, baseDate: Date): Date {
  const lowercaseInput = input.toLowerCase();
  const result = new Date(baseDate);

  if (lowercaseInput.includes('today')) {
    return result;
  }

  if (lowercaseInput.includes('tomorrow')) {
    result.setDate(result.getDate() + 1);
    return result;
  }

  if (lowercaseInput.includes('next week')) {
    result.setDate(result.getDate() + 7);
    return result;
  }

  // Handle day names
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDay = result.getDay();
  
  for (let i = 0; i < dayNames.length; i++) {
    if (lowercaseInput.includes(dayNames[i])) {
      const targetDay = i;
      let daysToAdd = targetDay - currentDay;
      
      if (lowercaseInput.includes('next')) {
        if (daysToAdd <= 0) daysToAdd += 7;
      } else if (daysToAdd <= 0) {
        daysToAdd += 7; // Default to next occurrence
      }
      
      result.setDate(result.getDate() + daysToAdd);
      return result;
    }
  }

  // Handle specific dates (basic MM/DD or DD/MM format)
  const dateMatch = input.match(/(\d{1,2})\/(\d{1,2})/);
  if (dateMatch) {
    const month = parseInt(dateMatch[1]) - 1; // JavaScript months are 0-indexed
    const day = parseInt(dateMatch[2]);
    result.setMonth(month, day);
    
    // If the date is in the past this year, assume next year
    if (result < baseDate) {
      result.setFullYear(result.getFullYear() + 1);
    }
    return result;
  }

  return result; // Return today if no date found
}

/**
 * Check for conflicts with existing commitments
 */
export function detectConflicts(
  newCommitment: { start_time: Date; end_time: Date },
  existingCommitments: Commitment[]
): ConflictDetection {
  const conflicts = existingCommitments.filter(commitment => {
    const existingStart = new Date(commitment.start_time);
    const existingEnd = new Date(commitment.end_time);
    
    // Check for any overlap
    return (
      (newCommitment.start_time < existingEnd && newCommitment.end_time > existingStart)
    );
  });

  let suggestion = '';
  if (conflicts.length > 0) {
    const conflictTimes = conflicts.map(c => 
      `${new Date(c.start_time).toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      })} - ${new Date(c.end_time).toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      })}`
    ).join(', ');
    
    suggestion = `You have conflicts at: ${conflictTimes}. Consider rescheduling.`;
  }

  return {
    hasConflict: conflicts.length > 0,
    conflictingCommitments: conflicts,
    suggestion
  };
}

/**
 * Suggest alternative time slots when there's a conflict
 */
export function suggestAlternativeSlots(
  desiredStart: Date,
  durationMinutes: number,
  existingCommitments: Commitment[],
  maxSuggestions: number = 3
): TimeSlotSuggestion[] {
  const suggestions: TimeSlotSuggestion[] = [];
  const desiredDate = new Date(desiredStart);
  desiredDate.setHours(0, 0, 0, 0);

  // Try the same day first
  const dayCommitments = existingCommitments.filter(c => {
    const commitmentDate = new Date(c.start_time);
    commitmentDate.setHours(0, 0, 0, 0);
    return commitmentDate.getTime() === desiredDate.getTime();
  }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  // Find gaps in the schedule
  let currentTime = new Date(desiredDate);
  currentTime.setHours(8, 0, 0, 0); // Start at 8 AM

  for (const commitment of dayCommitments) {
    const commitmentStart = new Date(commitment.start_time);
    const gapDuration = commitmentStart.getTime() - currentTime.getTime();
    
    if (gapDuration >= durationMinutes * 60000) {
      const endTime = new Date(currentTime.getTime() + durationMinutes * 60000);
      suggestions.push({
        start_time: new Date(currentTime),
        end_time: endTime,
        confidence: 0.8,
        reason: `Available slot before ${commitment.title}`
      });
      
      if (suggestions.length >= maxSuggestions) break;
    }
    
    currentTime = new Date(commitment.end_time);
  }

  // If we still need suggestions, try after the last commitment
  if (suggestions.length < maxSuggestions) {
    const endTime = new Date(currentTime.getTime() + durationMinutes * 60000);
    if (endTime.getHours() <= 22) { // Don't suggest past 10 PM
      suggestions.push({
        start_time: new Date(currentTime),
        end_time: endTime,
        confidence: 0.7,
        reason: 'Available slot after existing commitments'
      });
    }
  }

  // If still need suggestions, try next day
  if (suggestions.length < maxSuggestions) {
    const nextDay = new Date(desiredDate);
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(desiredStart.getHours(), desiredStart.getMinutes(), 0, 0);
    
    const nextDayEnd = new Date(nextDay.getTime() + durationMinutes * 60000);
    suggestions.push({
      start_time: nextDay,
      end_time: nextDayEnd,
      confidence: 0.6,
      reason: 'Same time tomorrow'
    });
  }

  return suggestions;
}

/**
 * Calculate priority based on commitment type and timing
 */
export function calculatePriority(commitment: {
  type: string;
  start_time: Date;
  title?: string;
}): 'urgent' | 'high' | 'medium' | 'low' {
  const now = new Date();
  const timeDiff = commitment.start_time.getTime() - now.getTime();
  const hoursUntil = timeDiff / (1000 * 60 * 60);

  // Urgent: less than 2 hours away
  if (hoursUntil <= 2) return 'urgent';

  // High priority types
  if (commitment.type === 'exam' || commitment.type === 'class') {
    return hoursUntil <= 24 ? 'urgent' : 'high';
  }

  // Medium priority
  if (commitment.type === 'hackathon' || commitment.type === 'social') {
    return hoursUntil <= 6 ? 'high' : 'medium';
  }

  // Low priority (gym, general)
  return hoursUntil <= 6 ? 'medium' : 'low';
}

/**
 * Estimate travel time based on location
 */
export function estimateTravelTime(location?: string): number {
  if (!location) return 0;

  const lowercaseLocation = location.toLowerCase();
  
  // Online locations
  if (lowercaseLocation.includes('zoom') || 
      lowercaseLocation.includes('teams') || 
      lowercaseLocation.includes('online') ||
      lowercaseLocation.includes('virtual')) {
    return 0;
  }

  // Home locations
  if (lowercaseLocation.includes('home') || lowercaseLocation.includes('house')) {
    return 0;
  }

  // Campus/nearby locations (estimated)
  if (lowercaseLocation.includes('campus') || 
      lowercaseLocation.includes('library') ||
      lowercaseLocation.includes('hall') ||
      lowercaseLocation.includes('building')) {
    return 10; // 10 minutes
  }

  // Gym/fitness centers
  if (lowercaseLocation.includes('gym') || lowercaseLocation.includes('fitness')) {
    return 15; // 15 minutes
  }

  // Default for other locations
  return 20; // 20 minutes
}

/**
 * Detect recurring patterns in user's commitments
 */
export function detectRecurringPatterns(commitments: Commitment[]): {
  pattern: string;
  suggestion: string;
  confidence: number;
}[] {
  const patterns: { [key: string]: Commitment[] } = {};
  
  // Group commitments by title similarity and time patterns
  commitments.forEach(commitment => {
    const key = `${commitment.title.toLowerCase()}-${new Date(commitment.start_time).getDay()}-${new Date(commitment.start_time).getHours()}`;
    if (!patterns[key]) {
      patterns[key] = [];
    }
    patterns[key].push(commitment);
  });

  return Object.entries(patterns)
    .filter(([_, commitmentGroup]) => commitmentGroup.length >= 2)
    .map(([key, commitmentGroup]) => {
      const [title, dayOfWeek, hour] = key.split('-');
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      return {
        pattern: `${title} every ${dayNames[parseInt(dayOfWeek)]} at ${hour}:00`,
        suggestion: `You usually have "${commitmentGroup[0].title}" every ${dayNames[parseInt(dayOfWeek)]} at ${hour}:00. Would you like to make this recurring?`,
        confidence: Math.min(commitmentGroup.length / 4, 1) // Higher confidence with more occurrences
      };
    })
    .sort((a, b) => b.confidence - a.confidence);
}

/**
 * Generate smart suggestions for related tasks
 */
export function suggestRelatedTasks(commitment: Commitment): {
  title: string;
  description: string;
  priority: number;
  estimate: number;
}[] {
  const suggestions: any[] = [];
  const type = commitment.type;
  const title = commitment.title.toLowerCase();

  if (type === 'class' || type === 'exam') {
    suggestions.push({
      title: `Study for ${commitment.title}`,
      description: `Prepare and study for ${commitment.title}`,
      priority: type === 'exam' ? 1 : 2,
      estimate: type === 'exam' ? 120 : 60
    });
    
    if (title.includes('presentation') || title.includes('project')) {
      suggestions.push({
        title: `Prepare materials for ${commitment.title}`,
        description: `Gather and organize materials needed for ${commitment.title}`,
        priority: 2,
        estimate: 45
      });
    }
  }

  if (type === 'hackathon') {
    suggestions.push({
      title: `Prepare for ${commitment.title}`,
      description: `Set up development environment and plan project for ${commitment.title}`,
      priority: 2,
      estimate: 90
    });
  }

  if (type === 'social' && (title.includes('meeting') || title.includes('dinner'))) {
    suggestions.push({
      title: `Plan agenda for ${commitment.title}`,
      description: `Prepare talking points or reservation details`,
      priority: 3,
      estimate: 15
    });
  }

  if (commitment.location && !commitment.location.toLowerCase().includes('online')) {
    suggestions.push({
      title: `Travel to ${commitment.location}`,
      description: `Leave early for ${commitment.title} at ${commitment.location}`,
      priority: 2,
      estimate: estimateTravelTime(commitment.location)
    });
  }

  return suggestions;
}

/**
 * Format time for display
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Check if a commitment is happening soon (within the next 2 hours)
 */
export function isCommitmentSoon(commitment: Commitment): boolean {
  const now = new Date();
  const startTime = new Date(commitment.start_time);
  const timeDiff = startTime.getTime() - now.getTime();
  const hoursUntil = timeDiff / (1000 * 60 * 60);
  
  return hoursUntil <= 2 && hoursUntil > 0;
}

/**
 * Get reminder text based on timing and location
 */
export function generateReminderText(commitment: Commitment): string {
  const now = new Date();
  const startTime = new Date(commitment.start_time);
  const timeDiff = startTime.getTime() - now.getTime();
  const minutesUntil = Math.round(timeDiff / (1000 * 60));
  
  if (minutesUntil <= 0) {
    return `${commitment.title} is starting now!`;
  }
  
  const travelTime = estimateTravelTime(commitment.location);
  
  if (travelTime > 0 && minutesUntil <= travelTime + 5) {
    return `Leave now for ${commitment.title} at ${commitment.location} (${travelTime} min travel time)`;
  }
  
  if (minutesUntil <= 30) {
    return `${commitment.title} starts in ${minutesUntil} minutes`;
  }
  
  if (minutesUntil <= 60) {
    return `${commitment.title} starts in ${Math.round(minutesUntil / 15) * 15} minutes`;
  }
  
  const hours = Math.round(minutesUntil / 60);
  return `${commitment.title} starts in ${hours} hour${hours > 1 ? 's' : ''}`;
}
