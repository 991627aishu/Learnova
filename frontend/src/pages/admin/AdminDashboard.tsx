import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Users, BookOpen, CreditCard, Star } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DashboardRes {
  stats: { userCount: number; courseCount: number; enrollmentCount: number; reviewCount: number };
  recentUsers: Array<{ email: string; firstName: string; lastName: string; role: string }>;
  recentCourses: Array<{ title: string; status: string }>;
}

export function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: async () => {
      const res = await api<DashboardRes>("/admin/dashboard");
      if (res.error) throw new Error(res.error);
      return res.data!;
    },
  });

  const stats = data?.stats ?? { userCount: 0, courseCount: 0, enrollmentCount: 0, reviewCount: 0 };
  const cards = [
    { label: "Users", value: stats.userCount, icon: Users },
    { label: "Courses", value: stats.courseCount, icon: BookOpen },
    { label: "Enrollments", value: stats.enrollmentCount, icon: CreditCard },
    { label: "Reviews", value: stats.reviewCount, icon: Star },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold font-display text-foreground">Admin Dashboard</h1>
        <p className="mt-1 text-muted-foreground">Platform overview</p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
                <c.icon className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{c.value}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Recent users</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <div className="animate-pulse h-24" /> : (
              <ul className="space-y-2">
                {data?.recentUsers?.map((u) => (
                  <li key={u.email} className="flex justify-between rounded-lg border p-3 text-sm">
                    <span>{u.firstName} {u.lastName}</span>
                    <span className="text-muted-foreground">{u.role}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Recent courses</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <div className="animate-pulse h-24" /> : (
              <ul className="space-y-2">
                {data?.recentCourses?.map((c) => (
                  <li key={c.title} className="flex justify-between rounded-lg border p-3 text-sm">
                    <span>{c.title}</span>
                    <span className="text-muted-foreground">{c.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
