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
import { downloadReceiptPDF, printReceiptPDF } from '@/lib/pdfGenerator';
import { 
  Plus, 
  Search,
  CreditCard,
  IndianRupee,
  Calendar,
  FileText,
  Loader2,
  Download,
  Share2,
  Printer,
  Utensils,
  Stethoscope,
  Package,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ExtraCharge {
  id: string;
  description: string;
  category: string;
  amount: number;
  date_charged: string;
  month_year: string;
}

interface Payment {
  id: string;
  resident_id: string;
  resident_name?: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  month_year: string;
  receipt_number: string;
  status: string;
  notes: string;
  extra_charges?: ExtraCharge[];
  base_amount?: number;
}

interface Resident {
  id: string;
  full_name: string;
}

export default function Payments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [filterResident, setFilterResident] = useState('all');
  const [selectedResidentCharges, setSelectedResidentCharges] = useState<ExtraCharge[]>([]);
  const [loadingCharges, setLoadingCharges] = useState(false);
  const [expandedPayment, setExpandedPayment] = useState<string | null>(null);
  const [monthsCount, setMonthsCount] = useState<number>(1);
  const [monthlyRate, setMonthlyRate] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    resident_id: '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    month_year: '',
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (formData.resident_id) {
      fetchUnbilledCharges(formData.resident_id);
    } else {
      setSelectedResidentCharges([]);
    }
  }, [formData.resident_id]);

  useEffect(() => {
    async function fetchMonthlyRate(residentId: string) {
      try {
        // Get current room assignment
        const { data: assignment } = await supabase
          .from('room_assignments')
          .select('room_id')
          .eq('resident_id', residentId)
          .is('end_date', null)
          .single();

        if (!assignment?.room_id) {
          setMonthlyRate(null);
          return;
        }

        const { data: room } = await supabase
          .from('rooms')
          .select('base_monthly_charge')
          .eq('id', assignment.room_id)
          .single();

        if (room?.base_monthly_charge != null) {
          setMonthlyRate(Number(room.base_monthly_charge));
        } else {
          setMonthlyRate(null);
        }
      } catch (e) {
        setMonthlyRate(null);
      }
    }

    if (formData.resident_id) {
      fetchMonthlyRate(formData.resident_id);
    } else {
      setMonthlyRate(null);
    }
  }, [formData.resident_id]);

  useEffect(() => {
    if (monthlyRate != null) {
      const computed = monthlyRate * monthsCount;
      setFormData(prev => ({ ...prev, amount: String(computed) }));
    }
  }, [monthlyRate, monthsCount]);

  const fetchData = async () => {
    try {
      // Fetch payments with resident names
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          *,
          residents (full_name)
        `)
        .order('payment_date', { ascending: false });

      if (paymentsError) throw paymentsError;

      // For each payment, fetch associated extra charges
      const paymentsWithCharges = await Promise.all(
        (paymentsData || []).map(async (p) => {
          const { data: charges } = await supabase
            .from('resident_extra_charges')
            .select('*')
            .eq('payment_id', p.id);
          
          const extraChargesTotal = (charges || []).reduce((sum, c) => sum + Number(c.amount), 0);
          
          return {
            ...p,
            resident_name: p.residents?.full_name,
            extra_charges: charges || [],
            base_amount: p.amount - extraChargesTotal,
          };
        })
      );

      setPayments(paymentsWithCharges);

      // Fetch residents for dropdown
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

  const fetchUnbilledCharges = async (residentId: string) => {
    setLoadingCharges(true);
    try {
      const { data, error } = await supabase
        .from('resident_extra_charges')
        .select('*')
        .eq('resident_id', residentId)
        .eq('is_billed', false)
        .order('date_charged', { ascending: false });

      if (error) throw error;
      setSelectedResidentCharges(data || []);
    } catch (error) {
      console.error('Error fetching charges:', error);
    } finally {
      setLoadingCharges(false);
    }
  };

  const generateReceiptNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `RCP${year}${month}${random}`;
  };

  const totalExtraCharges = selectedResidentCharges.reduce((sum, c) => sum + Number(c.amount), 0);
  const baseAmount = parseFloat(formData.amount) || 0;
  const grandTotal = baseAmount + totalExtraCharges;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const receiptNumber = generateReceiptNumber();

      // Insert payment with total amount
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert({
          resident_id: formData.resident_id,
          amount: grandTotal,
          payment_date: formData.payment_date,
          payment_method: formData.payment_method,
          month_year: formData.month_year,
          receipt_number: receiptNumber,
          status: 'completed',
          notes: `${formData.notes || ''}${monthsCount > 1 ? (formData.notes ? ' ' : '') + `(Months: ${monthsCount})` : ''}`,
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Mark extra charges as billed
      if (selectedResidentCharges.length > 0) {
        const chargeIds = selectedResidentCharges.map(c => c.id);
        const { error: updateError } = await supabase
          .from('resident_extra_charges')
          .update({ is_billed: true, payment_id: paymentData.id })
          .in('id', chargeIds);

        if (updateError) throw updateError;
      }

      toast({
        title: 'Payment Recorded',
        description: `Receipt #${receiptNumber} generated with total ₹${grandTotal.toLocaleString()}`,
      });

      // Generate and download PDF
      const resident = residents.find(r => r.id === formData.resident_id);
      downloadReceiptPDF({
        receiptNumber,
        residentName: resident?.full_name || 'Unknown',
        paymentDate: formData.payment_date,
        monthYear: formData.month_year,
        paymentMethod: formData.payment_method,
        baseAmount,
        extraCharges: selectedResidentCharges,
        totalAmount: grandTotal,
        notes: formData.notes,
      });

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to record payment',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      resident_id: '',
      amount: '',
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'cash',
      month_year: '',
      notes: '',
    });
    setSelectedResidentCharges([]);
  };

  const shareOnWhatsApp = async (payment: Payment) => {
    try {
      // Generate PDF
      const doc = generateReceiptPDF({
        receiptNumber: payment.receipt_number,
        residentName: payment.resident_name || 'Unknown',
        paymentDate: payment.payment_date,
        monthYear: payment.month_year,
        paymentMethod: payment.payment_method,
        baseAmount: payment.base_amount || payment.amount,
        extraCharges: payment.extra_charges || [],
        totalAmount: payment.amount,
        notes: payment.notes,
      });

      // Convert PDF to blob
      const pdfBlob = doc.output('blob');
      const fileName = `Receipt_${payment.receipt_number}.pdf`;
      
      // Create a File object from the blob
      const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

      // Check if Web Share API is supported
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          title: `Payment Receipt - ${payment.resident_name}`,
          text: `Receipt #${payment.receipt_number} for ₹${payment.amount.toLocaleString()}`,
          files: [pdfFile],
        });
      } else {
        // Fallback: Open WhatsApp Web with text message and download PDF
        const message = `
🧾 *Payment Receipt*
━━━━━━━━━━━━━━━
Receipt #: ${payment.receipt_number}
Resident: ${payment.resident_name}
Amount: ₹${payment.amount.toLocaleString()}
Date: ${new Date(payment.payment_date).toLocaleDateString()}
For Month: ${payment.month_year}
━━━━━━━━━━━━━━━
PDF receipt downloading separately...`;

        // Download PDF for manual sharing
        doc.save(fileName);
        
        // Open WhatsApp with message
        const url = `https://wa.me/?text=${encodeURIComponent(message.trim())}`;
        window.open(url, '_blank');
        
        toast({
          title: 'PDF Downloaded',
          description: 'Please attach the downloaded PDF to WhatsApp manually.',
        });
      }
    } catch (error: any) {
      console.error('Error sharing receipt:', error);
      toast({
        title: 'Error',
        description: 'Failed to share receipt. Please try downloading instead.',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadPDF = (payment: Payment) => {
    downloadReceiptPDF({
      receiptNumber: payment.receipt_number,
      residentName: payment.resident_name || 'Unknown',
      paymentDate: payment.payment_date,
      monthYear: payment.month_year,
      paymentMethod: payment.payment_method,
      baseAmount: payment.base_amount || payment.amount,
      extraCharges: payment.extra_charges || [],
      totalAmount: payment.amount,
      notes: payment.notes,
    });
  };

  const handlePrintPDF = (payment: Payment) => {
    printReceiptPDF({
      receiptNumber: payment.receipt_number,
      residentName: payment.resident_name || 'Unknown',
      paymentDate: payment.payment_date,
      monthYear: payment.month_year,
      paymentMethod: payment.payment_method,
      baseAmount: payment.base_amount || payment.amount,
      extraCharges: payment.extra_charges || [],
      totalAmount: payment.amount,
      notes: payment.notes,
    });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'food': return Utensils;
      case 'medical': return Stethoscope;
      default: return Package;
    }
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.resident_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.receipt_number.toLowerCase().includes(searchQuery.toLowerCase());
    const [paymentYear, paymentMonth] = payment.month_year.split('-');
    const matchesMonth = filterMonth === 'all' || paymentMonth === filterMonth;
    const matchesYear = filterYear === 'all' || paymentYear === filterYear;
    const matchesResident = filterResident === 'all' || payment.resident_id === filterResident;
    return matchesSearch && matchesMonth && matchesYear && matchesResident;
  });

  const getMonthOptions = () => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return months.map((month, index) => ({
      value: (index + 1).toString().padStart(2, '0'),
      label: month
    }));
  };

  const getYearOptions = () => {
    const years = [];
    const currentYear = new Date().getFullYear();
    for (let i = 0; i < 5; i++) {
      years.push(currentYear - i);
    }
    return years;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="page-header mb-0">
            <h1 className="page-title">Payments & Receipts</h1>
            <p className="page-description">Track payments and generate receipts</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4" />
                Record Payment
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Record New Payment</DialogTitle>
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

                {/* Extra Charges Section */}
                {formData.resident_id && (
                  <div className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Pending Extra Charges</span>
                      {loadingCharges && <Loader2 className="w-4 h-4 animate-spin" />}
                    </div>
                    {selectedResidentCharges.length > 0 ? (
                      <div className="space-y-2">
                        {selectedResidentCharges.map((charge) => {
                          const Icon = getCategoryIcon(charge.category);
                          return (
                            <div key={charge.id} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                              <div className="flex items-center gap-2">
                                <Icon className="w-4 h-4 text-muted-foreground" />
                                <span>{charge.description}</span>
                              </div>
                              <span className="font-medium">₹{Number(charge.amount).toLocaleString()}</span>
                            </div>
                          );
                        })}
                        <div className="flex items-center justify-between pt-2 border-t font-medium">
                          <span>Extra Charges Total</span>
                          <span className="text-primary">₹{totalExtraCharges.toLocaleString()}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No pending charges</p>
                    )}
                  </div>
                )}

                <div>
                  <Label htmlFor="amount">Base Amount (₹)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="Monthly rent/charges"
                    required
                  />
                </div>

                {/* Grand Total */}
                {formData.amount && (
                  <div className="rounded-lg bg-primary/10 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Grand Total</span>
                      <span className="text-xl font-bold text-primary flex items-center">
                        <IndianRupee className="w-4 h-4" />
                        {grandTotal.toLocaleString()}
                      </span>
                    </div>
                    {totalExtraCharges > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        (Base: ₹{baseAmount.toLocaleString()} + Extra: ₹{totalExtraCharges.toLocaleString()})
                      </p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="payment_date">Payment Date</Label>
                    <Input
                      id="payment_date"
                      type="date"
                      value={formData.payment_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, payment_date: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label>For Month</Label>
                    <Select 
                      value={formData.month_year} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, month_year: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                      <SelectContent>
                        {getMonthOptions().map(month => (
                          <SelectItem key={month.value} value={month.value}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Payment Method</Label>
                  <Select 
                    value={formData.payment_method} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, payment_method: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Optional notes"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    Record & Download PDF
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or receipt..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
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
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {getMonthOptions().map(month => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {getYearOptions().map(year => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Payments List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredPayments.length > 0 ? (
          <div className="space-y-3">
            {filteredPayments.map((payment, index) => (
              <div 
                key={payment.id}
                className="card-elevated overflow-hidden animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center flex-shrink-0">
                      <CreditCard className="w-6 h-6 text-success" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{payment.resident_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Receipt #{payment.receipt_number}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg flex items-center justify-end gap-1">
                            <IndianRupee className="w-4 h-4" />
                            {payment.amount.toLocaleString()}
                          </p>
                          <span className="badge-success">Paid</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(payment.payment_date).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          For: {payment.month_year}
                        </span>
                        <span className="capitalize">{payment.payment_method.replace('_', ' ')}</span>
                        {payment.extra_charges && payment.extra_charges.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            +{payment.extra_charges.length} extra charges
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:flex-shrink-0">
                      {payment.extra_charges && payment.extra_charges.length > 0 && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setExpandedPayment(expandedPayment === payment.id ? null : payment.id)}
                        >
                          {expandedPayment === payment.id ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => handleDownloadPDF(payment)}>
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handlePrintPDF(payment)}>
                        <Printer className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => shareOnWhatsApp(payment)}>
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Expanded Extra Charges */}
                {expandedPayment === payment.id && payment.extra_charges && payment.extra_charges.length > 0 && (
                  <div className="border-t bg-muted/30 p-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Charge Breakdown</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Base Charges</span>
                        <span className="font-medium">₹{payment.base_amount?.toLocaleString()}</span>
                      </div>
                      {payment.extra_charges.map((charge) => {
                        const Icon = getCategoryIcon(charge.category);
                        return (
                          <div key={charge.id} className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2">
                              <Icon className="w-4 h-4 text-muted-foreground" />
                              {charge.description}
                              <span className="text-xs text-muted-foreground">
                                ({new Date(charge.date_charged).toLocaleDateString()})
                              </span>
                            </span>
                            <span className="font-medium">₹{Number(charge.amount).toLocaleString()}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="card-elevated p-12 text-center">
            <CreditCard className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No payments found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || filterMonth !== 'all' 
                ? 'Try different search criteria'
                : 'Record your first payment to get started'
              }
            </p>
            {!searchQuery && (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4" />
                Record First Payment
              </Button>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
