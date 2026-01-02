import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Eye, EyeOff, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';

const passwordSchema = z
  .object({
    fullName: z.string().min(2, 'Name must be at least 2 characters'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export default function AcceptInvite() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [inviteToken, setInviteToken] = useState<string | null>(null);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const processInviteFromHash = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');

      if (type === 'invite' && accessToken && refreshToken) {
        // Hand off to Supabase so it can persist the session and emit SIGNED_IN
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        setInviteToken(accessToken);
        return true;
      }

      // Fallback to query param token (legacy)
      const tokenFromQuery = new URLSearchParams(window.location.search).get('token');
      if (tokenFromQuery) {
        setInviteToken(tokenFromQuery);
        return true;
      }

      return false;
    };

    const bootstrap = async () => {
      try {
        setVerifying(true);

        // 1) Let Supabase parse the hash and fire SIGNED_IN
        const handled = await processInviteFromHash();

        // 2) If already have a session, skip waiting
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setInviteToken(session.access_token ?? inviteToken);
          setVerifying(false);
          return;
        }

        // 3) Wait for Supabase to emit SIGNED_IN; show error if it never happens
        timeoutId = setTimeout(() => {
          setVerifying(false);
          toast({
            title: 'Invitation Error',
            description: 'This invitation link may be invalid or expired. Please request a new one.',
            variant: 'destructive',
          });
        }, handled ? 6000 : 2000);
      } catch (error: any) {
        console.error('Invite verification error:', error);
        toast({
          title: 'Invalid Invite',
          description: error.message || 'This invitation link is invalid or has expired.',
          variant: 'destructive',
        });
        setTimeout(() => navigate('/auth'), 1500);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setInviteToken(session.access_token ?? null);
        setVerifying(false);
        toast({ title: 'Invite accepted successfully!' });
      }
    });

    bootstrap();

    return () => {
      subscription.unsubscribe();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [inviteToken, navigate, toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    try {
      passwordSchema.parse(formData);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) newErrors[err.path[0] as string] = err.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);

    try {
      // Update the user's password and metadata
      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.password,
        data: {
          full_name: formData.fullName,
        },
      });

      if (updateError) throw updateError;

      toast({
        title: 'Account Setup Complete!',
        description: 'Your password has been set. Redirecting to dashboard...',
      });

      // Wait a moment then redirect
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (error: any) {
      console.error('Setup error:', error);
      toast({
        title: 'Setup Failed',
        description: error.message || 'Failed to complete account setup.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying your invitation...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
            <Home className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="font-display font-bold text-2xl">Care Home</h1>
        </div>

        <div className="card-elevated p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-display font-bold text-foreground">
              Complete Your Account Setup
            </h2>
            <p className="text-muted-foreground mt-2">
              Set your password to access the management system
            </p>
          </div>

          <div className="mb-6 p-4 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-sm text-primary font-medium">
              🎉 You've been invited as an admin. Complete your profile to get started.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                name="fullName"
                placeholder="Enter your full name"
                value={formData.fullName}
                onChange={handleInputChange}
              />
              {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={handleInputChange}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="Re-enter your password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword}</p>
              )}
            </div>

            <Button type="submit" className="w-full" variant="gradient" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Complete Setup
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
