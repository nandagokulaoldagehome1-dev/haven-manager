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
  ShieldCheck,
  Loader2,
  HardDrive,
  ExternalLink,
  CheckCircle,
  XCircle,
  Mail,
  Key,
  User,
  UserPlus,
  Shield,
  Trash2,
} from 'lucide-react';

interface AdminUser {
  id: string;
  user_id: string;
  role: string;
  email?: string;
  created_at?: string;
}

interface GoogleDriveStatus {
  connected: boolean;
  email?: string;
  expired?: boolean;
}

export default function Settings() {
  const { isSuper, user } = useAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [driveStatus, setDriveStatus] = useState<GoogleDriveStatus>({ connected: false });
  const [driveLoading, setDriveLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<AdminUser | null>(null);

  useEffect(() => {
    if (isSuper) {
      fetchAdmins();
      checkDriveStatus();
    } else {
      setAdminsLoading(false);
      setDriveLoading(false);
    }
  }, [isSuper]);

  const fetchAdmins = async () => {
    setAdminsLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('list-admins');

      if (error) throw error;
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to fetch admins');
      }

      setAdmins(result.admins || []);
    } catch (error) {
      console.error('Error fetching admins:', error);
      toast({
        title: 'Error',
        description: 'Could not load admins list.',
        variant: 'destructive',
      });
    } finally {
      setAdminsLoading(false);
    }
  };

  const handleInviteAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }

    setInviting(true);

    try {
      const { data: result, error } = await supabase.functions.invoke('invite-admin', {
        body: { action: 'invite', email: inviteEmail },
      });

      if (error) throw error;
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to invite admin');
      }

      toast({
        title: 'Admin Invited',
        description: result.message || `Invitation sent to ${inviteEmail}`,
      });

      setInviteDialogOpen(false);
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

  const confirmRemoveAdmin = (admin: AdminUser) => {
    if (admin.user_id === user?.id) {
      toast({
        title: 'Cannot Remove',
        description: 'You cannot remove yourself.',
        variant: 'destructive',
      });
      return;
    }
    if (admin.role === 'super_admin') {
      toast({
        title: 'Protected',
        description: 'Super admin cannot be removed.',
        variant: 'destructive',
      });
      return;
    }
    setAdminToDelete(admin);
    setDeleteDialogOpen(true);
  };

  const handleRemoveAdmin = async () => {
    if (!adminToDelete) return;
    try {
      const { error } = await supabase.functions.invoke('invite-admin', {
        body: { action: 'remove', user_id: adminToDelete.user_id },
      });

      if (error) throw error;

      toast({
        title: 'Admin Removed',
        description: 'The admin has been removed.',
      });

      fetchAdmins();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove admin',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setAdminToDelete(null);
    }
  };

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



  return (
    <AppLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Page Header */}
        <div className="page-header">
          <h1 className="page-title">Settings</h1>
          <p className="page-description">Manage system settings and administrators</p>
        </div>

        {/* Admin Information - Only for Super Admin */}
        {isSuper && (
          <div className="card-elevated p-4 md:p-6">
            <div className="mb-4 md:mb-6">
              <h2 className="text-base md:text-lg font-semibold flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                Administrator
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">
                You are logged in as the super administrator
              </p>
            </div>

            <div className="flex items-center gap-3 p-3 md:p-4 rounded-lg bg-muted/50">
              <div className="w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center bg-primary/10">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium flex items-center gap-2 text-sm md:text-base truncate">
                  <span className="truncate">{user?.email}</span>
                  <span className="text-xs text-muted-foreground flex-shrink-0">(You)</span>
                </p>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Super Admin
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Admin Management - Only for Super Admin */}
        {isSuper && (
          <div className="card-elevated p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 md:mb-6">
              <div className="min-w-0 flex-1">
                <h2 className="text-base md:text-lg font-semibold flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="truncate">Admin Management</span>
                </h2>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  Invite and manage admin users (full access, no Drive connection)
                </p>
              </div>
              <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto flex-shrink-0">
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
                      <Label htmlFor="inviteEmail">Email Address</Label>
                      <Input
                        id="inviteEmail"
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="admin@example.com"
                        required
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      The admin will receive an email with a secure link to set their password and sign in. They will have full app access but cannot connect Google Drive (reserved for super admin).
                    </p>
                    <div className="flex justify-end gap-3 pt-4">
                      <Button type="button" variant="outline" onClick={() => setInviteDialogOpen(false)}>
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

            {adminsLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : admins.length > 0 ? (
              <div className="space-y-2 md:space-y-3">
                {admins.map((admin) => (
                  <div
                    key={admin.id}
                    className="flex items-center justify-between p-3 md:p-4 rounded-lg bg-muted/50 gap-2"
                  >
                    <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                      <div className={`w-9 h-9 md:w-10 md:h-10 flex-shrink-0 rounded-full flex items-center justify-center ${
                        admin.role === 'super_admin' ? 'bg-primary/10' : 'bg-secondary'
                      }`}>
                        {admin.role === 'super_admin' ? (
                          <ShieldCheck className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                        ) : (
                          <Shield className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium flex items-center gap-2 text-sm md:text-base">
                          <span className="truncate">{admin.email || admin.user_id.slice(0, 8)}</span>
                          {admin.user_id === user?.id && (
                            <span className="text-xs text-muted-foreground flex-shrink-0">(You)</span>
                          )}
                        </p>
                        <p className="text-xs md:text-sm text-muted-foreground capitalize truncate">
                          {admin.role.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                    {admin.role !== 'super_admin' && admin.user_id !== user?.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => confirmRemoveAdmin(admin)}
                        className="text-destructive hover:text-destructive flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                No admins yet. Invite one to get started.
              </div>
            )}
          </div>
        )}

        {/* Google Drive Integration - Only for Super Admin */}
        {isSuper && (
          <div className="card-elevated p-4 md:p-6">
            <div className="mb-4 md:mb-6">
              <div className="min-w-0">
                <h2 className="text-base md:text-lg font-semibold flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="truncate">Google Drive Integration</span>
                </h2>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  Connect Google Drive for document backup and storage
                </p>
              </div>
            </div>

            {driveLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : driveStatus.connected ? (
              <div className="space-y-3 md:space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 md:p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-green-500 text-sm md:text-base">Connected</p>
                    <p className="text-xs md:text-sm text-muted-foreground truncate">
                      {driveStatus.email}
                    </p>
                  </div>
                  {driveStatus.expired && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleConnectDrive}
                      disabled={connecting}
                      className="w-full sm:w-auto flex-shrink-0"
                    >
                      {connecting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <ExternalLink className="w-4 h-4" />
                          <span className="ml-2">Reconnect</span>
                        </>
                      )}
                    </Button>
                  )}
                </div>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Documents will be automatically backed up to your connected Google Drive account.
                </p>
              </div>
            ) : (
              <div className="space-y-3 md:space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 md:p-4 rounded-lg bg-muted/50">
                  <XCircle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm md:text-base">Not Connected</p>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Connect your Google Drive to enable document backup
                    </p>
                  </div>
                  <Button 
                    onClick={handleConnectDrive}
                    disabled={connecting}
                    className="w-full sm:w-auto flex-shrink-0"
                  >
                    {connecting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <ExternalLink className="w-4 h-4" />
                        <span className="ml-2 hidden sm:inline">Connect Google Drive</span>
                        <span className="ml-2 sm:hidden">Connect Drive</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Account Settings */}
        <div className="card-elevated p-4 md:p-6">
          <h2 className="text-base md:text-lg font-semibold mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Your Account
          </h2>
          
          <div className="space-y-3 md:space-y-4">
            <div className="flex items-center gap-3 p-3 md:p-4 rounded-lg bg-muted/50">
              <Mail className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs md:text-sm text-muted-foreground">Email</p>
                <p className="font-medium text-sm md:text-base truncate">{user?.email}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 md:p-4 rounded-lg bg-muted/50">
              <Key className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs md:text-sm text-muted-foreground">Password</p>
                <p className="font-medium text-sm md:text-base">••••••••</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                className="w-full sm:w-auto flex-shrink-0"
                onClick={async () => {
                  const { error } = await supabase.auth.resetPasswordForEmail(
                    user?.email || '',
                    { redirectTo: `${window.location.origin}/reset-password` }
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
        <div className="card-elevated p-4 md:p-6">
          <h2 className="text-base md:text-lg font-semibold mb-3 md:mb-4">System Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 text-sm">
            <div className="p-3 md:p-4 rounded-lg bg-muted/50">
              <p className="text-xs md:text-sm text-muted-foreground">Version</p>
              <p className="font-medium">1.0.0</p>
            </div>
            <div className="p-3 md:p-4 rounded-lg bg-muted/50">
              <p className="text-xs md:text-sm text-muted-foreground">Environment</p>
              <p className="font-medium">Deployed</p>
            </div>
            <div className="p-3 md:p-4 rounded-lg bg-muted/50">
              <p className="text-xs md:text-sm text-muted-foreground">Maintainer</p>
              <p className="font-medium break-words">kesh2004ag (GitHub)</p>
            </div>
            <div className="p-3 md:p-4 rounded-lg bg-muted/50">
              <p className="text-xs md:text-sm text-muted-foreground">LinkedIn</p>
              <a
                href="https://www.linkedin.com/in/kesh2004ag"
                className="font-medium text-primary hover:underline break-words"
                target="_blank"
                rel="noreferrer"
              >
                linkedin.com/in/kesh2004ag
              </a>
            </div>
          </div>
        </div>
      </div>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Admin</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this admin? They will lose access to the admin panel. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveAdmin} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
