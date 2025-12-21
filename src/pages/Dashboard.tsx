import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/lib/supabase';
import { 
  Users, 
  BedDouble, 
  CreditCard, 
  AlertCircle,
  TrendingUp,
  Calendar,
  Cake,
  Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface DashboardStats {
  totalResidents: number;
  totalRooms: number;
  occupiedRooms: number;
  pendingPayments: number;
  birthdaysThisMonth: number;
}

interface DashboardAlert {
  id: string;
  title: string;
  description: string;
  reminder_type: string;
  due_date: string;
  status: string;
  resident_name?: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalResidents: 0,
    totalRooms: 0,
    occupiedRooms: 0,
    pendingPayments: 0,
    birthdaysThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentResidents, setRecentResidents] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch residents count
      const { count: residentsCount } = await supabase
        .from('residents')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Fetch rooms count
      const { count: roomsCount } = await supabase
        .from('rooms')
        .select('*', { count: 'exact', head: true });

      // Fetch occupied rooms
      const { count: occupiedCount } = await supabase
        .from('room_assignments')
        .select('*', { count: 'exact', head: true })
        .is('end_date', null);

      // Fetch recent residents
      const { data: recent } = await supabase
        .from('residents')
        .select('id, full_name, photo_url, created_at')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch residents to compute birthdays this month
      const { data: residentsForBirthdays } = await supabase
        .from('residents')
        .select('id, full_name, date_of_birth')
        .eq('status', 'active');

      const now = new Date();
      const currentMonthIdx = now.getMonth();
      const birthdayCount = (residentsForBirthdays || []).filter(r => {
        if (!r.date_of_birth) return false;
        const dob = new Date(r.date_of_birth);
        return dob.getMonth() === currentMonthIdx;
      }).length;

      // Fetch pending reminders for alerts (overdue, due today, next 7 days)
      const { data: remindersData } = await supabase
        .from('reminders')
        .select(`
          *,
          residents (full_name)
        `)
        .eq('status', 'pending')
        .order('due_date', { ascending: true });

      const today = new Date();
      const next7 = new Date(today);
      next7.setDate(today.getDate() + 7);

      const dynamicAlerts: DashboardAlert[] = (remindersData || [])
        .filter((r: any) => {
          const due = new Date(r.due_date);
          return due <= next7; // include overdue, today, and upcoming 7 days
        })
        .slice(0, 6) // limit to top alerts
        .map((r: any) => ({
          id: r.id,
          title: r.title,
          description: r.description,
          reminder_type: r.reminder_type,
          due_date: r.due_date,
          status: r.status,
          resident_name: r.residents?.full_name,
        }));

      // Compute pending payments count from payment reminders for this month
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth() + 1;
      const monthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      const monthEnd = `${currentYear}-${String(currentMonth).padStart(2, '0')}-31`;

      const pendingPaymentCount = (remindersData || []).filter((r: any) => {
        return r.reminder_type === 'payment' && r.status === 'pending' && r.due_date >= monthStart && r.due_date <= monthEnd;
      }).length;

      setStats({
        totalResidents: residentsCount || 0,
        totalRooms: roomsCount || 0,
        occupiedRooms: occupiedCount || 0,
        pendingPayments: pendingPaymentCount,
        birthdaysThisMonth: birthdayCount || 0,
      });

      setAlerts(dynamicAlerts);

      setRecentResidents(recent || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      label: 'Total Residents',
      value: stats.totalResidents,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Total Rooms',
      value: stats.totalRooms,
      icon: BedDouble,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      label: 'Occupied Rooms',
      value: stats.occupiedRooms,
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      label: 'Pending Payments',
      value: stats.pendingPayments,
      icon: CreditCard,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="card-elevated p-6 bg-gradient-to-r from-primary/10 via-primary/5 to-background border border-primary/10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="page-title mb-1">Dashboard</h1>
              <p className="page-description">Stay ahead of rooms, payments, and care reminders.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="default" onClick={() => navigate('/residents/new')}>
                Add Resident
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate('/reminders')}>
                View Reminders
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate('/payments')}>
                Payments
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, index) => (
            <div 
              key={stat.label} 
              className="stat-card animate-slide-up border border-border/60 hover:border-primary/40 shadow-sm hover:shadow-md transition-all"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center justify-between">
                <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <span className="stat-value">{stat.value}</span>
              </div>
              <p className="stat-label text-muted-foreground/80">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Alerts - full width */}
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Bell className="w-5 h-5 text-warning" />
              Alerts
            </h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/reminders')}>
              View All Reminders
            </Button>
          </div>
          <div className="space-y-3">
            {alerts.length > 0 ? (
              alerts.map((alert) => {
                const due = new Date(alert.due_date);
                const isOverdue = due < new Date() && due.toDateString() !== new Date().toDateString();
                const isToday = due.toDateString() === new Date().toDateString();
                const bg = isOverdue ? 'bg-destructive/10' : isToday ? 'bg-warning/10' : 'bg-accent/10';
                const Icon = alert.reminder_type === 'birthday' ? Cake : alert.reminder_type === 'payment' ? CreditCard : AlertCircle;
                return (
                  <div key={alert.id} className={`flex items-start gap-3 p-4 rounded-lg ${bg}`}>
                    <Icon className={`w-5 h-5 ${isOverdue ? 'text-destructive' : isToday ? 'text-warning' : 'text-accent'} flex-shrink-0 mt-0.5`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{alert.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{alert.description}{alert.resident_name ? ` • ${alert.resident_name}` : ''}</p>
                      <p className="text-xs text-muted-foreground">Due: {due.toLocaleDateString()}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No alerts at this time</p>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
