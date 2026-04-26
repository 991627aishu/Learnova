import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BookOpen, CheckCircle, Clock, Award } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface DashboardRes {
  enrollments: Array<{
    course: { id: string; title: string; thumbnail?: string | null; _count: { sections: number } };
    progress: { percent: number } | null;
  }>;
}

export function StudentDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["enrollments", "my"],
    queryFn: async () => {
      const res = await api<{ enrollments: DashboardRes["enrollments"] }>("/enrollments/my");
      if (res.error) throw new Error(res.error);
      return res.data!;
    },
  });

  const enrollments = data?.enrollments ?? [];
  const enrolled = enrollments.length;
  const completed = enrollments.filter((e) => e.progress?.percent === 100).length;
  const inProgress = enrollments.filter((e) => e.progress && e.progress.percent > 0 && e.progress.percent < 100).length;
  const avgScore = 0; // would come from quiz attempts

  const cards = [
    { label: "Courses Enrolled", value: enrolled, icon: BookOpen, color: "text-blue-600" },
    { label: "Courses Completed", value: completed, icon: CheckCircle, color: "text-green-600" },
    { label: "In Progress", value: inProgress, icon: Clock, color: "text-amber-600" },
    { label: "Avg Quiz Score", value: avgScore ? `${avgScore}%` : "—", icon: Award, color: "text-purple-600" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold font-display tracking-tight text-foreground">Dashboard</h1>
        <p className="mt-1 text-muted-foreground text-lg">Your learning at a glance</p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="border border-border/50 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
                <div className={`p-2 rounded-lg bg-background shadow-sm border border-border/50 ${c.color}`}>
                  <c.icon className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tracking-tight text-foreground">{c.value}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
      <div>
        <h2 className="text-2xl font-bold font-display text-foreground mb-6">Continue learning</h2>
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">{[1, 2].map((i) => <Card key={i}><CardContent className="p-6 animate-pulse h-24" /></Card>)}</div>
        ) : enrollments.filter((e) => e.progress && e.progress.percent < 100).length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No courses in progress. <a href="/student/browse" className="text-primary hover:underline">Browse courses</a></CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {enrollments
              .filter((e) => e.progress && e.progress.percent < 100)
              .slice(0, 4)
              .map((e) => (
                <Card key={e.course.id} className="overflow-hidden group hover:shadow-lg transition-all duration-300 border-border/50 hover:-translate-y-1">
                  <CardContent className="p-0 flex h-full">
                    <div className="w-32 h-auto bg-slate-950 flex items-center justify-center relative overflow-hidden flex-shrink-0">
                      {e.course.thumbnail ? (
                        <img 
                          src={e.course.thumbnail} 
                          alt={e.course.title} 
                          className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-110" 
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
                          <BookOpen className="w-8 h-8" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent group-hover:opacity-50 transition-opacity" />
                    </div>
                    <div className="p-5 flex-1 flex flex-col justify-center">
                      <p className="font-semibold text-foreground group-hover:text-primary transition-colors text-lg line-clamp-1">{e.course.title}</p>
                      <Progress value={e.progress?.percent ?? 0} className="mt-3 h-2" />
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs font-medium text-muted-foreground">{e.progress?.percent ?? 0}% complete</p>
                        <a href={`/student/course/${e.course.id}/learn`} className="text-sm font-medium text-primary hover:text-primary/80 transition-colors inline-block">Continue &rarr;</a>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
