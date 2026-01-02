import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Suspense, lazy } from "react";

// Critical pages - load immediately
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import AcceptInvite from "./pages/AcceptInvite";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

// Heavy pages - lazy load
const Residents = lazy(() => import("./pages/Residents"));
const ResidentForm = lazy(() => import("./pages/ResidentForm"));
const ResidentDetail = lazy(() => import("./pages/ResidentDetail"));
const ResidentEdit = lazy(() => import("./pages/ResidentEdit"));
const Rooms = lazy(() => import("./pages/Rooms"));
const Payments = lazy(() => import("./pages/Payments"));
const ExtraCharges = lazy(() => import("./pages/ExtraCharges"));
const FoodMenu = lazy(() => import("./pages/FoodMenu"));
const Documents = lazy(() => import("./pages/Documents"));
const Reminders = lazy(() => import("./pages/Reminders"));
const Settings = lazy(() => import("./pages/Settings"));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-4">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/accept-invite" element={<AcceptInvite />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/residents" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><Residents /></Suspense></ProtectedRoute>} />
            <Route path="/residents/new" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><ResidentForm /></Suspense></ProtectedRoute>} />
            <Route path="/residents/:id" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><ResidentDetail /></Suspense></ProtectedRoute>} />
            <Route path="/residents/:id/edit" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><ResidentEdit /></Suspense></ProtectedRoute>} />
            <Route path="/rooms" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><Rooms /></Suspense></ProtectedRoute>} />
            <Route path="/payments" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><Payments /></Suspense></ProtectedRoute>} />
            <Route path="/extra-charges" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><ExtraCharges /></Suspense></ProtectedRoute>} />
            <Route path="/food-menu" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><FoodMenu /></Suspense></ProtectedRoute>} />
            <Route path="/documents" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><Documents /></Suspense></ProtectedRoute>} />
            <Route path="/reminders" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><Reminders /></Suspense></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><Settings /></Suspense></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
