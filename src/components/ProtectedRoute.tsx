import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, userRole } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Check if user has admin role
  if (!userRole) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-4">
            You don't have permission to access this system.
          </p>
          <p className="text-sm text-muted-foreground">
            Contact the Super Admin for access.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
