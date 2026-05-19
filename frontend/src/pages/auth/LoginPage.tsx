import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { useUserStore } from "@/store/userStore";
import { useToastStore } from "@/store/toastStore";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GlobalFooter } from "@/components/common/GlobalFooter";
import { Logo } from "@/components/common/Logo";

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });
type Form = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { setUser, setToken } = useUserStore();
  const toast = useToastStore((s) => s.add);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Form) => {
    setLoading(true);
    setServerError(null);
    const res = await api<{ user: any; token: string; message?: string }>("/auth/login", { method: "POST", body: data });
    setLoading(false);
    
    if (res.error) {
      // Use the specific message from the backend if available, otherwise fall back to the generic error
      const errorMessage = res.error;
      setServerError(errorMessage);
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
      return;
    }
    if (res.data?.user && res.data?.token) {
      // Set user and token in global store
      setUser(res.data.user);
      setToken(res.data.token);
      
      const home = res.data.user.role === "admin" ? "/admin" : res.data.user.role === "instructor" ? "/instructor" : "/student";
      navigate(home, { replace: true });
      toast({ title: "Welcome back!", variant: "success" });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/20">
      {/* Decorative blurry gradients background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-amber-500/20 rounded-full blur-[120px]" />
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[60%] bg-yellow-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="mb-8 w-full max-w-md flex justify-center">
          <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <Logo className="w-12 h-12" />
          </Link>
        </div>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-md">
          <Card className="border border-amber-500/20 shadow-2xl bg-card/60 backdrop-blur-xl ring-1 ring-amber-500/10">
            <CardHeader className="space-y-1 text-center pb-6">
              <CardTitle className="text-3xl font-bold font-display bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 bg-clip-text text-transparent">Welcome back</CardTitle>
              <CardDescription className="text-base text-muted-foreground">Sign in to your THE GATE HUB account</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-semibold">Email</Label>
                  <Input id="email" type="email" placeholder="you@example.com" className="h-12 px-4 rounded-xl bg-background/50" {...register("email")} />
                  {errors.email && <p className="text-sm text-red-500 font-medium">{errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="font-semibold">Password</Label>
                    <Link to="/forgot-password" className="text-xs font-bold text-primary hover:underline underline-offset-4">
                      Forgot Password?
                    </Link>
                  </div>
                  <div className="relative group">
                    <Input 
                      id="password" 
                      type={showPassword ? "text" : "password"} 
                      className="h-12 pl-4 pr-12 rounded-xl bg-background/50 focus:bg-background transition-colors" 
                      {...register("password")} 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-sm text-red-500 font-medium">{errors.password.message}</p>}
                </div>

                {serverError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-center text-red-500 text-sm font-medium">
                    {serverError}
                  </div>
                )}

                <Button type="submit" className="w-full h-12 text-lg rounded-xl font-semibold shadow-lg hover:shadow-amber-500/30 transition-all hover:-translate-y-0.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600" disabled={loading}>
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
              </form>
              <p className="mt-6 text-center text-sm font-medium text-muted-foreground">
                Don&apos;t have an account? <Link to="/register" className="text-primary hover:text-primary/80 transition-colors">Create one now</Link>
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      
      <GlobalFooter />
    </div>
  );
}
