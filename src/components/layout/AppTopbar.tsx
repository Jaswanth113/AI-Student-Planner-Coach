import { useState } from "react";
import { 
  Search, 
  Plus, 
  Bell, 
  Calendar,
  ChevronDown,
  User,
  CheckSquare,
  ShoppingCart
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";

export function AppTopbar() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { tasks, reminders } = useData();
  const [currentDate] = useState(new Date());
  
  // Calculate real notification count
  const notifications = tasks.filter(t => t.status !== 'Done' && t.due_date_local).length + 
                      reminders.filter(r => r.due_date_local).length;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <header className="fixed top-0 right-0 z-30 content-width topbar-height bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="flex items-center justify-between h-full px-6">
        {/* Left Section - Date & Search */}
        <div className="flex items-center gap-4">
          {/* Date Picker */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 text-sm font-medium">
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">{formatDate(currentDate)}</span>
                <span className="sm:hidden">Today</span>
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 bg-background border shadow-lg">
              <DropdownMenuLabel>Quick Date Navigation</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/planner')}>Today</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/planner')}>Tomorrow</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/planner')}>This Week</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/planner')}>Next Week</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Global Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks, events... (⌘K)"
              className="pl-10 w-64 bg-background/50 border border-border focus:bg-background"
            />
          </div>
        </div>

        {/* Right Section - Actions & User */}
        <div className="flex items-center gap-3">
          {/* Quick Add Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Quick Add</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-background border shadow-lg">
              <DropdownMenuLabel>Create New</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/tasks')}>
                <CheckSquare className="w-4 h-4 mr-2" />
                Task
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/commitments')}>
                <Calendar className="w-4 h-4 mr-2" />
                Event
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/grocery')}>
                <ShoppingCart className="w-4 h-4 mr-2" />
                Grocery Item
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="relative" 
            onClick={() => navigate('/notifications')}
          >
            <Bell className="w-4 h-4" />
            {notifications > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 w-5 h-5 text-xs p-0 flex items-center justify-center"
              >
                {notifications}
              </Badge>
            )}
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <span className="hidden sm:inline text-sm font-medium">
                  {user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'}
                </span>
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-background border shadow-lg">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <div className="px-2 py-1 text-xs text-muted-foreground">
                {user?.email}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <User className="w-4 h-4 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <SettingsIcon className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={signOut}>
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

// Import missing icons
import { SettingsIcon } from "lucide-react";