import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Residents from "./pages/Residents";
import ResidentForm from "./pages/ResidentForm";
import ResidentDetail from "./pages/ResidentDetail";
import ResidentEdit from "./pages/ResidentEdit";
import Rooms from "./pages/Rooms";
import Payments from "./pages/Payments";
import ExtraCharges from "./pages/ExtraCharges";
import FoodMenu from "./pages/FoodMenu";
import Documents from "./pages/Documents";
import Reminders from "./pages/Reminders";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

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
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/residents" element={<ProtectedRoute><Residents /></ProtectedRoute>} />
            <Route path="/residents/new" element={<ProtectedRoute><ResidentForm /></ProtectedRoute>} />
            <Route path="/residents/:id" element={<ProtectedRoute><ResidentDetail /></ProtectedRoute>} />
            <Route path="/residents/:id/edit" element={<ProtectedRoute><ResidentEdit /></ProtectedRoute>} />
            <Route path="/rooms" element={<ProtectedRoute><Rooms /></ProtectedRoute>} />
            <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
            <Route path="/extra-charges" element={<ProtectedRoute><ExtraCharges /></ProtectedRoute>} />
            <Route path="/food-menu" element={<ProtectedRoute><FoodMenu /></ProtectedRoute>} />
            <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
            <Route path="/reminders" element={<ProtectedRoute><Reminders /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
