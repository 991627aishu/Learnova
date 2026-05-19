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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GlobalFooter } from "@/components/common/GlobalFooter";
import { Logo } from "@/components/common/Logo";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "At least 8 characters"),
  confirmPassword: z.string(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(["student", "instructor"]),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});
type Form = z.infer<typeof schema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const { setUser } = useUserStore();
  const toast = useToastStore((s) => s.add);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { role: "student" },
  });
  const role = watch("role");

  const onSubmit = async (data: Form) => {
    setLoading(true);
    // Remove confirmPassword before sending to API
    const { confirmPassword, ...registerData } = data;
    const res = await api<{ user: any; token: string }>("/auth/register", { method: "POST", body: registerData });
    setLoading(false);
    if (res.error) {
      toast({ title: "Error", description: res.error, variant: "destructive" });
      return;
    }
    if (res.data?.user && res.data?.token) {
      // Store token in localStorage
      localStorage.setItem("lms_token", res.data.token);
      
      // Set user in global store
      setUser(res.data.user);
      
      const home = res.data.user.role === "admin" ? "/admin" : res.data.user.role === "instructor" ? "/instructor" : "/student";
      navigate(home, { replace: true });
      toast({ title: "Account created!", variant: "success" });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/20">
      {/* Decorative blurry gradients background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[20%] -right-[10%] w-[50%] h-[50%] bg-amber-500/20 rounded-full blur-[120px]" />
        <div className="absolute top-[80%] -left-[10%] w-[40%] h-[40%] bg-yellow-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="mb-8 w-full max-w-lg flex justify-center">
          <Link to="/" className="flex items-center hover:opacity-90 transition-opacity">
            <Logo className="w-12 h-12" />
          </Link>
        </div>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-lg">
          <Card className="border border-amber-500/20 shadow-2xl bg-card/60 backdrop-blur-xl ring-1 ring-amber-500/10">
            <CardHeader className="space-y-1 text-center pb-6">
              <CardTitle className="text-3xl font-bold font-display bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 bg-clip-text text-transparent">Create account</CardTitle>
              <CardDescription className="text-base text-muted-foreground">Join the world-class learning platform</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="font-semibold">First name</Label>
                    <Input id="firstName" className="h-12 px-4 rounded-xl bg-background/50" {...register("firstName")} />
                    {errors.firstName && <p className="text-sm text-red-500 font-medium">{errors.firstName.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="font-semibold">Last name</Label>
                    <Input id="lastName" className="h-12 px-4 rounded-xl bg-background/50" {...register("lastName")} />
                    {errors.lastName && <p className="text-sm text-red-500 font-medium">{errors.lastName.message}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-semibold">Email</Label>
                  <Input id="email" type="email" placeholder="you@example.com" className="h-12 px-4 rounded-xl bg-background/50" {...register("email")} />
                  {errors.email && <p className="text-sm text-red-500 font-medium">{errors.email.message}</p>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="font-semibold">Password</Label>
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
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="font-semibold">Confirm Password</Label>
                    <div className="relative group">
                      <Input 
                        id="confirmPassword" 
                        type={showConfirmPassword ? "text" : "password"} 
                        className="h-12 pl-4 pr-12 rounded-xl bg-background/50 focus:bg-background transition-colors" 
                        {...register("confirmPassword")} 
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors focus:outline-none"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.confirmPassword && <p className="text-sm text-red-500 font-medium">{errors.confirmPassword.message}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">I am a</Label>
                  <Select value={role} onValueChange={(v) => setValue("role", v as "student" | "instructor")}>
                    <SelectTrigger className="h-12 px-4 rounded-xl bg-background/50">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="instructor">Instructor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full h-12 text-lg rounded-xl font-semibold shadow-lg hover:shadow-amber-500/30 transition-all hover:-translate-y-0.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600" disabled={loading}>
                  {loading ? "Creating account..." : "Create account"}
                </Button>
              </form>
              <p className="mt-6 text-center text-sm font-medium text-muted-foreground">
                Already have an account? <Link to="/login" className="text-primary hover:text-primary/80 transition-colors">Sign in</Link>
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      
      <GlobalFooter />
    </div>
  );
}
