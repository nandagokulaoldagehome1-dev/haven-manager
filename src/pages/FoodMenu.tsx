import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { 
  UtensilsCrossed,
  Coffee,
  Sun,
  Cookie,
  Moon,
  Edit,
  Save,
  Share2,
  Loader2
} from 'lucide-react';

interface DayMenu {
  id?: string;
  day_of_week: string;
  breakfast: string;
  lunch: string;
  evening_snacks: string;
  dinner: string;
}

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const mealIcons = {
  breakfast: Coffee,
  lunch: Sun,
  evening_snacks: Cookie,
  dinner: Moon,
};

export default function FoodMenu() {
  const [weeklyMenu, setWeeklyMenu] = useState<DayMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDay, setEditingDay] = useState<DayMenu | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    try {
      const { data, error } = await supabase
        .from('food_menu')
        .select('*')
        .order('id');

      if (error) throw error;

      // Initialize menu for all days if not exists
      const existingDays = new Set(data?.map(d => d.day_of_week) || []);
      const fullMenu = daysOfWeek.map(day => {
        const existing = data?.find(d => d.day_of_week === day);
        if (existing) return existing;
        return {
          day_of_week: day,
          breakfast: '',
          lunch: '',
          evening_snacks: '',
          dinner: '',
        };
      });

      setWeeklyMenu(fullMenu);
    } catch (error) {
      console.error('Error fetching menu:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (day: DayMenu) => {
    setEditingDay({ ...day });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingDay) return;
    setSaving(true);

    try {
      if (editingDay.id) {
        // Update existing
        const { error } = await supabase
          .from('food_menu')
          .update({
            breakfast: editingDay.breakfast,
            lunch: editingDay.lunch,
            evening_snacks: editingDay.evening_snacks,
            dinner: editingDay.dinner,
          })
          .eq('id', editingDay.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('food_menu')
          .insert({
            day_of_week: editingDay.day_of_week,
            breakfast: editingDay.breakfast,
            lunch: editingDay.lunch,
            evening_snacks: editingDay.evening_snacks,
            dinner: editingDay.dinner,
          });

        if (error) throw error;
      }

      toast({
        title: 'Menu Updated',
        description: `${editingDay.day_of_week}'s menu has been saved.`,
      });

      setDialogOpen(false);
      setEditingDay(null);
      fetchMenu();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save menu',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const today = daysOfWeek[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

  const shareOnWhatsApp = () => {
    const todayMenu = weeklyMenu.find(m => m.day_of_week === today);

    const menuText = `
*${today}*
🌅 Breakfast: ${todayMenu?.breakfast || 'Not set'}
☀️ Lunch: ${todayMenu?.lunch || 'Not set'}
🍪 Snacks: ${todayMenu?.evening_snacks || 'Not set'}
🌙 Dinner: ${todayMenu?.dinner || 'Not set'}
    `;

    const message = `
🍽️ *Today's Food Menu*
━━━━━━━━━━━━━━━━
${menuText}
━━━━━━━━━━━━━━━━
Care Home Management
    `.trim();

    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="page-header mb-0">
            <h1 className="page-title">Food Menu</h1>
            <p className="page-description">Weekly meal schedule for all residents</p>
          </div>
          <Button onClick={shareOnWhatsApp} variant="outline">
            <Share2 className="w-4 h-4" />
            Share on WhatsApp
          </Button>
        </div>

        {/* Today's Highlight */}
        {!loading && (
          <div className="card-elevated p-6 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5 text-primary" />
              Today's Menu ({today})
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(['breakfast', 'lunch', 'evening_snacks', 'dinner'] as const).map(meal => {
                const Icon = mealIcons[meal];
                const todayMenu = weeklyMenu.find(m => m.day_of_week === today);
                return (
                  <div key={meal} className="bg-card rounded-lg p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium capitalize">
                        {meal.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {todayMenu?.[meal] || 'Not set'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Weekly Menu Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {weeklyMenu.map((day, index) => (
              <div 
                key={day.day_of_week}
                className={`card-elevated p-5 animate-slide-up ${day.day_of_week === today ? 'ring-2 ring-primary' : ''}`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">{day.day_of_week}</h3>
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(day)} aria-label={`Edit ${day}`}>
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-3">
                  {(['breakfast', 'lunch', 'evening_snacks', 'dinner'] as const).map(meal => {
                    const Icon = mealIcons[meal];
                    return (
                      <div key={meal} className="flex items-start gap-2">
                        <Icon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground capitalize">
                            {meal.replace('_', ' ')}
                          </p>
                          <p className="text-sm truncate">
                            {day[meal] || <span className="text-muted-foreground italic">Not set</span>}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit {editingDay?.day_of_week}'s Menu</DialogTitle>
            </DialogHeader>
            {editingDay && (
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="breakfast" className="flex items-center gap-2">
                    <Coffee className="w-4 h-4" />
                    Breakfast
                  </Label>
                  <Textarea
                    id="breakfast"
                    value={editingDay.breakfast}
                    onChange={(e) => setEditingDay(prev => prev ? { ...prev, breakfast: e.target.value } : null)}
                    placeholder="e.g., Idli, Sambar, Chutney"
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="lunch" className="flex items-center gap-2">
                    <Sun className="w-4 h-4" />
                    Lunch
                  </Label>
                  <Textarea
                    id="lunch"
                    value={editingDay.lunch}
                    onChange={(e) => setEditingDay(prev => prev ? { ...prev, lunch: e.target.value } : null)}
                    placeholder="e.g., Rice, Dal, Sabzi, Roti"
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="evening_snacks" className="flex items-center gap-2">
                    <Cookie className="w-4 h-4" />
                    Evening Snacks
                  </Label>
                  <Textarea
                    id="evening_snacks"
                    value={editingDay.evening_snacks}
                    onChange={(e) => setEditingDay(prev => prev ? { ...prev, evening_snacks: e.target.value } : null)}
                    placeholder="e.g., Tea, Biscuits"
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="dinner" className="flex items-center gap-2">
                    <Moon className="w-4 h-4" />
                    Dinner
                  </Label>
                  <Textarea
                    id="dinner"
                    value={editingDay.dinner}
                    onChange={(e) => setEditingDay(prev => prev ? { ...prev, dinner: e.target.value } : null)}
                    placeholder="e.g., Roti, Paneer, Dal"
                    rows={2}
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Menu
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
