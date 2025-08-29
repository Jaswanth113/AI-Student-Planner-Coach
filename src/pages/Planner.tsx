import { useState, useMemo } from 'react';
import { Calendar, Clock, ChevronLeft, ChevronRight, Plus, Filter, CalendarDays, CheckSquare, MapPin, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useData } from '@/contexts/DataContext';
import { QuickAddModal } from '@/components/modals/QuickAddModal';
import { TaskFormModal } from '@/components/modals/TaskFormModal';

export default function Planner() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const { tasks, commitments, loading } = useData();

  // Navigate between days/weeks
  const navigateDate = (direction: 'prev' | 'next', view: 'day' | 'week') => {
    const newDate = new Date(currentDate);
    if (view === 'day') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    } else {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    }
    setCurrentDate(newDate);
  };

  // Get tasks for a specific date
  const getTasksForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return tasks.filter(task => {
      if (!task.due_date_local && !task.due_date) return false;
      const taskDate = new Date(task.due_date_local || task.due_date!).toISOString().split('T')[0];
      return taskDate === dateStr;
    });
  };

  // Get commitments for a specific date
  const getCommitmentsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return commitments.filter(commitment => {
      const commitmentDate = new Date(commitment.start_time).toISOString().split('T')[0];
      return commitmentDate === dateStr;
    });
  };

  // Generate time slots for day view (6 AM to 11 PM)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 6; hour <= 23; hour++) {
      const time = `${hour.toString().padStart(2, '0')}:00`;
      const displayTime = new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        hour12: true
      });
      slots.push({ time, displayTime, hour });
    }
    return slots;
  };

  // Get week dates starting from Sunday
  const getWeekDates = (startDate: Date) => {
    const week = [];
    const start = new Date(startDate);
    start.setDate(start.getDate() - start.getDay()); // Start from Sunday

    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      week.push(date);
    }
    return week;
  };

  // Get events for a specific hour
  const getEventsForHour = (date: Date, hour: number) => {
    const events = [];
    
    // Get commitments for this hour
    const hourCommitments = getCommitmentsForDate(date).filter(c => {
      const startHour = new Date(c.start_time).getHours();
      return startHour === hour;
    });
    
    // Get tasks due at this hour (if they have specific times)
    const hourTasks = getTasksForDate(date).filter(task => {
      if (!task.due_date_local && !task.due_date) return false;
      const taskDate = new Date(task.due_date_local || task.due_date!);
      return taskDate.getHours() === hour;
    });

    return { commitments: hourCommitments, tasks: hourTasks };
  };

  const DayView = () => {
    const todayTasks = getTasksForDate(currentDate);
    const todayCommitments = getCommitmentsForDate(currentDate);
    const timeSlots = generateTimeSlots();

    const totalFocusTime = todayTasks.reduce((acc, task) => acc + (task.estimate || 0), 0);
    const completedTasks = todayTasks.filter(task => task.status === 'Done').length;
    const completionRate = todayTasks.length > 0 ? (completedTasks / todayTasks.length) * 100 : 0;

    return (
      <div className="space-y-6">
        {/* Day Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigateDate('prev', 'day')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-2xl font-semibold">
              {currentDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric',
                year: 'numeric'
              })}
            </h2>
            <Button variant="outline" size="sm" onClick={() => navigateDate('next', 'day')}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsTaskModalOpen(true)} className="gap-2">
              <CheckSquare className="w-4 h-4" />
              Add Task
            </Button>
            <Button onClick={() => setIsQuickAddOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Event
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Time Schedule */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Daily Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 max-h-[600px] overflow-y-auto">
                {timeSlots.map(({ time, displayTime, hour }) => {
                  const { commitments: hourCommitments, tasks: hourTasks } = getEventsForHour(currentDate, hour);

                  return (
                    <div key={time} className="flex items-start gap-4 py-3 border-b border-border/30 last:border-0">
                      <div className="text-sm text-muted-foreground w-20 pt-1 font-medium">
                        {displayTime}
                      </div>
                      <div className="flex-1 min-h-[32px] space-y-1">
                        {/* Commitments */}
                        {hourCommitments.map(commitment => (
                          <div
                            key={commitment.id}
                            className="bg-primary/10 border border-primary/20 rounded-lg p-3 hover:bg-primary/15 transition-colors cursor-pointer"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="text-sm font-medium text-primary">{commitment.title}</div>
                                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                                  <Clock className="w-3 h-3" />
                                  <span>
                                    {new Date(commitment.start_time).toLocaleTimeString('en-US', {
                                      hour: 'numeric',
                                      minute: '2-digit',
                                      hour12: true
                                    })} - 
                                    {new Date(commitment.end_time).toLocaleTimeString('en-US', {
                                      hour: 'numeric',
                                      minute: '2-digit',
                                      hour12: true
                                    })}
                                  </span>
                                  {commitment.location && (
                                    <>
                                      <MapPin className="w-3 h-3" />
                                      <span>{commitment.location}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {commitment.type}
                              </Badge>
                            </div>
                          </div>
                        ))}

                        {/* Tasks */}
                        {hourTasks.map(task => (
                          <div
                            key={task.id}
                            className="bg-secondary/50 border border-border rounded-lg p-3 hover:bg-secondary/70 transition-colors cursor-pointer"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="text-sm font-medium">{task.title}</div>
                                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                                  <Clock className="w-3 h-3" />
                                  <span>{task.estimate}m</span>
                                  <Badge variant="outline" className="text-xs">
                                    {task.tags?.[0] || 'General'}
                                  </Badge>
                                </div>
                              </div>
                              <Badge 
                                variant={task.priority === 1 ? 'destructive' : task.priority === 2 ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                P{task.priority}
                              </Badge>
                            </div>
                          </div>
                        ))}

                        {/* Empty slot indicator */}
                        {hourCommitments.length === 0 && hourTasks.length === 0 && (
                          <div className="text-xs text-muted-foreground/50 italic py-2">
                            Free time
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Tasks Sidebar */}
          <div className="space-y-4">
            {/* Day Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Day Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Tasks Due</span>
                    <span className="font-medium">{todayTasks.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Completed</span>
                    <span className="font-medium text-green-600">{completedTasks}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Focus Time</span>
                    <span className="font-medium">{Math.round(totalFocusTime / 60)}h {totalFocusTime % 60}m</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span className="font-medium">{Math.round(completionRate)}%</span>
                  </div>
                  <Progress value={completionRate} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Tasks Due Today */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckSquare className="w-4 h-4" />
                  Due Today ({todayTasks.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-64 overflow-y-auto">
                {todayTasks.length > 0 ? (
                  todayTasks.map(task => (
                    <div key={task.id} className="p-2 rounded border border-border bg-background hover:bg-muted/50 transition-colors">
                      <div className="text-sm font-medium">{task.title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {task.estimate}m
                        </Badge>
                        <Badge 
                          variant={task.priority === 1 ? 'destructive' : task.priority === 2 ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          P{task.priority}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {task.tags?.[0] || 'General'}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No tasks due today</p>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Events */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Today's Events</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {todayCommitments.length > 0 ? (
                  todayCommitments.map(commitment => (
                    <div key={commitment.id} className="p-2 rounded border border-border bg-background">
                      <div className="text-sm font-medium">{commitment.title}</div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(commitment.start_time).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}
                        {commitment.location && (
                          <>
                            <MapPin className="w-3 h-3 ml-2" />
                            <span>{commitment.location}</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No events today</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  const WeekView = () => {
    const weekDates = getWeekDates(currentDate);
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div className="space-y-6">
        {/* Week Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigateDate('prev', 'week')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-2xl font-semibold">
              Week of {weekDates[0].toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </h2>
            <Button variant="outline" size="sm" onClick={() => navigateDate('next', 'week')}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsTaskModalOpen(true)} className="gap-2">
              <CheckSquare className="w-4 h-4" />
              Add Task
            </Button>
            <Button onClick={() => setIsQuickAddOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Event
            </Button>
          </div>
        </div>

        {/* Week Calendar Grid */}
        <Card>
          <CardContent className="p-0">
            <div className="calendar-grid">
              {/* Day Headers */}
              {weekDays.map((day, index) => (
                <div key={day} className="calendar-day-header">
                  <div className="font-medium">{day}</div>
                  <div className="text-xs text-muted-foreground">
                    {weekDates[index].getDate()}
                  </div>
                </div>
              ))}

              {/* Day Cells */}
              {weekDates.map(date => {
                const dayTasks = getTasksForDate(date);
                const dayCommitments = getCommitmentsForDate(date);
                const isToday = date.toDateString() === new Date().toDateString();
                const isPast = date < new Date() && !isToday;

                return (
                  <div
                    key={date.toISOString()}
                    className={`calendar-day ${
                      isToday ? 'bg-primary/5 border-2 border-primary/20' : ''
                    } ${isPast ? 'bg-muted/30' : ''}`}
                  >
                    <div className={`text-sm font-medium mb-2 ${
                      isToday ? 'text-primary' : isPast ? 'text-muted-foreground' : 'text-foreground'
                    }`}>
                      {date.getDate()}
                      {isToday && <span className="ml-1 text-xs">(Today)</span>}
                    </div>

                    <div className="space-y-1">
                      {/* Commitments */}
                      {dayCommitments.slice(0, 3).map(commitment => (
                        <div
                          key={commitment.id}
                          className="calendar-event"
                          title={`${commitment.title} - ${new Date(commitment.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`}
                        >
                          <div className="font-medium truncate">{commitment.title}</div>
                          <div className="text-xs opacity-75">
                            {new Date(commitment.start_time).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              hour12: true
                            })}
                          </div>
                        </div>
                      ))}

                      {/* Tasks */}
                      {dayTasks.slice(0, 2).map(task => (
                        <div
                          key={task.id}
                          className="calendar-event calendar-task"
                          title={`${task.title} - ${task.estimate}m`}
                        >
                          <div className="font-medium truncate">{task.title}</div>
                          <div className="text-xs opacity-75 flex items-center gap-1">
                            <Clock className="w-2 h-2" />
                            {task.estimate}m
                          </div>
                        </div>
                      ))}

                      {/* Show more indicator */}
                      {(dayCommitments.length > 3 || dayTasks.length > 2) && (
                        <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
                          +{Math.max(0, dayCommitments.length - 3) + Math.max(0, dayTasks.length - 2)} more
                        </div>
                      )}

                      {/* Empty day indicator */}
                      {dayCommitments.length === 0 && dayTasks.length === 0 && !isPast && (
                        <div className="text-xs text-muted-foreground/50 italic py-2">
                          Free day
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Week Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {weekDates.reduce((acc, date) => acc + getTasksForDate(date).length, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Tasks This Week</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {weekDates.reduce((acc, date) => acc + getCommitmentsForDate(date).length, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Events This Week</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {Math.round(weekDates.reduce((acc, date) => 
                    acc + getTasksForDate(date).reduce((taskAcc, task) => taskAcc + (task.estimate || 0), 0), 0
                  ) / 60)}h
                </div>
                <div className="text-sm text-muted-foreground">Focus Time Needed</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  if (loading.tasks || loading.commitments) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="h-96 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Page Header */}
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Planner</h1>
        <p className="text-lg text-muted-foreground">Plan your time and manage your schedule</p>
      </header>

      {/* View Tabs */}
      <Tabs defaultValue="day" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList className="grid w-[200px] grid-cols-2">
            <TabsTrigger value="day" className="gap-2">
              <CalendarDays className="w-4 h-4" />
              Day
            </TabsTrigger>
            <TabsTrigger value="week" className="gap-2">
              <Calendar className="w-4 h-4" />
              Week
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
              Today
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="w-4 h-4" />
              Filter
            </Button>
          </div>
        </div>

        <TabsContent value="day" className="space-y-6">
          <DayView />
        </TabsContent>

        <TabsContent value="week" className="space-y-6">
          <WeekView />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
      />
      
      <TaskFormModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
      />
    </div>
  );
}