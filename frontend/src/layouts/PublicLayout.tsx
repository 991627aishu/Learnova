import { Outlet, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Menu, X, LogOut } from "lucide-react";
import { useUserStore } from "@/store/userStore";
import { useToastStore } from "@/store/toastStore";
import { Button } from "@/components/ui/button";
import { UnifiedAvatar } from "@/components/common/UnifiedAvatar";
import { GlobalFooter } from "@/components/common/GlobalFooter";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { Logo } from "@/components/common/Logo";

export function PublicLayout() {
  const navigate = useNavigate();
  const { user, clearUser } = useUserStore();
  const toast = useToastStore((s) => s.add);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogoClick = () => {
    navigate("/");
  };

  const handleLogout = async () => {
    try {
      // Clear token from localStorage
      localStorage.removeItem("lms_token");
      
      // Clear user from store
      clearUser();
      
      toast({ 
        title: "Logged out successfully", 
        variant: "success" 
      });
      
      // Navigate to home
      navigate("/");
    } catch (error: any) {
      console.error("Logout error:", error);
      toast({ 
        title: "Logout failed", 
        description: error.message || "An error occurred during logout", 
        variant: "destructive" 
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-8">
              <button 
                onClick={handleLogoClick}
                className="flex items-center gap-3 group cursor-pointer hover:opacity-80 transition-opacity"
              >
                <Logo className="w-8 h-8" />
              </button>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              {user ? (
                <div className="flex items-center gap-4">
                  <Button 
                    variant="ghost" 
                    onClick={() => navigate(user.role === "instructor" ? "/instructor" : "/student")}
                    className="font-medium"
                  >
                    Dashboard
                  </Button>
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
                  <Button variant="ghost" size="sm" onClick={handleLogout}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <Button variant="ghost" onClick={() => navigate("/login")}>
                    Login
                  </Button>
                  <Button onClick={() => navigate("/register")}>
                    Sign up
                  </Button>
                </div>
              )}
            </nav>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="gap-2"
              >
                {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                {isMobileMenuOpen ? "Close" : "Menu"}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden border-t border-border/40 bg-background"
            >
              <div className="container mx-auto px-4 py-4 space-y-4">
                {user ? (
                  <>
                    <div className="flex items-center gap-3 pb-4 border-b border-border/20">
                      <UnifiedAvatar 
                        user={user}
                        size="md"
                        className="border border-border/50"
                      />
                      <div>
                        <p className="font-medium text-foreground">
                          {user?.firstName} {user?.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground capitalize">{user?.role}</p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      onClick={() => {
                        navigate(user.role === "instructor" ? "/instructor" : "/student");
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full justify-start"
                    >
                      Dashboard
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={() => {
                        handleLogout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full justify-start"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      variant="ghost" 
                      onClick={() => {
                        navigate("/login");
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full justify-start"
                    >
                      Login
                    </Button>
                    <Button 
                      onClick={() => {
                        navigate("/register");
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full"
                    >
                      Sign up
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <GlobalFooter />
    </div>
  );
}
