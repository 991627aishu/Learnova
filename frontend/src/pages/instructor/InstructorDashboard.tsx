import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, DollarSign, BookOpen, Star } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Course {
  id: string;
  title: string;
  status: string;
  _count: { enrollments: number };
}

export function InstructorDashboard() {
  const { data: coursesData } = useQuery({
    queryKey: ["courses", "my-instructor"],
    queryFn: async () => {
      const res = await api<{ courses: Course[] }>("/courses/my-instructor");
      if (res.error) throw new Error(res.error);
      return res.data!;
    },
  });

  const courses = coursesData?.courses ?? [];
  const totalStudents = courses.reduce((acc, c) => acc + (c._count?.enrollments ?? 0), 0);
  const published = courses.filter((c) => c.status === "published").length;
  const chartData = [{ name: "Students", value: totalStudents }, { name: "Courses", value: published }];

  const cards = [
    { label: "Total Students", value: totalStudents, icon: Users },
    { label: "Total Revenue", value: "$0", icon: DollarSign },
    { label: "Courses Published", value: published, icon: BookOpen },
    { label: "Avg Rating", value: "—", icon: Star },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold font-display text-foreground">Instructor Dashboard</h1>
        <p className="mt-1 text-muted-foreground">Your creator studio</p>
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
          <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Recent courses</CardTitle></CardHeader>
          <CardContent>
              <ul className="space-y-2">
                {courses.slice(0, 5).map((c) => (
                  <li key={c.id} className="flex items-center justify-between rounded-lg border p-3">
                    <span className="font-medium text-foreground">{c.title}</span>
                    <Link to={`/instructor/course/${c.id}/edit`} className="text-sm text-primary hover:underline">Edit</Link>
                  </li>
                ))}
                {courses.length === 0 && <p className="text-muted-foreground text-sm">No courses yet. <Link to="/instructor/courses/new" className="text-primary hover:underline">Create one</Link></p>}
              </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
