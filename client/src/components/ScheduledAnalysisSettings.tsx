import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { apiRequest } from "@/lib/queryClient";
import { getErrorMessage } from "@/lib/errors";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock, Save, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type AnalysisFrequency = 'daily' | 'weekly' | 'monthly' | 'manual';

interface ScheduledAnalysisSettingsProps {
  userId: string;
}

export function ScheduledAnalysisSettings({ userId }: ScheduledAnalysisSettingsProps) {
  const [frequency, setFrequency] = useState<AnalysisFrequency>('manual');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('09:00');

  // Fetch current schedule
  const { data, refetch } = useQuery({
    queryKey: ['/api/profile/schedule', userId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/profile/schedule`);
      if (!response.ok) return null;
      return response.json();
    },
  });

  const schedule = data?.schedule;
  const analysesToday = data?.analysesToday || 0;

  // Save schedule mutation
  const saveScheduleMutation = useMutation({
    mutationFn: async () => {
      const scheduleData = {
        frequency,
        scheduledDate: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null,
        scheduledTime: selectedTime,
      };

      const response = await apiRequest("POST", "/api/profile/schedule", scheduleData);
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to save schedule');
      }
      return response.json();
    },
    onSuccess: () => {
      refetch();
    },
  });

  // Delete schedule mutation
  const deleteScheduleMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/profile/schedule");
      if (!response.ok) {
        throw new Error('Failed to delete schedule');
      }
      return response.json();
    },
    onSuccess: () => {
      setFrequency('manual');
      setSelectedDate(undefined);
      setSelectedTime('09:00');
      refetch();
    },
  });

  const handleSave = () => {
    saveScheduleMutation.mutate();
  };

  const handleDelete = () => {
    deleteScheduleMutation.mutate();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Scheduled Profile Analysis
        </CardTitle>
        <CardDescription>
          Creator tier: Run up to 5 analyses per day. Schedule automatic analysis or run manually on demand.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Frequency Selector */}
        <div className="space-y-2">
          <Label htmlFor="frequency">Analysis Frequency</Label>
          <Select
            value={frequency}
            onValueChange={(value) => setFrequency(value as AnalysisFrequency)}
          >
            <SelectTrigger id="frequency">
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Manual (On Demand)</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {frequency === 'manual' && 'Run analysis whenever you want (up to 5 per day)'}
            {frequency === 'daily' && 'Analysis will run every day at the scheduled time'}
            {frequency === 'weekly' && 'Analysis will run once per week on the selected day'}
            {frequency === 'monthly' && 'Analysis will run once per month on the selected date'}
          </p>
        </div>

        {/* Date Picker (for weekly/monthly) */}
        {(frequency === 'weekly' || frequency === 'monthly') && (
          <div className="space-y-2">
            <Label>
              {frequency === 'weekly' ? 'Select Day of Week' : 'Select Date'}
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                  disabled={(date) => {
                    // For weekly, only allow future dates
                    if (frequency === 'weekly') {
                      return date < new Date();
                    }
                    // For monthly, allow any day
                    return false;
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Time Picker */}
        {frequency !== 'manual' && (
          <div className="space-y-2">
            <Label htmlFor="time">Scheduled Time</Label>
            <Select value={selectedTime} onValueChange={setSelectedTime}>
              <SelectTrigger id="time">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 24 }, (_, i) => {
                  const hour = i.toString().padStart(2, '0');
                  return (
                    <SelectItem key={`${hour}:00`} value={`${hour}:00`}>
                      {format(new Date().setHours(i, 0), 'h:mm a')}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Analysis will start at this time (your local timezone)
            </p>
          </div>
        )}

        {/* Current Schedule Info */}
        {schedule && (
          <div className="bg-muted p-4 rounded-lg space-y-1">
            <p className="text-sm font-medium">Current Schedule</p>
            <p className="text-xs text-muted-foreground">
              Frequency: {schedule.frequency}
            </p>
            {schedule.nextRun && (
              <p className="text-xs text-muted-foreground">
                Next analysis: {format(new Date(schedule.nextRun), 'PPP p')}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Analyses today: {analysesToday} / 5
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={
              saveScheduleMutation.isPending ||
              (frequency !== 'manual' && !selectedDate && (frequency === 'weekly' || frequency === 'monthly'))
            }
            className="flex-1"
          >
            {saveScheduleMutation.isPending ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Schedule
              </>
            )}
          </Button>

          {schedule && (
            <Button
              variant="outline"
              onClick={handleDelete}
              disabled={deleteScheduleMutation.isPending}
            >
              {deleteScheduleMutation.isPending ? (
                <>Deleting...</>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear
                </>
              )}
            </Button>
          )}
        </div>

        {/* Error Display */}
        {(saveScheduleMutation.error || deleteScheduleMutation.error) && (
          <p className="text-sm text-destructive">
            {getErrorMessage(saveScheduleMutation.error || deleteScheduleMutation.error)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
