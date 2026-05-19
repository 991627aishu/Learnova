import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CleanProfileAvatar } from "@/components/common/CleanProfileAvatar";
import { useUserStore } from "@/store/userStore";
import { LogOut } from "lucide-react";

interface CleanNavbarProps {
  showDashboardButton?: boolean;
}

export function CleanNavbar({ showDashboardButton = true }: CleanNavbarProps) {
  const navigate = useNavigate();
  const { user, clearUser } = useUserStore();

  const handleLogout = () => {
    // Clear token from localStorage
    localStorage.removeItem("lms_token");
    
    // Clear user from store
    clearUser();
    
    // Navigate to login
    navigate("/login");
  };

  const handleDashboard = () => {
    if (user?.role === "instructor") {
      navigate("/instructor");
    } else if (user?.role === "student") {
      navigate("/student");
    } else if (user?.role === "admin") {
      navigate("/admin");
    }
  };

  return (
    <nav className="flex items-center justify-between w-full">
      {user && showDashboardButton && (
        <Button 
          variant="ghost" 
          onClick={handleDashboard}
          className="font-medium hover:bg-amber-500/10 hover:text-amber-500 transition-colors"
        >
          Dashboard
        </Button>
      )}
      
      {user ? (
        <div className="flex items-center gap-3">
          <CleanProfileAvatar user={user} size="sm" className="border border-amber-500/30 ring-1 ring-amber-500/20" />
          <span className="text-sm font-medium text-foreground">
            {user.firstName} {user.lastName}
          </span>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="hover:bg-amber-500/10 hover:text-amber-500 transition-colors">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/login")} className="hover:bg-amber-500/10 hover:text-amber-500 transition-colors">
            Login
          </Button>
          <Button onClick={() => navigate("/register")} className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 border border-amber-400/30 shadow-lg shadow-amber-500/20">
            Sign up
          </Button>
        </div>
      )}
    </nav>
  );
}
