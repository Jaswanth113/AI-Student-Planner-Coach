import { useState, useEffect, useCallback } from 'react';
import { Commitment } from '../../types/api';
import { estimateTravelTime, generateReminderText, isCommitmentSoon } from '../utils/commitmentAI';
import { useToast } from './use-toast';

export interface SmartReminder {
  id: string;
  commitmentId: string;
  message: string;
  triggerTime: Date;
  type: 'upcoming' | 'travel' | 'preparation' | 'urgent';
  dismissed: boolean;
}

export interface NotificationSettings {
  enableBrowserNotifications: boolean;
  enableTravelAlerts: boolean;
  defaultReminderMinutes: number;
  urgentThresholdMinutes: number;
}

export function useSmartReminders(commitments: Commitment[]) {
  const [reminders, setReminders] = useState<SmartReminder[]>([]);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    enableBrowserNotifications: true,
    enableTravelAlerts: true,
    defaultReminderMinutes: 15,
    urgentThresholdMinutes: 30
  });
  const { toast } = useToast();

  // Request notification permission
  useEffect(() => {
    if (notificationSettings.enableBrowserNotifications && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, [notificationSettings.enableBrowserNotifications]);

  // Generate reminders for commitments
  const generateReminders = useCallback(() => {
    const newReminders: SmartReminder[] = [];
    const now = new Date();

    commitments.forEach(commitment => {
      const startTime = new Date(commitment.start_time);
      const timeDiff = startTime.getTime() - now.getTime();
      const minutesUntil = Math.round(timeDiff / (1000 * 60));

      // Skip past commitments
      if (minutesUntil < 0) return;

      // Standard reminder (based on reminder_minutes from commitment)
      const reminderTime = new Date(startTime.getTime() - (commitment.reminder_minutes || 15) * 60000);
      if (reminderTime > now && reminderTime <= new Date(now.getTime() + 24 * 60 * 60 * 1000)) {
        newReminders.push({
          id: `${commitment.id}-standard`,
          commitmentId: commitment.id,
          message: generateReminderText(commitment),
          triggerTime: reminderTime,
          type: minutesUntil <= notificationSettings.urgentThresholdMinutes ? 'urgent' : 'upcoming',
          dismissed: false
        });
      }

      // Travel reminder (if location requires travel time)
      if (notificationSettings.enableTravelAlerts && commitment.location) {
        const travelTime = estimateTravelTime(commitment.location);
        if (travelTime > 0) {
          const travelReminderTime = new Date(startTime.getTime() - (travelTime + 5) * 60000);
          if (travelReminderTime > now && travelReminderTime <= new Date(now.getTime() + 24 * 60 * 60 * 1000)) {
            newReminders.push({
              id: `${commitment.id}-travel`,
              commitmentId: commitment.id,
              message: `Leave in 5 minutes for ${commitment.title} at ${commitment.location} (${travelTime} min travel)`,
              triggerTime: travelReminderTime,
              type: 'travel',
              dismissed: false
            });
          }
        }
      }

      // Preparation reminder for important commitments
      if (commitment.type === 'exam' || commitment.type === 'class') {
        const prepTime = commitment.type === 'exam' ? 60 : 30; // 1 hour for exams, 30 min for classes
        const prepReminderTime = new Date(startTime.getTime() - prepTime * 60000);
        if (prepReminderTime > now && prepReminderTime <= new Date(now.getTime() + 24 * 60 * 60 * 1000)) {
          newReminders.push({
            id: `${commitment.id}-prep`,
            commitmentId: commitment.id,
            message: `Time to prepare for ${commitment.title} (starts in ${prepTime} minutes)`,
            triggerTime: prepReminderTime,
            type: 'preparation',
            dismissed: false
          });
        }
      }
    });

    // Sort by trigger time
    newReminders.sort((a, b) => a.triggerTime.getTime() - b.triggerTime.getTime());
    setReminders(newReminders);
  }, [commitments, notificationSettings]);

  // Check for due reminders and trigger notifications
  const checkDueReminders = useCallback(() => {
    const now = new Date();
    const dueReminders = reminders.filter(reminder => 
      !reminder.dismissed && 
      reminder.triggerTime <= now && 
      reminder.triggerTime > new Date(now.getTime() - 5 * 60000) // Within last 5 minutes
    );

    dueReminders.forEach(reminder => {
      // Show toast notification
      toast({
        title: getNotificationTitle(reminder.type),
        description: reminder.message,
        variant: reminder.type === 'urgent' ? 'destructive' : 'default'
      });

      // Show browser notification if enabled
      if (notificationSettings.enableBrowserNotifications && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(getNotificationTitle(reminder.type), {
          body: reminder.message,
          icon: '/favicon.ico',
          tag: reminder.id
        });
      }

      // Mark as dismissed
      setReminders(prev => prev.map(r => 
        r.id === reminder.id ? { ...r, dismissed: true } : r
      ));
    });
  }, [reminders, notificationSettings.enableBrowserNotifications, toast]);

  // Get notification title based on type
  const getNotificationTitle = (type: SmartReminder['type']): string => {
    switch (type) {
      case 'urgent':
        return '🚨 Urgent Reminder';
      case 'travel':
        return '🚗 Travel Alert';
      case 'preparation':
        return '📚 Preparation Time';
      case 'upcoming':
      default:
        return '📅 Upcoming Commitment';
    }
  };

  // Get active (non-dismissed) reminders for display
  const getActiveReminders = useCallback(() => {
    const now = new Date();
    return reminders.filter(reminder => 
      !reminder.dismissed && 
      reminder.triggerTime <= new Date(now.getTime() + 60 * 60000) // Next hour
    );
  }, [reminders]);

  // Get commitments that are happening soon
  const getSoonCommitments = useCallback(() => {
    return commitments.filter(isCommitmentSoon);
  }, [commitments]);

  // Dismiss a reminder
  const dismissReminder = useCallback((reminderId: string) => {
    setReminders(prev => prev.map(r => 
      r.id === reminderId ? { ...r, dismissed: true } : r
    ));
  }, []);

  // Update notification settings
  const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    setNotificationSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  // Effects
  useEffect(() => {
    generateReminders();
  }, [generateReminders]);

  useEffect(() => {
    const interval = setInterval(checkDueReminders, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [checkDueReminders]);

  return {
    reminders,
    activeReminders: getActiveReminders(),
    soonCommitments: getSoonCommitments(),
    notificationSettings,
    dismissReminder,
    updateSettings,
    generateReminders
  };
}
