import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Lock, User, Mail } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

export function AuthModal({ isOpen, onClose, message = "To access full course content, please register or login." }: AuthModalProps) {
  const navigate = useNavigate();

  const handleLogin = () => {
    onClose();
    navigate("/login");
  };

  const handleRegister = () => {
    onClose();
    navigate("/register");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-xl font-bold">Unlock full course access</DialogTitle>
          <p className="mt-2 text-sm text-muted-foreground">
            {message}
          </p>
        </DialogHeader>
        
        <div className="mt-6 space-y-3">
          <Button 
            onClick={handleLogin}
            className="w-full"
            size="lg"
          >
            <User className="mr-2 h-4 w-4" />
            Login
          </Button>
          
          <Button 
            onClick={handleRegister}
            variant="outline"
            className="w-full"
            size="lg"
          >
            <Mail className="mr-2 h-4 w-4" />
            Register
          </Button>
        </div>
        
        <div className="mt-4 text-center">
          <p className="text-xs text-muted-foreground">
            Get instant access to all course content, progress tracking, and certificates.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
