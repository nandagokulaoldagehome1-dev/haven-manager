import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { 
  Plus, 
  Bell,
  Calendar,
  Check,
  Clock,
  Loader2,
  Trash2,
  Cake,
  CreditCard,
  FileText
} from 'lucide-react';

interface Reminder {
  id: string;
  title: string;
  description: string;
  reminder_type: string;
  due_date: string;
  status: string;
  resident_id: string | null;
  resident_name?: string;
  created_at: string;
}

interface Resident {
  id: string;
  full_name: string;
  date_of_birth: string | null;
}

const reminderTypes = [
  { value: 'birthday', label: 'Birthday', icon: Cake },
  { value: 'payment', label: 'Payment Due', icon: CreditCard },
  { value: 'document', label: 'Document Expiry', icon: FileText },
  { value: 'general', label: 'General', icon: Bell },
];

export default function Reminders() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('all');
  const [generatingBirthdays, setGeneratingBirthdays] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reminderToDelete, setReminderToDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    reminder_type: 'general',
    due_date: '',
    resident_id: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: remindersData, error: remindersError } = await supabase
        .from('reminders')
        .select(`
          *,
          residents (full_name)
        `)
        .order('due_date', { ascending: true });

      if (remindersError) throw remindersError;

      const formattedReminders = remindersData?.map(r => ({
        ...r,
        resident_name: r.residents?.full_name,
      })) || [];

      setReminders(formattedReminders);

      const { data: residentsData } = await supabase
        .from('residents')
        .select('id, full_name, date_of_birth')
        .eq('status', 'active')
        .order('full_name');

      setResidents(residentsData || []);

      // Auto-delete expired birthday reminders (after birthday has passed)
      await deleteExpiredBirthdayReminders(formattedReminders);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteExpiredBirthdayReminders = async (allReminders: Reminder[]) => {
    try {
      const today = new Date();
      const birthdayReminders = allReminders.filter(r => r.reminder_type === 'birthday' && r.status === 'pending');
      
      for (const reminder of birthdayReminders) {
        const dueDate = new Date(reminder.due_date);
        // Delete if birthday has passed (2 days after to account for time zones)
        if (today > new Date(dueDate.getTime() + 2 * 24 * 60 * 60 * 1000)) {
          await supabase.from('reminders').delete().eq('id', reminder.id);
        }
      }
    } catch (error) {
      console.error('Error deleting expired birthday reminders:', error);
    }
  };

  const generateBirthdayReminders = async () => {
    setGeneratingBirthdays(true);
    try {
      const today = new Date();
      const futureDate = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 days from now
      
      let createdCount = 0;

      for (const resident of residents) {
        if (!resident.date_of_birth) continue;

        // Parse date of birth
        const dob = new Date(resident.date_of_birth);
        const dobMonth = dob.getMonth();
        const dobDate = dob.getDate();

        // Find upcoming birthday (this year or next year)
        let birthdayThisYear = new Date(today.getFullYear(), dobMonth, dobDate);
        
        if (birthdayThisYear < today) {
          birthdayThisYear = new Date(today.getFullYear() + 1, dobMonth, dobDate);
        }

        // Check if birthday is within 60 days
        if (birthdayThisYear <= futureDate) {
          // Check if reminder already exists
          const existingReminder = reminders.find(
            r => r.reminder_type === 'birthday' && 
                 r.resident_id === resident.id && 
                 r.status === 'pending' &&
                 r.due_date === birthdayThisYear.toISOString().split('T')[0]
          );

          if (!existingReminder) {
            const age = birthdayThisYear.getFullYear() - dob.getFullYear();
            
            const { error } = await supabase.from('reminders').insert({
              title: `${resident.full_name}'s Birthday`,
              description: `Birthday coming up - will turn ${age} years old`,
              reminder_type: 'birthday',
              due_date: birthdayThisYear.toISOString().split('T')[0],
              resident_id: resident.id,
              status: 'pending',
            });

            if (!error) createdCount++;
          }
        }
      }

      if (createdCount > 0) {
        toast({
          title: 'Birthday Reminders Generated',
          description: `Created ${createdCount} birthday reminder(s) for the next 60 days.`,
        });
      } else {
        toast({
          title: 'No New Reminders',
          description: 'All upcoming birthday reminders are already created.',
        });
      }

      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate birthday reminders',
        variant: 'destructive',
      });
    } finally {
      setGeneratingBirthdays(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase.from('reminders').insert({
        title: formData.title,
        description: formData.description,
        reminder_type: formData.reminder_type,
        due_date: formData.due_date,
        resident_id: formData.resident_id || null,
        status: 'pending',
      });

      if (error) throw error;

      toast({
        title: 'Reminder Created',
        description: 'Your reminder has been saved.',
      });

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create reminder',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('reminders')
        .update({ status: 'completed' })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Reminder Completed',
        description: 'The reminder has been marked as done.',
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const confirmDelete = (id: string) => {
    setReminderToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!reminderToDelete) return;

    try {
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', reminderToDelete);

      if (error) throw error;

      toast({
        title: 'Reminder Deleted',
        description: 'The reminder has been removed.',
      });

      setDeleteDialogOpen(false);
      setReminderToDelete(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      reminder_type: 'general',
      due_date: '',
      resident_id: '',
    });
  };

  const filteredReminders = reminders.filter(reminder => {
    if (filter === 'all') return true;
    if (filter === 'pending') return reminder.status === 'pending';
    if (filter === 'completed') return reminder.status === 'completed';
    return reminder.reminder_type === filter;
  });

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
  };

  const isDueToday = (dueDate: string) => {
    return new Date(dueDate).toDateString() === new Date().toDateString();
  };

  const getTypeIcon = (type: string) => {
    const found = reminderTypes.find(t => t.value === type);
    return found?.icon || Bell;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="page-header mb-0">
            <h1 className="page-title">Reminders</h1>
            <p className="page-description">Track important dates and tasks</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              onClick={generateBirthdayReminders}
              disabled={generatingBirthdays}
              variant="outline"
            >
              {generatingBirthdays && <Loader2 className="w-4 h-4 animate-spin" />}
              Generate Birthday Reminders
            </Button>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4" />
                  Add Reminder
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Reminder</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Reminder title"
                      required
                    />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select 
                      value={formData.reminder_type} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, reminder_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {reminderTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="due_date">Due Date</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label>Resident (Optional)</Label>
                    <Select 
                      value={formData.resident_id} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, resident_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select resident" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No specific resident</SelectItem>
                        {residents.map(resident => (
                          <SelectItem key={resident.id} value={resident.id}>
                            {resident.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Additional details"
                      rows={2}
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                      Create Reminder
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'all', label: 'All' },
            { value: 'pending', label: 'Pending' },
            { value: 'completed', label: 'Completed' },
            ...reminderTypes,
          ].map(option => (
            <Button
              key={option.value}
              variant={filter === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>

        {/* Reminders List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredReminders.length > 0 ? (
          <div className="space-y-3">
            {filteredReminders.map((reminder, index) => {
              const Icon = getTypeIcon(reminder.reminder_type);
              const overdue = isOverdue(reminder.due_date) && reminder.status === 'pending';
              const dueToday = isDueToday(reminder.due_date);
              
              return (
                <div 
                  key={reminder.id}
                  className={`card-elevated p-4 animate-slide-up ${
                    reminder.status === 'completed' ? 'opacity-60' : ''
                  } ${overdue ? 'border-destructive/50' : ''} ${dueToday ? 'border-warning/50' : ''}`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      reminder.status === 'completed' 
                        ? 'bg-success/10' 
                        : overdue 
                          ? 'bg-destructive/10' 
                          : 'bg-primary/10'
                    }`}>
                      {reminder.status === 'completed' ? (
                        <Check className="w-6 h-6 text-success" />
                      ) : (
                        <Icon className={`w-6 h-6 ${overdue ? 'text-destructive' : 'text-primary'}`} />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className={`font-semibold ${reminder.status === 'completed' ? 'line-through' : ''}`}>
                            {reminder.title}
                          </h3>
                          {reminder.resident_name && (
                            <p className="text-sm text-muted-foreground">
                              {reminder.resident_name}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {overdue && <span className="badge-destructive">Overdue</span>}
                          {dueToday && reminder.status === 'pending' && (
                            <span className="badge-warning">Today</span>
                          )}
                          {reminder.status === 'completed' && (
                            <span className="badge-success">Done</span>
                          )}
                        </div>
                      </div>

                      {reminder.description && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {reminder.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 mt-3">
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {new Date(reminder.due_date).toLocaleDateString()}
                        </span>
                        <span className="badge-primary capitalize">
                          {reminder.reminder_type}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {reminder.status === 'pending' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleComplete(reminder.id)}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => confirmDelete(reminder.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card-elevated p-12 text-center">
            <Bell className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No reminders found</h3>
            <p className="text-muted-foreground mb-4">
              {filter !== 'all' 
                ? 'Try a different filter'
                : 'Create your first reminder to stay organized'
              }
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4" />
              Add Reminder
            </Button>
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Reminder</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this reminder? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
