import { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, MapPin, Users, Edit, Trash2, ExternalLink, Video, Sparkles, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCommitments } from '@/hooks/useSupabaseData';
import { useCommitmentAI } from '@/hooks/useCommitmentAI';
import { useSmartReminders } from '@/hooks/useSmartReminders';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Commitment } from '../../types/api';
import { SmartQuickAdd } from '@/components/SmartQuickAdd';
import { AISuggestionsPanel } from '@/components/AISuggestionsPanel';
import { CalendarWidget } from '@/components/CalendarWidget';
import { calculatePriority } from '@/utils/commitmentAI';

export default function Commitments() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCommitment, setEditingCommitment] = useState<Commitment | null>(null);
  const [showAIPanel, setShowAIPanel] = useState(true);
  const { commitments, loading, refetch } = useCommitments();
  const { toast } = useToast();
  
  // AI Hooks
  const {
    suggestions,
    setSuggestions,
    getAISuggestions,
    sortedCommitments,
    todaysCommitments: aiTodaysCommitments,
    upcomingCommitments: aiUpcomingCommitments,
    suggestImprovements
  } = useCommitmentAI(commitments);
  
  const {
    activeReminders,
    dismissReminder,
    notificationSettings,
    updateSettings
  } = useSmartReminders(commitments);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    location: '',
    type: 'social' as const,
    attendees: '',
    link: '',
    calendar_id: '',
    recurring: false
  });

  // Reset form data
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      start_time: '',
      end_time: '',
      location: '',
      type: 'social',
      attendees: '',
      link: '',
      calendar_id: '',
      recurring: false
    });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const commitmentData = {
        ...formData,
        start_time: new Date(formData.start_time).toISOString(),
        end_time: new Date(formData.end_time).toISOString(),
        attendees: formData.attendees.split(',').map(a => a.trim()).filter(Boolean),
      };

      let error;
      
      if (editingCommitment) {
        const { error: updateError } = await supabase
          .from('commitments')
          .update(commitmentData)
          .eq('id', editingCommitment.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('commitments')
          .insert([commitmentData]);
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: editingCommitment ? 'Commitment updated' : 'Commitment created',
        description: `Successfully ${editingCommitment ? 'updated' : 'created'} "${formData.title}"`
      });

      resetForm();
      setIsCreateModalOpen(false);
      setEditingCommitment(null);
      refetch();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save commitment',
        variant: 'destructive'
      });
    }
  };

  // Delete commitment
  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('commitments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Commitment deleted',
        description: 'Successfully deleted the commitment'
      });

      refetch();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete commitment',
        variant: 'destructive'
      });
    }
  };

  // Edit commitment
  const handleEdit = (commitment: Commitment) => {
    setEditingCommitment(commitment);
    setFormData({
      title: commitment.title,
      description: commitment.description || '',
      start_time: new Date(commitment.start_time).toISOString().slice(0, 16),
      end_time: new Date(commitment.end_time).toISOString().slice(0, 16),
      location: commitment.location || '',
      type: commitment.type || 'meeting',
      attendees: Array.isArray(commitment.attendees) ? commitment.attendees.join(', ') : '',
      link: commitment.link || '',
      calendar_id: commitment.calendar_id || '',
      recurring: commitment.recurring || false
    });
    setIsCreateModalOpen(true);
  };

  // Get upcoming commitments
  const getUpcomingCommitments = () => {
    const now = new Date();
    return commitments
      .filter(c => new Date(c.start_time) >= now)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      .slice(0, 5);
  };

  // Get today's commitments
  const getTodaysCommitments = () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    return commitments.filter(c => {
      const commitmentDate = new Date(c.start_time).toISOString().split('T')[0];
      return commitmentDate === todayStr;
    });
  };

  // Format duration
  const formatDuration = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end.getTime() - start.getTime();
    const durationHours = Math.round(durationMs / (1000 * 60 * 60) * 2) / 2; // Round to nearest 0.5
    
    if (durationHours < 1) {
      const minutes = Math.round(durationMs / (1000 * 60));
      return `${minutes}m`;
    }
    
    return durationHours % 1 === 0 ? `${durationHours}h` : `${durationHours}h`;
  };

  const CommitmentForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Title*</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          placeholder="Meeting title"
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Meeting details, agenda, notes..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="start_time">Start Time*</Label>
          <Input
            id="start_time"
            type="datetime-local"
            value={formData.start_time}
            onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="end_time">End Time*</Label>
          <Input
            id="end_time"
            type="datetime-local"
            value={formData.end_time}
            onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="type">Type</Label>
        <Select value={formData.type} onValueChange={(value: any) => setFormData(prev => ({ ...prev, type: value }))}>
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="class">Class</SelectItem>
            <SelectItem value="hackathon">Hackathon</SelectItem>
            <SelectItem value="gym">Gym</SelectItem>
            <SelectItem value="social">Social</SelectItem>
            <SelectItem value="exam">Exam</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          value={formData.location}
          onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
          placeholder="Office, Zoom, Address..."
        />
      </div>

      <div>
        <Label htmlFor="attendees">Attendees</Label>
        <Input
          id="attendees"
          value={formData.attendees}
          onChange={(e) => setFormData(prev => ({ ...prev, attendees: e.target.value }))}
          placeholder="john@email.com, jane@email.com"
        />
      </div>

      <div>
        <Label htmlFor="link">Meeting Link</Label>
        <Input
          id="link"
          type="url"
          value={formData.link}
          onChange={(e) => setFormData(prev => ({ ...prev, link: e.target.value }))}
          placeholder="https://zoom.us/j/..."
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            resetForm();
            setIsCreateModalOpen(false);
            setEditingCommitment(null);
          }}
        >
          Cancel
        </Button>
        <Button type="submit">
          {editingCommitment ? 'Update Commitment' : 'Create Commitment'}
        </Button>
      </div>
    </form>
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Generate AI suggestions on component mount
  useEffect(() => {
    const aiSuggestions = getAISuggestions();
    setSuggestions(aiSuggestions);
  }, [commitments, getAISuggestions, setSuggestions]);

  // Handle commitment created from smart quick add
  const handleCommitmentCreated = (commitment: Commitment) => {
    refetch();
    toast({
      title: 'Commitment Created',
      description: `"${commitment.title}" has been added to your schedule`
    });
  };

  // Handle dismissal of AI suggestion
  const handleDismissSuggestion = (index: number) => {
    setSuggestions(prev => prev.filter((_, i) => i !== index));
  };

  // Handle applying an AI suggestion
  const handleApplySuggestion = (suggestion: any) => {
    if (suggestion.action) {
      suggestion.action();
    }
    handleDismissSuggestion(suggestions.indexOf(suggestion));
  };

  // Toggle AI panel visibility
  const toggleAIPanel = () => {
    setShowAIPanel(prev => !prev);
  };

  // Handle calendar widget interactions
  const handleCalendarCommitmentClick = (commitment: Commitment) => {
    handleEdit(commitment);
  };

  const handleCalendarTimeSlotClick = (date: Date, hour: number) => {
    const startTime = new Date(date);
    startTime.setHours(hour, 0, 0, 0);
    const endTime = new Date(startTime);
    endTime.setHours(hour + 1, 0, 0, 0);
    
    setFormData({
      title: '',
      description: '',
      start_time: startTime.toISOString().slice(0, 16),
      end_time: endTime.toISOString().slice(0, 16),
      location: '',
      type: 'social',
      attendees: '',
      link: '',
      calendar_id: '',
      recurring: false
    });
    setIsCreateModalOpen(true);
  };

  const handleCalendarCommitmentMove = async (commitment: Commitment, newStartTime: Date) => {
    const originalDuration = new Date(commitment.end_time).getTime() - new Date(commitment.start_time).getTime();
    const newEndTime = new Date(newStartTime.getTime() + originalDuration);
    
    try {
      const { error } = await supabase
        .from('commitments')
        .update({
          start_time: newStartTime.toISOString(),
          end_time: newEndTime.toISOString()
        })
        .eq('id', commitment.id);

      if (error) throw error;

      toast({
        title: 'Commitment Rescheduled',
        description: `"${commitment.title}" has been moved to ${newStartTime.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        })} at ${newStartTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })}`
      });

      refetch();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reschedule commitment',
        variant: 'destructive'
      });
    }
  };

  const upcomingCommitments = getUpcomingCommitments();
  const todaysCommitments = getTodaysCommitments();

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Commitments</h1>
          <p className="text-lg text-muted-foreground">
            Manage meetings, appointments, and scheduled events
          </p>
        </div>

        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={() => {
              resetForm();
              setEditingCommitment(null);
            }}>
              <Plus className="w-4 h-4" />
              New Commitment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCommitment ? 'Edit Commitment' : 'Create New Commitment'}
              </DialogTitle>
            </DialogHeader>
            <CommitmentForm />
          </DialogContent>
        </Dialog>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Today</p>
                <p className="text-2xl font-bold">{todaysCommitments.length}</p>
              </div>
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">This Week</p>
                <p className="text-2xl font-bold">
                  {commitments.filter(c => {
                    const weekFromNow = new Date();
                    weekFromNow.setDate(weekFromNow.getDate() + 7);
                    return new Date(c.start_time) <= weekFromNow && new Date(c.start_time) >= new Date();
                  }).length}
                </p>
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
                <p className="text-2xl font-bold">{commitments.length}</p>
              </div>
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Smart Quick Add */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Smart Add Commitment
            <Button
              size="sm"
              variant="outline"
              onClick={toggleAIPanel}
              className="ml-auto gap-1"
            >
              <Brain className="w-3 h-3" />
              {showAIPanel ? 'Hide' : 'Show'} AI
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SmartQuickAdd onCommitmentCreated={handleCommitmentCreated} />
        </CardContent>
      </Card>

      {/* AI Suggestions Panel */}
      {showAIPanel && (
        <AISuggestionsPanel
          suggestions={suggestions}
          reminders={activeReminders}
          onDismissSuggestion={handleDismissSuggestion}
          onDismissReminder={dismissReminder}
          onApplySuggestion={handleApplySuggestion}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Today's Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {todaysCommitments.length > 0 ? (
              todaysCommitments.map(commitment => (
                <div key={commitment.id} className="flex items-start justify-between p-3 rounded border border-border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{commitment.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {commitment.type}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(commitment.start_time).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })} - {new Date(commitment.end_time).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </span>
                      {commitment.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {commitment.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    {commitment.link && (
                      <Button size="sm" variant="ghost" asChild>
                        <a href={commitment.link} target="_blank" rel="noopener noreferrer">
                          <Video className="w-3 h-3" />
                        </a>
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(commitment)}>
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(commitment.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No commitments scheduled for today</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Commitments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Upcoming
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingCommitments.length > 0 ? (
              upcomingCommitments.map(commitment => (
                <div key={commitment.id} className="flex items-start justify-between p-3 rounded border border-border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{commitment.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {commitment.type}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-1 mb-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(commitment.start_time).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })} at {new Date(commitment.start_time).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(commitment.start_time, commitment.end_time)}
                        {commitment.location && (
                          <>
                            <span className="mx-1">•</span>
                            <MapPin className="w-3 h-3" />
                            {commitment.location}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    {commitment.link && (
                      <Button size="sm" variant="ghost" asChild>
                        <a href={commitment.link} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(commitment)}>
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(commitment.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No upcoming commitments</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Calendar Widget */}
      <CalendarWidget
        commitments={commitments}
        onCommitmentClick={handleCalendarCommitmentClick}
        onTimeSlotClick={handleCalendarTimeSlotClick}
        onCommitmentMove={handleCalendarCommitmentMove}
      />
    </div>
  );
}
