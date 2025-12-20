import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { toast } from '@/hooks/use-toast';
import { 
  Plus, 
  Loader2, 
  Utensils, 
  Stethoscope, 
  Package,
  IndianRupee,
  Calendar,
  Trash2,
  CheckCircle2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ExtraCharge {
  id: string;
  description: string;
  category: string;
  amount: number;
  date_charged: string;
  month_year: string;
  is_billed: boolean;
  payment_id: string | null;
}

interface ResidentExtraChargesProps {
  residentId: string;
  residentName: string;
}

const categories = [
  { value: 'food', label: 'Food', icon: Utensils, color: 'text-orange-500' },
  { value: 'medical', label: 'Medical Services', icon: Stethoscope, color: 'text-red-500' },
  { value: 'other', label: 'Other', icon: Package, color: 'text-blue-500' },
];

export function ResidentExtraCharges({ residentId, residentName }: ResidentExtraChargesProps) {
  const [charges, setCharges] = useState<ExtraCharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    category: 'food',
    amount: '',
    date_charged: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchCharges();
  }, [residentId]);

  const fetchCharges = async () => {
    try {
      const { data, error } = await supabase
        .from('resident_extra_charges')
        .select('*')
        .eq('resident_id', residentId)
        .order('date_charged', { ascending: false });

      if (error) throw error;
      setCharges(data || []);
    } catch (error) {
      console.error('Error fetching charges:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMonthYear = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase.from('resident_extra_charges').insert({
        resident_id: residentId,
        description: formData.description,
        category: formData.category,
        amount: parseFloat(formData.amount),
        date_charged: formData.date_charged,
        month_year: getMonthYear(formData.date_charged),
        is_billed: false,
      });

      if (error) throw error;

      toast({
        title: 'Charge Added',
        description: `₹${formData.amount} charge added for ${residentName}`,
      });

      setDialogOpen(false);
      resetForm();
      fetchCharges();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add charge',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (chargeId: string) => {
    try {
      const { error } = await supabase
        .from('resident_extra_charges')
        .delete()
        .eq('id', chargeId)
        .eq('is_billed', false);

      if (error) throw error;

      toast({
        title: 'Charge Deleted',
        description: 'Extra charge has been removed',
      });
      fetchCharges();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Cannot delete billed charges',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      description: '',
      category: 'food',
      amount: '',
      date_charged: new Date().toISOString().split('T')[0],
    });
  };

  const getCategoryIcon = (category: string) => {
    const cat = categories.find(c => c.value === category);
    if (!cat) return Package;
    return cat.icon;
  };

  const getCategoryColor = (category: string) => {
    const cat = categories.find(c => c.value === category);
    return cat?.color || 'text-muted-foreground';
  };

  const unbilledCharges = charges.filter(c => !c.is_billed);
  const billedCharges = charges.filter(c => c.is_billed);
  const totalUnbilled = unbilledCharges.reduce((sum, c) => sum + Number(c.amount), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Extra Charges
          </h3>
          {totalUnbilled > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              Pending: <span className="font-medium text-foreground">₹{totalUnbilled.toLocaleString()}</span>
            </p>
          )}
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4" />
              Add Charge
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Extra Charge</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <Label>Category</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <div className="flex items-center gap-2">
                          <cat.icon className={`w-4 h-4 ${cat.color}`} />
                          {cat.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="e.g., Special dinner, Doctor visit"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount">Amount (₹)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="date_charged">Date</Label>
                  <Input
                    id="date_charged"
                    type="date"
                    value={formData.date_charged}
                    onChange={(e) => setFormData(prev => ({ ...prev, date_charged: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Add Charge
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Unbilled Charges */}
      {unbilledCharges.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pending Charges</p>
          {unbilledCharges.map((charge) => {
            const Icon = getCategoryIcon(charge.category);
            return (
              <div 
                key={charge.id}
                className="flex items-center justify-between p-3 rounded-lg bg-warning/5 border border-warning/20"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg bg-background flex items-center justify-center ${getCategoryColor(charge.category)}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{charge.description}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <Calendar className="w-3 h-3" />
                      {new Date(charge.date_charged).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold flex items-center">
                    <IndianRupee className="w-3 h-3" />
                    {Number(charge.amount).toLocaleString()}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(charge.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Billed Charges */}
      {billedCharges.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Billed Charges</p>
          {billedCharges.slice(0, 5).map((charge) => {
            const Icon = getCategoryIcon(charge.category);
            return (
              <div 
                key={charge.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg bg-background flex items-center justify-center ${getCategoryColor(charge.category)}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{charge.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(charge.date_charged).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-muted-foreground flex items-center">
                    <IndianRupee className="w-3 h-3" />
                    {Number(charge.amount).toLocaleString()}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Billed
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {charges.length === 0 && (
        <div className="text-center py-6 text-muted-foreground">
          <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No extra charges recorded</p>
        </div>
      )}
    </div>
  );
}
