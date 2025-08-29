import { useState } from 'react';
import { Bell, Clock, CheckCircle, AlertTriangle, Info, Settings, Trash2, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'reminder';
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

export default function Notifications() {
  // Sample notification data - in real app this would come from Supabase
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      title: 'Task Reminder',
      message: 'Complete project proposal is due in 2 hours',
      type: 'reminder',
      read: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
    {
      id: '2',
      title: 'Budget Alert',
      message: 'You\'ve spent 85% of your monthly food budget',
      type: 'warning',
      read: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    },
    {
      id: '3',
      title: 'Task Completed',
      message: 'Great job! You completed "Review weekly reports"',
      type: 'success',
      read: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    },
    {
      id: '4',
      title: 'Meeting Reminder',
      message: 'Team standup meeting starts in 15 minutes',
      type: 'info',
      read: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    },
    {
      id: '5',
      title: 'Goal Achieved',
      message: 'Congratulations! You\'ve completed your weekly exercise goal',
      type: 'success',
      read: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    },
  ]);

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    taskReminders: true,
    goalUpdates: true,
    budgetAlerts: true,
    reminderTiming: '15', // minutes before
    quietHours: false,
    quietStart: '22:00',
    quietEnd: '07:00',
  });

  // Filter notifications
  const unreadNotifications = notifications.filter(n => !n.read);
  const todayNotifications = notifications.filter(n => {
    const today = new Date().toDateString();
    return new Date(n.createdAt).toDateString() === today;
  });

  // Mark notification as read
  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  // Mark all as read
  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // Delete notification
  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Get notification icon
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'reminder': return <Clock className="w-5 h-5 text-blue-500" />;
      default: return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  // Get relative time
  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      return `${days}d ago`;
    }
  };

  const NotificationItem = ({ notification }: { notification: Notification }) => (
    <div className={`p-4 rounded-lg border transition-colors ${
      !notification.read ? 'bg-primary/5 border-primary/20' : 'bg-background border-border'
    }`}>
      <div className="flex items-start gap-3">
        {getNotificationIcon(notification.type)}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-sm">{notification.title}</h4>
            {!notification.read && (
              <Badge variant="default" className="text-xs px-2 py-0">New</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
          <p className="text-xs text-muted-foreground">{getRelativeTime(notification.createdAt)}</p>
        </div>
        <div className="flex items-center gap-1">
          {!notification.read && (
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => markAsRead(notification.id)}
              className="text-xs"
            >
              <CheckCircle className="w-3 h-3" />
            </Button>
          )}
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => deleteNotification(notification.id)}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Notifications</h1>
          <p className="text-lg text-muted-foreground">
            Stay updated with your tasks, goals, and important events
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{unreadNotifications.length} unread</Badge>
          {unreadNotifications.length > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead} className="gap-2">
              <MailCheck className="w-4 h-4" />
              Mark all as read
            </Button>
          )}
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Unread</p>
                <p className="text-2xl font-bold">{unreadNotifications.length}</p>
              </div>
              <Bell className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Today</p>
                <p className="text-2xl font-bold">{todayNotifications.length}</p>
              </div>
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{notifications.length}</p>
              </div>
              <Settings className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All Notifications</TabsTrigger>
          <TabsTrigger value="unread" className="gap-2">
            Unread
            {unreadNotifications.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadNotifications.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {notifications.length > 0 ? (
                notifications
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map(notification => (
                    <NotificationItem key={notification.id} notification={notification} />
                  ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No notifications yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unread" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Unread Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {unreadNotifications.length > 0 ? (
                unreadNotifications
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map(notification => (
                    <NotificationItem key={notification.id} notification={notification} />
                  ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>All caught up! No unread notifications.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="email-notifications" className="text-sm font-medium">
                      Email Notifications
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Receive notifications via email
                    </p>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={notificationSettings.emailNotifications}
                    onCheckedChange={(checked) =>
                      setNotificationSettings(prev => ({ ...prev, emailNotifications: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="push-notifications" className="text-sm font-medium">
                      Push Notifications
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Receive browser push notifications
                    </p>
                  </div>
                  <Switch
                    id="push-notifications"
                    checked={notificationSettings.pushNotifications}
                    onCheckedChange={(checked) =>
                      setNotificationSettings(prev => ({ ...prev, pushNotifications: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="task-reminders" className="text-sm font-medium">
                      Task Reminders
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Get notified about upcoming tasks and deadlines
                    </p>
                  </div>
                  <Switch
                    id="task-reminders"
                    checked={notificationSettings.taskReminders}
                    onCheckedChange={(checked) =>
                      setNotificationSettings(prev => ({ ...prev, taskReminders: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="goal-updates" className="text-sm font-medium">
                      Goal Updates
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Notifications about goal progress and achievements
                    </p>
                  </div>
                  <Switch
                    id="goal-updates"
                    checked={notificationSettings.goalUpdates}
                    onCheckedChange={(checked) =>
                      setNotificationSettings(prev => ({ ...prev, goalUpdates: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="budget-alerts" className="text-sm font-medium">
                      Budget Alerts
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Warnings when approaching budget limits
                    </p>
                  </div>
                  <Switch
                    id="budget-alerts"
                    checked={notificationSettings.budgetAlerts}
                    onCheckedChange={(checked) =>
                      setNotificationSettings(prev => ({ ...prev, budgetAlerts: checked }))
                    }
                  />
                </div>
              </div>

              <div className="border-t pt-6 space-y-4">
                <div className="space-y-2">
                  <Label>Reminder Timing</Label>
                  <Select
                    value={notificationSettings.reminderTiming}
                    onValueChange={(value) =>
                      setNotificationSettings(prev => ({ ...prev, reminderTiming: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 minutes before</SelectItem>
                      <SelectItem value="15">15 minutes before</SelectItem>
                      <SelectItem value="30">30 minutes before</SelectItem>
                      <SelectItem value="60">1 hour before</SelectItem>
                      <SelectItem value="1440">1 day before</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="quiet-hours" className="text-sm font-medium">
                      Quiet Hours
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Disable notifications during specified hours
                    </p>
                  </div>
                  <Switch
                    id="quiet-hours"
                    checked={notificationSettings.quietHours}
                    onCheckedChange={(checked) =>
                      setNotificationSettings(prev => ({ ...prev, quietHours: checked }))
                    }
                  />
                </div>

                {notificationSettings.quietHours && (
                  <div className="grid grid-cols-2 gap-4 ml-4">
                    <div className="space-y-2">
                      <Label className="text-xs">From</Label>
                      <input
                        type="time"
                        value={notificationSettings.quietStart}
                        onChange={(e) =>
                          setNotificationSettings(prev => ({ ...prev, quietStart: e.target.value }))
                        }
                        className="w-full px-3 py-2 text-sm border rounded-md"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">To</Label>
                      <input
                        type="time"
                        value={notificationSettings.quietEnd}
                        onChange={(e) =>
                          setNotificationSettings(prev => ({ ...prev, quietEnd: e.target.value }))
                        }
                        className="w-full px-3 py-2 text-sm border rounded-md"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-6">
                <Button>Save Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
