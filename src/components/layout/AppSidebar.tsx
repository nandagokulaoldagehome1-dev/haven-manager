import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  BedDouble,
  CreditCard,
  UtensilsCrossed,
  FileText,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  Home,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/residents', label: 'Residents', icon: Users },
  { path: '/rooms', label: 'Rooms', icon: BedDouble },
  { path: '/payments', label: 'Payments', icon: CreditCard },
  { path: '/food-menu', label: 'Food Menu', icon: UtensilsCrossed },
  { path: '/documents', label: 'Documents', icon: FileText },
  { path: '/reminders', label: 'Reminders', icon: Bell },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { signOut, user, userRole } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-5 border-b border-sidebar-border",
        collapsed && "justify-center px-2"
      )}>
        <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
          <Home className="w-5 h-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in">
            <h1 className="font-display font-bold text-sidebar-foreground text-lg leading-tight">
              Care Home
            </h1>
            <p className="text-xs text-sidebar-foreground/60">Management System</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "sidebar-link",
                isActive && "active",
                collapsed && "justify-center px-2"
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User & Logout */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-3">
        {!collapsed && (
          <div className="px-3 py-2 rounded-lg bg-sidebar-accent/50 animate-fade-in">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.email}
            </p>
            <p className="text-xs text-sidebar-foreground/60 capitalize">
              {userRole?.replace('_', ' ')}
            </p>
          </div>
        )}
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className={cn(
            "w-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent justify-start",
            collapsed && "justify-center px-2"
          )}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span>Sign Out</span>}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-40 flex items-center px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="w-6 h-6" />
        </Button>
        <div className="flex items-center gap-2 ml-3">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
            <Home className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display font-semibold">Care Home</span>
        </div>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-foreground/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "lg:hidden fixed top-0 left-0 h-full w-72 gradient-sidebar z-50 transform transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <X className="w-5 h-5" />
        </Button>
        <SidebarContent />
      </aside>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex fixed top-0 left-0 h-full gradient-sidebar z-30 flex-col transition-all duration-300",
          collapsed ? "w-20" : "w-64"
        )}
      >
        <SidebarContent />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-card border border-border shadow-sm hover:bg-muted text-foreground"
        >
          <ChevronLeft className={cn(
            "w-4 h-4 transition-transform",
            collapsed && "rotate-180"
          )} />
        </Button>
      </aside>

      {/* Spacer */}
      <div className={cn(
        "hidden lg:block flex-shrink-0 transition-all duration-300",
        collapsed ? "w-20" : "w-64"
      )} />
      <div className="lg:hidden h-16" />
    </>
  );
}
