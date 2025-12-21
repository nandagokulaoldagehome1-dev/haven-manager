import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { 
  UserPlus, 
  Users,
  Shield,
  ShieldCheck,
  Loader2,
  Mail,
  Trash2,
  Key,
  HardDrive,
  ExternalLink,
  CheckCircle,
  XCircle,
} from 'lucide-react';

interface AdminUser {
  id: string;
  user_id: string;
  role: string;
  email?: string;
  created_at: string;
}

interface GoogleDriveStatus {
  connected: boolean;
  email?: string;
  expired?: boolean;
}

export default function Settings() {
  const { isSuper, user } = useAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [driveStatus, setDriveStatus] = useState<GoogleDriveStatus>({ connected: false });
  const [driveLoading, setDriveLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (isSuper) {
      fetchAdmins();
      checkDriveStatus();
    } else {
      setLoading(false);
      setDriveLoading(false);
    }
  }, [isSuper]);

  const checkDriveStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        'https://geimemclslezirwtuvkh.supabase.co/functions/v1/google-drive-status',
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setDriveStatus(data);
      }
    } catch (error) {
      console.error('Error checking drive status:', error);
    } finally {
      setDriveLoading(false);
    }
  };

  const handleConnectDrive = async () => {
    setConnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: 'Error',
          description: 'You must be logged in to connect Google Drive',
          variant: 'destructive',
        });
        return;
      }

      const response = await fetch(
        'https://geimemclslezirwtuvkh.supabase.co/functions/v1/google-drive-auth',
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to get auth URL');
      }

      const { authUrl } = await response.json();
      
      // Open popup for OAuth
      const popup = window.open(authUrl, 'google-drive-auth', 'width=500,height=600');
      
      // Poll for popup close to refresh status
      const pollTimer = setInterval(() => {
        if (popup?.closed) {
          clearInterval(pollTimer);
          checkDriveStatus();
          setConnecting(false);
        }
      }, 500);
    } catch (error: any) {
      console.error('Error connecting to Drive:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to connect to Google Drive',
        variant: 'destructive',
      });
      setConnecting(false);
    }
  };

  const fetchAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdmins(data || []);
    } catch (error) {
      console.error('Error fetching admins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    
    setInviting(true);

    try {
      // Create user with a temporary password
      const tempPassword = Math.random().toString(36).slice(-12) + 'A1!';
      
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: inviteEmail,
        password: tempPassword,
        email_confirm: true,
      });

      if (authError) {
        // If admin API fails, show message to use sign up
        toast({
          title: 'Invite Info',
          description: 'Please ask the new admin to sign up and you can then assign their role.',
        });
        setDialogOpen(false);
        setInviteEmail('');
        return;
      }

      // Add role for the new user
      const { error: roleError } = await supabase.from('user_roles').insert({
        user_id: authData.user.id,
        role: 'admin',
      });

      if (roleError) throw roleError;

      toast({
        title: 'Admin Invited',
        description: `Invitation sent to ${inviteEmail}`,
      });

      setDialogOpen(false);
      setInviteEmail('');
      fetchAdmins();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to invite admin',
        variant: 'destructive',
      });
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveAdmin = async (adminId: string, adminUserId: string) => {
    if (adminUserId === user?.id) {
      toast({
        title: 'Cannot Remove',
        description: 'You cannot remove yourself.',
        variant: 'destructive',
      });
      return;
    }

    if (!confirm('Are you sure you want to remove this admin?')) return;

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', adminId);

      if (error) throw error;

      toast({
        title: 'Admin Removed',
        description: 'The admin has been removed.',
      });

      fetchAdmins();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="page-header">
          <h1 className="page-title">Settings</h1>
          <p className="page-description">Manage system settings and administrators</p>
        </div>

        {/* Admin Management - Only for Super Admin */}
        {isSuper && (
          <div className="card-elevated p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  Admin Management
                </h2>
                <p className="text-sm text-muted-foreground">
                  Manage administrators who can access the system
                </p>
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="w-4 h-4" />
                    Invite Admin
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Invite New Admin</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleInviteAdmin} className="space-y-4 mt-4">
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="admin@example.com"
                        required
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      The new admin will receive an email with login instructions.
                    </p>
                    <div className="flex justify-end gap-3 pt-4">
                      <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={inviting}>
                        {inviting && <Loader2 className="w-4 h-4 animate-spin" />}
                        Send Invite
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-3">
                {admins.map((admin) => (
                  <div 
                    key={admin.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        admin.role === 'super_admin' ? 'bg-primary/10' : 'bg-secondary'
                      }`}>
                        {admin.role === 'super_admin' ? (
                          <ShieldCheck className="w-5 h-5 text-primary" />
                        ) : (
                          <Shield className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium flex items-center gap-2">
                          {admin.email || admin.user_id.slice(0, 8)}
                          {admin.user_id === user?.id && (
                            <span className="text-xs text-muted-foreground">(You)</span>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {admin.role.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                    {admin.role !== 'super_admin' && admin.user_id !== user?.id && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleRemoveAdmin(admin.id, admin.user_id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Google Drive Integration - Only for Super Admin */}
        {isSuper && (
          <div className="card-elevated p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-primary" />
                  Google Drive Integration
                </h2>
                <p className="text-sm text-muted-foreground">
                  Connect Google Drive for document backup and storage
                </p>
              </div>
            </div>

            {driveLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : driveStatus.connected ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <div className="flex-1">
                    <p className="font-medium text-green-500">Connected</p>
                    <p className="text-sm text-muted-foreground">
                      {driveStatus.email}
                    </p>
                  </div>
                  {driveStatus.expired && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleConnectDrive}
                      disabled={connecting}
                    >
                      {connecting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <ExternalLink className="w-4 h-4" />
                          Reconnect
                        </>
                      )}
                    </Button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Documents will be automatically backed up to your connected Google Drive account.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                  <XCircle className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">Not Connected</p>
                    <p className="text-sm text-muted-foreground">
                      Connect your Google Drive to enable document backup
                    </p>
                  </div>
                  <Button 
                    onClick={handleConnectDrive}
                    disabled={connecting}
                  >
                    {connecting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <ExternalLink className="w-4 h-4" />
                        Connect Google Drive
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Account Settings */}
        <div className="card-elevated p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Your Account
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user?.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
              <Key className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Password</p>
                <p className="font-medium">••••••••</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={async () => {
                  const { error } = await supabase.auth.resetPasswordForEmail(
                    user?.email || '',
                    { redirectTo: window.location.origin }
                  );
                  if (error) {
                    toast({
                      title: 'Error',
                      description: error.message,
                      variant: 'destructive',
                    });
                  } else {
                    toast({
                      title: 'Email Sent',
                      description: 'Check your email for password reset instructions.',
                    });
                  }
                }}
              >
                Reset Password
              </Button>
            </div>
          </div>
        </div>

        {/* System Info */}
        <div className="card-elevated p-6">
          <h2 className="text-lg font-semibold mb-4">System Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-muted-foreground">Version</p>
              <p className="font-medium">1.0.0</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-muted-foreground">Environment</p>
              <p className="font-medium">Production</p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
