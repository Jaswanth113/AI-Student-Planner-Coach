import { useState } from 'react';
import { Settings as SettingsIcon, Moon, Sun, Monitor, Bell, Shield, Database, Trash2, Download, Upload, RefreshCw, User, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';

export default function Settings() {
  const { user, signOut } = useAuth();
  const [settings, setSettings] = useState({
    // Appearance
    theme: 'system', // light, dark, system
    fontSize: 14,
    compactMode: false,
    showAnimations: true,

    // Notifications
    notifications: true,
    emailNotifications: true,
    pushNotifications: true,
    notificationSound: true,
    taskReminders: true,
    goalUpdates: true,
    budgetAlerts: true,
    reminderTiming: 15, // minutes before

    // Privacy & Security
    dataCollection: true,
    analytics: false,
    crashReports: true,
    autoLogout: 30, // minutes

    // Data & Storage
    autoBackup: true,
    backupFrequency: 'daily', // daily, weekly, monthly
    storageLimit: 80, // percentage before cleanup

    // General
    timezone: 'Asia/Kolkata',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12h',
    currency: 'INR',
    language: 'en',
    startOfWeek: 'monday',
  });

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const exportData = () => {
    // In a real app, this would export user data
    const dataStr = JSON.stringify({
      tasks: [],
      goals: [],
      expenses: [],
      settings: settings
    }, null, 2);
    
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'life-planner-data.json';
    link.click();
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          console.log('Import data:', data);
          // In a real app, this would import and restore user data
          alert('Data imported successfully!');
        } catch (error) {
          alert('Error importing data. Please check the file format.');
        }
      };
      reader.readAsText(file);
    }
  };

  const resetSettings = () => {
    setSettings({
      theme: 'system',
      fontSize: 14,
      compactMode: false,
      showAnimations: true,
      notifications: true,
      emailNotifications: true,
      pushNotifications: true,
      notificationSound: true,
      taskReminders: true,
      goalUpdates: true,
      budgetAlerts: true,
      reminderTiming: 15,
      dataCollection: true,
      analytics: false,
      crashReports: true,
      autoLogout: 30,
      autoBackup: true,
      backupFrequency: 'daily',
      storageLimit: 80,
      timezone: 'Asia/Kolkata',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '12h',
      currency: 'INR',
      language: 'en',
      startOfWeek: 'monday',
    });
  };

  const clearAllData = () => {
    // In a real app, this would clear all user data
    console.log('Clearing all data...');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="mb-6 p-4 bg-gradient-to-r from-primary/10 to-blue-500/10 rounded-lg border">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'}
            </h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="w-4 h-4" />
              <span>{user?.email}</span>
            </div>
          </div>
          <div className="ml-auto">
            <Button variant="outline" size="sm" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <SettingsIcon className="w-8 h-8" />
          Settings
        </h1>
        <p className="text-lg text-muted-foreground">
          Customize your app experience and manage your preferences
        </p>
      </header>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select value={settings.timezone} onValueChange={(value) => handleSettingChange('timezone', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                      <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                      <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                      <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
                      <SelectItem value="Australia/Sydney">Australia/Sydney (AEDT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select value={settings.language} onValueChange={(value) => handleSettingChange('language', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="hi">हिन्दी (Hindi)</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Date Format</Label>
                  <Select value={settings.dateFormat} onValueChange={(value) => handleSettingChange('dateFormat', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Time Format</Label>
                  <Select value={settings.timeFormat} onValueChange={(value) => handleSettingChange('timeFormat', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12h">12-hour (AM/PM)</SelectItem>
                      <SelectItem value="24h">24-hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={settings.currency} onValueChange={(value) => handleSettingChange('currency', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">₹ Indian Rupee (INR)</SelectItem>
                      <SelectItem value="USD">$ US Dollar (USD)</SelectItem>
                      <SelectItem value="EUR">€ Euro (EUR)</SelectItem>
                      <SelectItem value="GBP">£ British Pound (GBP)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Week Starts On</Label>
                  <Select value={settings.startOfWeek} onValueChange={(value) => handleSettingChange('startOfWeek', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sunday">Sunday</SelectItem>
                      <SelectItem value="monday">Monday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Appearance Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Theme</Label>
                  <p className="text-sm text-muted-foreground mb-3">Choose your preferred color scheme</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'light', label: 'Light', icon: Sun },
                      { value: 'dark', label: 'Dark', icon: Moon },
                      { value: 'system', label: 'System', icon: Monitor },
                    ].map(({ value, label, icon: Icon }) => (
                      <Button
                        key={value}
                        variant={settings.theme === value ? 'default' : 'outline'}
                        className="flex flex-col gap-2 h-auto py-3"
                        onClick={() => handleSettingChange('theme', value)}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-xs">{label}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="text-base font-medium">Font Size</Label>
                  <p className="text-sm text-muted-foreground mb-3">Adjust the text size ({settings.fontSize}px)</p>
                  <Slider
                    value={[settings.fontSize]}
                    onValueChange={([value]) => handleSettingChange('fontSize', value)}
                    min={12}
                    max={20}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Small</span>
                    <span>Large</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="compact-mode" className="text-base font-medium">Compact Mode</Label>
                      <p className="text-sm text-muted-foreground">Reduce spacing and padding</p>
                    </div>
                    <Switch
                      id="compact-mode"
                      checked={settings.compactMode}
                      onCheckedChange={(checked) => handleSettingChange('compactMode', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="animations" className="text-base font-medium">Animations</Label>
                      <p className="text-sm text-muted-foreground">Enable smooth transitions and effects</p>
                    </div>
                    <Switch
                      id="animations"
                      checked={settings.showAnimations}
                      onCheckedChange={(checked) => handleSettingChange('showAnimations', checked)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="notifications" className="text-base font-medium">Enable Notifications</Label>
                    <p className="text-sm text-muted-foreground">Master toggle for all notifications</p>
                  </div>
                  <Switch
                    id="notifications"
                    checked={settings.notifications}
                    onCheckedChange={(checked) => handleSettingChange('notifications', checked)}
                  />
                </div>

                {settings.notifications && (
                  <>
                    <Separator />
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="email-notifications" className="text-base font-medium">Email Notifications</Label>
                          <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                        </div>
                        <Switch
                          id="email-notifications"
                          checked={settings.emailNotifications}
                          onCheckedChange={(checked) => handleSettingChange('emailNotifications', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="push-notifications" className="text-base font-medium">Push Notifications</Label>
                          <p className="text-sm text-muted-foreground">Browser push notifications</p>
                        </div>
                        <Switch
                          id="push-notifications"
                          checked={settings.pushNotifications}
                          onCheckedChange={(checked) => handleSettingChange('pushNotifications', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="notification-sound" className="text-base font-medium">Notification Sound</Label>
                          <p className="text-sm text-muted-foreground">Play sound for notifications</p>
                        </div>
                        <Switch
                          id="notification-sound"
                          checked={settings.notificationSound}
                          onCheckedChange={(checked) => handleSettingChange('notificationSound', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="task-reminders" className="text-base font-medium">Task Reminders</Label>
                          <p className="text-sm text-muted-foreground">Get reminded about upcoming tasks</p>
                        </div>
                        <Switch
                          id="task-reminders"
                          checked={settings.taskReminders}
                          onCheckedChange={(checked) => handleSettingChange('taskReminders', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="goal-updates" className="text-base font-medium">Goal Updates</Label>
                          <p className="text-sm text-muted-foreground">Progress and achievement notifications</p>
                        </div>
                        <Switch
                          id="goal-updates"
                          checked={settings.goalUpdates}
                          onCheckedChange={(checked) => handleSettingChange('goalUpdates', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="budget-alerts" className="text-base font-medium">Budget Alerts</Label>
                          <p className="text-sm text-muted-foreground">Warnings when exceeding budgets</p>
                        </div>
                        <Switch
                          id="budget-alerts"
                          checked={settings.budgetAlerts}
                          onCheckedChange={(checked) => handleSettingChange('budgetAlerts', checked)}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <Label className="text-base font-medium">Reminder Timing</Label>
                      <p className="text-sm text-muted-foreground mb-3">Default reminder time ({settings.reminderTiming} minutes before)</p>
                      <Slider
                        value={[settings.reminderTiming]}
                        onValueChange={([value]) => handleSettingChange('reminderTiming', value)}
                        min={5}
                        max={60}
                        step={5}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>5 min</span>
                        <span>60 min</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Privacy & Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="data-collection" className="text-base font-medium">Anonymous Data Collection</Label>
                    <p className="text-sm text-muted-foreground">Help improve the app with anonymous usage data</p>
                  </div>
                  <Switch
                    id="data-collection"
                    checked={settings.dataCollection}
                    onCheckedChange={(checked) => handleSettingChange('dataCollection', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="analytics" className="text-base font-medium">Analytics</Label>
                    <p className="text-sm text-muted-foreground">Allow analytics tracking for app improvements</p>
                  </div>
                  <Switch
                    id="analytics"
                    checked={settings.analytics}
                    onCheckedChange={(checked) => handleSettingChange('analytics', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="crash-reports" className="text-base font-medium">Crash Reports</Label>
                    <p className="text-sm text-muted-foreground">Send crash reports to help fix bugs</p>
                  </div>
                  <Switch
                    id="crash-reports"
                    checked={settings.crashReports}
                    onCheckedChange={(checked) => handleSettingChange('crashReports', checked)}
                  />
                </div>

                <Separator />

                <div>
                  <Label className="text-base font-medium">Auto Logout</Label>
                  <p className="text-sm text-muted-foreground mb-3">Automatically log out after inactivity ({settings.autoLogout} minutes)</p>
                  <Slider
                    value={[settings.autoLogout]}
                    onValueChange={([value]) => handleSettingChange('autoLogout', value)}
                    min={15}
                    max={120}
                    step={15}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>15 min</span>
                    <span>2 hours</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Data & Storage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Backup Settings */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auto-backup" className="text-base font-medium">Auto Backup</Label>
                    <p className="text-sm text-muted-foreground">Automatically backup your data</p>
                  </div>
                  <Switch
                    id="auto-backup"
                    checked={settings.autoBackup}
                    onCheckedChange={(checked) => handleSettingChange('autoBackup', checked)}
                  />
                </div>

                {settings.autoBackup && (
                  <div className="ml-4 space-y-2">
                    <Label>Backup Frequency</Label>
                    <Select value={settings.backupFrequency} onValueChange={(value) => handleSettingChange('backupFrequency', value)}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label className="text-base font-medium">Storage Alert Threshold</Label>
                  <p className="text-sm text-muted-foreground mb-3">Get notified when storage usage exceeds {settings.storageLimit}%</p>
                  <Slider
                    value={[settings.storageLimit]}
                    onValueChange={([value]) => handleSettingChange('storageLimit', value)}
                    min={50}
                    max={95}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>50%</span>
                    <span>95%</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Data Management */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Data Management</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button variant="outline" className="gap-2" onClick={exportData}>
                    <Download className="w-4 h-4" />
                    Export Data
                  </Button>

                  <Button variant="outline" className="gap-2" asChild>
                    <label>
                      <Upload className="w-4 h-4" />
                      Import Data
                      <input
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={importData}
                      />
                    </label>
                  </Button>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">Current Storage</Badge>
                    <span className="text-sm">2.3 MB / 100 MB</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Last backup: November 21, 2024
                  </div>
                </div>
              </div>

              <Separator />

              {/* Danger Zone */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-red-600">Danger Zone</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button variant="outline" className="gap-2" onClick={resetSettings}>
                    <RefreshCw className="w-4 h-4" />
                    Reset Settings
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="gap-2">
                        <Trash2 className="w-4 h-4" />
                        Clear All Data
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete all your tasks, goals, expenses, and other data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={clearAllData} className="bg-red-600 hover:bg-red-700">
                          Yes, delete everything
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
