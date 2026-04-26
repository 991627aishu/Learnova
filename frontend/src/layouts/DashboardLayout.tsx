import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  BookOpen,
  PlusCircle,
  Users,
  Star,
  BarChart3,
  DollarSign,
  User,
  Settings,
  LogOut,
  Menu,
  X,
  Home,
  Award,
  Heart,
} from "lucide-react";
import { useUserStore } from "@/store/userStore";
import { useToastStore } from "@/store/toastStore";
import { Button } from "@/components/ui/button";
import { UnifiedAvatar } from "@/components/common/UnifiedAvatar";
import { cn } from "@/lib/utils";
import { GlobalFooter } from "@/components/common/GlobalFooter";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { Logo } from "@/components/common/Logo";

interface DashboardLayoutProps {
  role: "instructor" | "student" | "admin";
}

export function DashboardLayout({ role }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, clearUser } = useUserStore();
  const toast = useToastStore((s) => s.add);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  const handleLogoClick = () => {
    navigate("/");
  };

  const handleLogout = async () => {
    try {
      clearUser();
      toast({ 
        title: "Logged out successfully", 
        variant: "success" 
      });
      navigate("/");
    } catch (error) {
      toast({ 
        title: "Logout failed. Try again.", 
        variant: "destructive" 
      });
    }
  };

  // Navigation items based on role
  const getNavItems = () => {
    switch (role) {
      case "instructor":
        return [
          { to: "/instructor", end: true, label: "Dashboard", icon: LayoutDashboard },
          { to: "/instructor/courses", label: "My Courses", icon: BookOpen },
          { to: "/instructor/courses/new", label: "Create Course", icon: PlusCircle },
          { to: "/instructor/students", label: "Students", icon: Users },
          { to: "/instructor/reviews", label: "Reviews", icon: Star },
          { to: "/instructor/analytics", label: "Analytics", icon: BarChart3 },
          { to: "/instructor/earnings", label: "Earnings", icon: DollarSign },
          { to: "/instructor/profile", label: "Profile", icon: User },
          { to: "/instructor/settings", label: "Settings", icon: Settings },
        ];
      case "student":
        return [
          { to: "/student", end: true, label: "Dashboard", icon: LayoutDashboard },
          { to: "/student/courses", label: "My Courses", icon: BookOpen },
          { to: "/student/browse", label: "Browse", icon: Home },
          { to: "/student/wishlist", label: "Wishlist", icon: Heart },
          { to: "/student/certificates", label: "Certificates", icon: Award },
          { to: "/student/profile", label: "Profile", icon: User },
          { to: "/student/settings", label: "Settings", icon: Settings },
        ];
      case "admin":
        return [
          { to: "/admin", end: true, label: "Dashboard", icon: LayoutDashboard },
          { to: "/admin/users", label: "Users", icon: Users },
          { to: "/admin/courses", label: "Courses", icon: BookOpen },
          { to: "/admin/categories", label: "Categories", icon: Settings },
          { to: "/admin/reports", label: "Reports", icon: BarChart3 },
          { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
          { to: "/admin/settings", label: "Settings", icon: Settings },
        ];
      default:
        return [];
    }
  };

  const nav = getNavItems();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="sm"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            {/* Overlay for mobile */}
            {!isDesktop && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 z-30 bg-black/50 lg:hidden"
                onClick={() => setIsSidebarOpen(false)}
              />
            )}
            
            <motion.aside
              initial={{ x: -256 }}
              animate={{ x: 0 }}
              exit={{ x: -256 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border/50 bg-card shadow-sm"
            >
              <div className="flex h-full flex-col p-4">
                {/* Logo */}
                <button 
                  onClick={handleLogoClick}
                  className="mb-6 flex items-center justify-center group cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <Logo className="w-10 h-10" />
                </button>
                
                {/* Navigation */}
                <nav className="flex-1 space-y-1">
                  {nav.map(({ to, end, label, icon: Icon }) => (
                    <NavLink
                      key={to}
                      to={to}
                      end={end}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                          isActive ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                        )
                      }
                      onClick={() => setIsSidebarOpen(false)}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      {label}
                    </NavLink>
                  ))}
                </nav>
                
                {/* User section */}
                <div className="border-t border-border/50 pt-4">
                  <div className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2">
                    <UnifiedAvatar 
                      user={user}
                      size="md"
                      className="border border-border/50"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground capitalize">
                        {user?.role}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 mb-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="flex-1 justify-start gap-2 text-muted-foreground hover:text-foreground" 
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4" /> Sign out
                    </Button>
                    <ThemeToggle />
                  </div>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className={`flex flex-col flex-1 min-h-screen transition-all duration-300 ${isSidebarOpen && isDesktop ? 'pl-64' : 'pl-0'}`}>
        {/* Top bar for desktop */}
        <div className="hidden lg:flex items-center justify-between h-16 px-6 border-b border-border/40">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="gap-2"
          >
            <Menu className="h-4 w-4" />
            {isSidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
          </Button>
          
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="flex items-center gap-3">
              <UnifiedAvatar 
                user={user}
                size="sm"
                className="border border-border/50"
              />
              <span className="text-sm font-medium text-foreground">
                {user?.firstName} {user?.lastName}
              </span>
            </div>
          </div>
        </div>

        {/* Page content */}
        <AnimatePresence mode="wait">
          <motion.div 
            key={location.pathname}
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="flex-1 p-6 md:p-8"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
        <GlobalFooter />
      </main>
    </div>
  );
}
