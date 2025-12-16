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

      // Fetch birthdays this month
      const currentMonth = new Date().getMonth() + 1;
      const { count: birthdayCount } = await supabase
        .from('residents')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
        // Note: We'd need to filter by birth month in a real query

      setStats({
        totalResidents: residentsCount || 0,
        totalRooms: roomsCount || 0,
        occupiedRooms: occupiedCount || 0,
        pendingPayments: 0, // Would need payment logic
        birthdaysThisMonth: birthdayCount || 0,
      });

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
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-description">
            Overview of your old age home management system
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, index) => (
            <div 
              key={stat.label} 
              className="stat-card animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center justify-between">
                <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <span className="stat-value">{stat.value}</span>
              </div>
              <p className="stat-label">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions & Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="lg:col-span-2 card-elevated p-6">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                onClick={() => navigate('/residents/new')}
              >
                <Users className="w-5 h-5" />
                <span className="text-xs">Add Resident</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                onClick={() => navigate('/rooms')}
              >
                <BedDouble className="w-5 h-5" />
                <span className="text-xs">Manage Rooms</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                onClick={() => navigate('/payments')}
              >
                <CreditCard className="w-5 h-5" />
                <span className="text-xs">View Payments</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                onClick={() => navigate('/food-menu')}
              >
                <Calendar className="w-5 h-5" />
                <span className="text-xs">Food Menu</span>
              </Button>
            </div>
          </div>

          {/* Alerts Card */}
          <div className="card-elevated p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-warning" />
              Alerts
            </h2>
            <div className="space-y-3">
              {stats.birthdaysThisMonth > 0 && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/10">
                  <Cake className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Birthdays This Month</p>
                    <p className="text-xs text-muted-foreground">
                      {stats.birthdaysThisMonth} resident(s) have birthdays
                    </p>
                  </div>
                </div>
              )}
              {stats.pendingPayments > 0 && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-warning/10">
                  <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Pending Payments</p>
                    <p className="text-xs text-muted-foreground">
                      {stats.pendingPayments} payment(s) pending
                    </p>
                  </div>
                </div>
              )}
              {stats.birthdaysThisMonth === 0 && stats.pendingPayments === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No alerts at this time
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Recent Residents */}
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Residents</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/residents')}>
              View All
            </Button>
          </div>
          
          {recentResidents.length > 0 ? (
            <div className="space-y-3">
              {recentResidents.map((resident) => (
                <div 
                  key={resident.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/residents/${resident.id}`)}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {resident.photo_url ? (
                      <img 
                        src={resident.photo_url} 
                        alt={resident.full_name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <Users className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{resident.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Added {new Date(resident.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">No residents yet</p>
              <Button 
                variant="default" 
                size="sm" 
                className="mt-3"
                onClick={() => navigate('/residents/new')}
              >
                Add First Resident
              </Button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
