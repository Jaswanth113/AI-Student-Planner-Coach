import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Commitment } from '../../types/api';
import { calculatePriority, formatTime } from '../utils/commitmentAI';

interface CalendarWidgetProps {
  commitments: Commitment[];
  onCommitmentClick?: (commitment: Commitment) => void;
  onTimeSlotClick?: (date: Date, hour: number) => void;
  onCommitmentMove?: (commitment: Commitment, newStartTime: Date) => void;
}

export function CalendarWidget({
  commitments,
  onCommitmentClick,
  onTimeSlotClick,
  onCommitmentMove
}: CalendarWidgetProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [draggedCommitment, setDraggedCommitment] = useState<Commitment | null>(null);

  // Get the current week dates
  const weekDates = useMemo(() => {
    const dates = [];
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [currentDate]);

  // Get commitments for a specific day
  const getCommitmentsForDay = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return commitments.filter(commitment => {
      const commitmentDate = new Date(commitment.start_time).toISOString().split('T')[0];
      return commitmentDate === dateStr;
    }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  };

  // Navigate weeks
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentDate(newDate);
  };

  // Get priority color for commitment
  const getPriorityColor = (commitment: Commitment) => {
    const priority = calculatePriority({
      type: commitment.type,
      start_time: new Date(commitment.start_time),
      title: commitment.title
    });
    
    switch (priority) {
      case 'urgent':
        return 'bg-red-500 border-red-600 text-white';
      case 'high':
        return 'bg-orange-500 border-orange-600 text-white';
      case 'medium':
        return 'bg-blue-500 border-blue-600 text-white';
      case 'low':
      default:
        return 'bg-gray-500 border-gray-600 text-white';
    }
  };

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, commitment: Commitment) => {
    setDraggedCommitment(commitment);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent, date: Date, hour: number) => {
    e.preventDefault();
    
    if (draggedCommitment && onCommitmentMove) {
      const newStartTime = new Date(date);
      newStartTime.setHours(hour, 0, 0, 0);
      
      onCommitmentMove(draggedCommitment, newStartTime);
    }
    
    setDraggedCommitment(null);
  };

  // Get commitment position in hour grid
  const getCommitmentStyle = (commitment: Commitment) => {
    const startTime = new Date(commitment.start_time);
    const endTime = new Date(commitment.end_time);
    const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60); // in minutes
    const height = Math.max((duration / 60) * 60, 40); // Minimum 40px height
    
    return {
      height: `${height}px`,
      marginTop: `${startTime.getMinutes()}px`
    };
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Calendar View
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => navigateWeek('prev')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium min-w-[200px] text-center">
              {weekDates[0].toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - {' '}
              {weekDates[6].toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
            <Button size="sm" variant="outline" onClick={() => navigateWeek('next')}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-8 gap-px bg-muted rounded overflow-hidden">
          {/* Time column header */}
          <div className="bg-background p-2 text-xs font-medium text-muted-foreground">
            Time
          </div>
          
          {/* Day headers */}
          {weekDates.map((date, index) => (
            <div key={index} className="bg-background p-2 text-center">
              <div className="text-xs font-medium text-muted-foreground">
                {date.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div className={`text-sm font-bold ${
                date.toDateString() === new Date().toDateString() 
                  ? 'text-blue-600' 
                  : 'text-foreground'
              }`}>
                {date.getDate()}
              </div>
            </div>
          ))}

          {/* Time slots */}
          {Array.from({ length: 16 }, (_, hour) => hour + 6).map(hour => (
            <React.Fragment key={hour}>
              {/* Time label */}
              <div className="bg-background p-2 text-xs text-muted-foreground border-t border-muted">
                {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
              </div>
              
              {/* Day columns */}
              {weekDates.map((date, dayIndex) => {
                const dayCommitments = getCommitmentsForDay(date).filter(c => {
                  const startHour = new Date(c.start_time).getHours();
                  return startHour === hour;
                });
                
                return (
                  <div
                    key={`${hour}-${dayIndex}`}
                    className="bg-background min-h-[60px] border-t border-muted relative p-1 hover:bg-muted/50 cursor-pointer"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, date, hour)}
                    onClick={() => onTimeSlotClick?.(date, hour)}
                  >
                    {dayCommitments.map(commitment => (
                      <div
                        key={commitment.id}
                        className={`absolute left-1 right-1 rounded text-xs p-1 cursor-move 
                          ${getPriorityColor(commitment)} 
                          hover:shadow-lg transition-shadow z-10`}
                        style={getCommitmentStyle(commitment)}
                        draggable
                        onDragStart={(e) => handleDragStart(e, commitment)}
                        onClick={(e) => {
                          e.stopPropagation();
                          onCommitmentClick?.(commitment);
                        }}
                      >
                        <div className="font-medium truncate">{commitment.title}</div>
                        <div className="flex items-center gap-1 mt-1 opacity-90">
                          <Clock className="w-2 h-2" />
                          <span className="text-xs">
                            {formatTime(new Date(commitment.start_time))}
                          </span>
                          {commitment.location && (
                            <>
                              <MapPin className="w-2 h-2 ml-1" />
                              <span className="text-xs truncate max-w-[60px]">
                                {commitment.location}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
        
        {/* Legend */}
        <div className="mt-4 flex items-center gap-4 text-xs">
          <span className="font-medium">Priority:</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-500"></div>
            <span>Urgent</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-orange-500"></div>
            <span>High</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-blue-500"></div>
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-gray-500"></div>
            <span>Low</span>
          </div>
        </div>
        
        <div className="mt-2 text-xs text-muted-foreground">
          💡 Tip: Drag commitments to reschedule them, or click on empty time slots to add new commitments.
        </div>
      </CardContent>
    </Card>
  );
}
