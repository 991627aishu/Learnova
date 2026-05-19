import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BookOpen, CheckCircle, Clock, Trophy } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useEffect } from "react";

interface DashboardRes {
  enrollments: Array<{
    course: { id: string; title: string; thumbnail?: string | null; _count: { sections: number } };
    progress: { percent: number } | null;
  }>;
}

export function StudentDashboard() {
  const queryClient = useQueryClient();
  
  const { data, isLoading } = useQuery({
    queryKey: ["enrollments", "my"],
    queryFn: async () => {
      const res = await api<{ enrollments: DashboardRes["enrollments"] }>("/enrollments/my");
      if (res.error) throw new Error(res.error);
      return res.data!;
    },
  });

  // Refetch dashboard data when user returns to dashboard
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        queryClient.invalidateQueries({ queryKey: ["enrollments", "my"] });
        queryClient.invalidateQueries({ queryKey: ["my-certificates"] });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [queryClient]);

  // Get certificates data
  const { data: certificatesData } = useQuery({
    queryKey: ["my-certificates"],
    queryFn: async () => {
      const res = await api<{ certificates: any[] }>("/certificates/my");
      if (res.error) return { certificates: [] };
      return res.data!;
    },
  });

  const enrollments = data?.enrollments ?? [];
  const certificates = certificatesData?.certificates ?? [];
  const enrolled = enrollments.length;
  const completed = enrollments.filter((e) => e.progress?.percent === 100).length;
  const inProgress = enrollments.filter((e) => e.progress && e.progress.percent > 0 && e.progress.percent < 100).length;
  const certificatesEarned = certificates.length;
  
  // Calculate average progress
  const avgProgress = enrollments.length > 0 
    ? Math.round(enrollments.reduce((sum, e) => sum + (e.progress?.percent || 0), 0) / enrollments.length)
    : 0;

  const cards = [
    { label: "Courses Enrolled", value: enrolled, icon: BookOpen, color: "text-blue-600", bgColor: "bg-blue-500/10" },
    { label: "Courses Completed", value: completed, icon: CheckCircle, color: "text-green-600", bgColor: "bg-green-500/10" },
    { label: "In Progress", value: inProgress, icon: Clock, color: "text-amber-600", bgColor: "bg-amber-500/10" },
    { label: "Certificates Earned", value: certificatesEarned, icon: Trophy, color: "text-purple-600", bgColor: "bg-purple-500/10" },
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
            <Card className="border border-border/50 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 bg-card/50 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
                <div className={`p-2.5 rounded-xl ${c.bgColor} shadow-sm border border-border/30`}>
                  <c.icon className={`h-5 w-5 ${c.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tracking-tight text-foreground">{c.value}</div>
                {c.label === "Courses Enrolled" && enrolled > 0 && (
                  <div className="mt-2">
                    <Progress value={avgProgress} className="h-1.5" />
                    <p className="text-xs text-muted-foreground mt-1">{avgProgress}% avg progress</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Recent Activity Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
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
                      <div className="w-20 h-20 rounded-xl overflow-hidden shadow-sm bg-gray-100 flex-shrink-0 flex items-center justify-center">
                        <img
                          src={
                            e.course?.thumbnail
                              ? e.course.thumbnail.startsWith("http")
                                ? e.course.thumbnail
                                : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${e.course.thumbnail}` 
                              : "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=400&fit=crop&crop=center"
                          }
                          alt={e.course?.title || "Course"}
                          className="max-h-full max-w-full object-contain transition-transform hover:scale-105"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=400&fit=crop&crop=center";
                          }}
                        />
                      </div>
                      <div className="p-5 flex-1 flex flex-col justify-center">
                        <p className="font-semibold text-foreground group-hover:text-primary transition-colors text-lg line-clamp-1">{e.course.title}</p>
                        <Progress value={e.progress?.percent ?? 0} className="mt-3 h-2" />
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs font-medium text-muted-foreground">{e.progress?.percent ?? 0}% complete</p>
                          <Link to={`/student/course/${e.course.id}/learn`} className="text-sm font-medium text-primary hover:text-primary/80 transition-colors inline-block">Continue &rarr;</Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </div>

        {/* Recent Achievements */}
        <div className="lg:col-span-1">
          <h2 className="text-2xl font-bold font-display text-foreground mb-6">Recent Achievements</h2>
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="p-6 space-y-4">
              {certificatesEarned > 0 ? (
                <>
                  <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <Trophy className="w-6 h-6 text-green-500" />
                    <div>
                      <p className="font-semibold text-foreground">Certificates Earned</p>
                      <p className="text-sm text-muted-foreground">{certificatesEarned} certificate{certificatesEarned !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <Button asChild className="w-full">
                    <Link to="/student/certificates">View All Certificates</Link>
                  </Button>
                </>
              ) : (
                <div className="text-center py-4">
                  <Trophy className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">Complete courses to earn certificates</p>
                  <Button asChild variant="outline" className="mt-3">
                    <Link to="/student/browse">Browse Courses</Link>
                  </Button>
                </div>
              )}

              {completed > 0 && (
                <div className="flex items-center gap-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-blue-500" />
                  <div>
                    <p className="font-semibold text-foreground">Courses Completed</p>
                    <p className="text-sm text-muted-foreground">{completed} course{completed !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
