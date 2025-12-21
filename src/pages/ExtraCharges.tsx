import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
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
  Search,
  Loader2,
  Utensils,
  Stethoscope,
  Package,
  Trash2,
  IndianRupee,
  Calendar,
  User,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ExtraCharge {
  id: string;
  resident_id: string;
  description: string;
  category: string;
  amount: number;
  date_charged: string;
  month_year: string;
  is_billed: boolean;
  resident_name?: string;
}

interface Resident {
  id: string;
  full_name: string;
}

export default function ExtraCharges() {
  const [charges, setCharges] = useState<ExtraCharge[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterResident, setFilterResident] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const [formData, setFormData] = useState({
    resident_id: '',
    description: '',
    category: 'other',
    amount: '',
    date_charged: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: chargesData, error: chargesError } = await supabase
        .from('resident_extra_charges')
        .select(`
          *,
          residents (full_name)
        `)
        .order('date_charged', { ascending: false });

      if (chargesError) throw chargesError;

      const chargesWithNames = (chargesData || []).map(c => ({
        ...c,
        resident_name: c.residents?.full_name,
      }));

      setCharges(chargesWithNames);

      const { data: residentsData } = await supabase
        .from('residents')
        .select('id, full_name')
        .eq('status', 'active')
        .order('full_name');

      setResidents(residentsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentMonthYear = () => {
    const date = new Date();
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from('resident_extra_charges')
        .insert({
          resident_id: formData.resident_id,
          description: formData.description,
          category: formData.category,
          amount: parseFloat(formData.amount),
          date_charged: formData.date_charged,
          month_year: getCurrentMonthYear(),
          is_billed: false,
        });

      if (error) throw error;

      toast({
        title: 'Extra Charge Added',
        description: 'The charge has been recorded successfully.',
      });

      setDialogOpen(false);
      resetForm();
      fetchData();
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

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this charge?')) return;

    try {
      const { error } = await supabase
        .from('resident_extra_charges')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Charge Deleted',
        description: 'The charge has been removed.',
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete charge',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      resident_id: '',
      description: '',
      category: 'other',
      amount: '',
      date_charged: new Date().toISOString().split('T')[0],
    });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'food': return Utensils;
      case 'medical': return Stethoscope;
      default: return Package;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'food': return 'bg-orange-500/10 text-orange-500';
      case 'medical': return 'bg-blue-500/10 text-blue-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const filteredCharges = charges.filter(charge => {
    const matchesSearch = charge.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      charge.resident_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesResident = filterResident === 'all' || charge.resident_id === filterResident;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'pending' && !charge.is_billed) ||
      (filterStatus === 'billed' && charge.is_billed);
    return matchesSearch && matchesResident && matchesStatus;
  });

  const totalPending = charges.filter(c => !c.is_billed).reduce((sum, c) => sum + Number(c.amount), 0);
  const totalBilled = charges.filter(c => c.is_billed).reduce((sum, c) => sum + Number(c.amount), 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="page-header mb-0">
            <h1 className="page-title">Extra Charges</h1>
            <p className="page-description">Track additional charges for residents</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
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
                  <Label>Resident</Label>
                  <Select 
                    value={formData.resident_id} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, resident_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select resident" />
                    </SelectTrigger>
                    <SelectContent>
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
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="e.g., Extra meals, Medical checkup"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
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
                        <SelectItem value="food">Food</SelectItem>
                        <SelectItem value="medical">Medical</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving} className="flex-1">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Charge'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-xl font-bold">₹{totalPending.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Billed</p>
                <p className="text-xl font-bold">₹{totalBilled.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <IndianRupee className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-xl font-bold">₹{(totalPending + totalBilled).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by description or resident..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterResident} onValueChange={setFilterResident}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Residents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Residents</SelectItem>
              {residents.map(resident => (
                <SelectItem key={resident.id} value={resident.id}>
                  {resident.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="billed">Billed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Charges List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredCharges.length === 0 ? (
          <div className="card p-12 text-center">
            <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-lg mb-1">No Extra Charges</h3>
            <p className="text-muted-foreground">
              {searchQuery || filterResident !== 'all' || filterStatus !== 'all' 
                ? 'No charges match your filters' 
                : 'Start by adding extra charges for residents'}
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredCharges.map((charge) => {
              const Icon = getCategoryIcon(charge.category);
              return (
                <div key={charge.id} className="card p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`p-2 rounded-lg ${getCategoryColor(charge.category)}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{charge.description}</h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {charge.resident_name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(charge.date_charged).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-bold text-lg">₹{Number(charge.amount).toLocaleString()}</p>
                        <Badge variant={charge.is_billed ? 'secondary' : 'outline'} className="text-xs">
                          {charge.is_billed ? 'Billed' : 'Pending'}
                        </Badge>
                      </div>
                      {!charge.is_billed && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(charge.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
