import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  FolderTree,
  Flag,
  Star,
  CreditCard,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import { useUserStore } from "@/store/userStore";
import { Button } from "@/components/ui/button";
import { UnifiedAvatar } from "@/components/common/UnifiedAvatar";
import { cn } from "@/lib/utils";
import { GlobalFooter } from "@/components/common/GlobalFooter";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { Logo } from "@/components/common/Logo";

const nav = [
  { to: "/admin", end: true, label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/courses", label: "Courses", icon: BookOpen },
  { to: "/admin/categories", label: "Categories", icon: FolderTree },
  { to: "/admin/reports", label: "Reports", icon: Flag },
  { to: "/admin/reviews", label: "Reviews", icon: Star },
  { to: "/admin/payments", label: "Payments", icon: CreditCard },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useUserStore();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-amber-500/20 bg-card shadow-sm ring-1 ring-amber-500/10">
        <div className="flex h-full flex-col p-4">
          <NavLink to="/admin" className="mb-6 flex items-center gap-2 px-2">
            <Logo className="w-10 h-10" hideText />
            <span className="text-xl font-bold font-display text-foreground dark:text-slate-100">THE GATE HUB Admin</span>
          </NavLink>
          <nav className="flex-1 space-y-1">
            {nav.map(({ to, end, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                    isActive ? "bg-amber-500/10 text-amber-500 font-semibold" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  )
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="border-t border-amber-500/20 pt-4">
            <div className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2">
              <UnifiedAvatar 
                user={user}
                size="md"
                className="border border-amber-500/30"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{user?.firstName} {user?.lastName}</p>
                <p className="truncate text-xs text-muted-foreground">Admin</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2 mb-2">
              <Button variant="ghost" size="sm" className="flex-1 justify-start gap-2 text-muted-foreground hover:text-foreground" onClick={() => { logout(); navigate("/login"); }}>
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </aside>
      <main className="flex flex-col flex-1 pl-64 min-h-screen">
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
