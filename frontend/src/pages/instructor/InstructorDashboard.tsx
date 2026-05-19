import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, DollarSign, BookOpen, Star, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InstructorCourseCard } from "@/components/instructor/InstructorCourseCard";

interface Course {
  id: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  thumbnail?: string | null;
  status: string;
  averageRating: number;
  reviewCount: number;
  _count: { enrollments: number; sections: number; reviews: number };
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Your Courses</h2>
          <Link to="/instructor/courses/new">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Create Course
            </Button>
          </Link>
        </div>
        
        {courses.length === 0 ? (
          <Card className="border-dashed border-2 bg-transparent">
            <CardContent className="p-20 text-center flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center">
                <BookOpen className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <p className="text-xl font-bold text-foreground">No courses yet</p>
                <p className="text-muted-foreground max-w-xs mx-auto">
                  Create your first course to start teaching and earning.
                </p>
              </div>
              <Link to="/instructor/courses/new">
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Your First Course
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-stretch">
            {courses.map((course, index) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="h-full"
              >
                <InstructorCourseCard course={course} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
