/**
 * Parses a natural language date string into a JavaScript Date object.
 * @param dateStr - The natural language date string (e.g., "tomorrow at 3pm", "next monday")
 * @returns A Date object or null if parsing fails
 */
export function parseNaturalDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  // Try to parse with native Date first
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date;
  }

  // Simple natural language parsing
  const now = new Date();
  const lowerStr = dateStr.toLowerCase().trim();
  
  // Common patterns
  if (lowerStr === 'now') return new Date();
  if (lowerStr === 'tomorrow') {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }
  if (lowerStr === 'yesterday') {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  }
  if (lowerStr === 'next week') {
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek;
  }
  
  // Try to parse with date-fns if available
  try {
    // @ts-ignore - date-fns might not be installed
    if (typeof parseISO === 'function') {
      // @ts-ignore
      return parseISO(dateStr);
    }
    // @ts-ignore
    if (typeof new Date(dateStr) === 'object' && !isNaN(new Date(dateStr))) {
      // @ts-ignore
      return new Date(dateStr);
    }
  } catch (e) {
    console.warn('Failed to parse date with date-fns, falling back to simple parsing');
  }

  return null;
}

/**
 * Formats a Date object to ISO 8601 string
 * @param date - The Date object to format
 * @returns ISO 8601 formatted date string
 */
export function toISOString(date: Date | null | undefined): string | null {
  if (!date) return null;
  try {
    return date.toISOString();
  } catch (e) {
    console.error('Error formatting date:', e);
    return null;
  }
}

/**
 * Gets a human-readable relative time string (e.g., "in 2 days", "yesterday")
 * @param date - The Date object to format
 * @returns A human-readable relative time string
 */
export function getRelativeTimeString(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((date.getTime() - now.getTime()) / 1000);
  
  const minute = 60;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;

  if (Math.abs(diffInSeconds) < minute) {
    return 'just now';
  } else if (Math.abs(diffInSeconds) < hour) {
    const mins = Math.floor(Math.abs(diffInSeconds) / minute);
    return diffInSeconds > 0 ? `in ${mins} minute${mins > 1 ? 's' : ''}` : `${mins} minute${mins > 1 ? 's' : ''} ago`;
  } else if (Math.abs(diffInSeconds) < day) {
    const hours = Math.floor(Math.abs(diffInSeconds) / hour);
    return diffInSeconds > 0 ? `in ${hours} hour${hours > 1 ? 's' : ''}` : `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (Math.abs(diffInSeconds) < week) {
    const days = Math.floor(Math.abs(diffInSeconds) / day);
    if (days === 1) {
      return diffInSeconds > 0 ? 'tomorrow' : 'yesterday';
    }
    return diffInSeconds > 0 ? `in ${days} days` : `${days} days ago`;
  } else if (Math.abs(diffInSeconds) < month) {
    const weeks = Math.floor(Math.abs(diffInSeconds) / week);
    return diffInSeconds > 0 ? `in ${weeks} week${weeks > 1 ? 's' : ''}` : `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  } else if (Math.abs(diffInSeconds) < year) {
    const months = Math.floor(Math.abs(diffInSeconds) / month);
    return diffInSeconds > 0 ? `in ${months} month${months > 1 ? 's' : ''}` : `${months} month${months > 1 ? 's' : ''} ago`;
  } else {
    const years = Math.floor(Math.abs(diffInSeconds) / year);
    return diffInSeconds > 0 ? `in ${years} year${years > 1 ? 's' : ''}` : `${years} year${years > 1 ? 's' : ''} ago`;
  }
}
