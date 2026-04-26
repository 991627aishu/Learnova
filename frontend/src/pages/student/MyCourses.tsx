import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { BookOpen, Award, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { CourseCard } from "@/components/common/CourseCard";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useToastStore } from "@/store/toastStore";

interface Enrollment {
  id: string;
  isCompleted: boolean;
  completedAt?: string | null;
  course: {
    id: string;
    title: string;
    subtitle?: string | null;
    thumbnail?: string | null;
    _count: { sections: number };
  };
  progress: { percent: number } | null;
}

export function MyCourses() {
  const toast = useToastStore((s) => s.add);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["enrollments", "my"],
    queryFn: async () => {
      const res = await api<{ enrollments: Enrollment[] }>("/enrollments/my");
      if (res.error) throw new Error(res.error);
      return res.data!;
    },
  });

  const enrollments = data?.enrollments ?? [];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black font-display text-foreground tracking-tight">My Learning</h1>
          <p className="mt-2 text-muted-foreground">You have {enrollments.length} active {enrollments.length === 1 ? 'enrollment' : 'enrollments'}.</p>
        </div>
        <Button asChild variant="outline" className="w-fit">
          <Link to="/student/browse">Explore More</Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="overflow-hidden border-border/40">
              <div className="flex h-32 animate-pulse">
                <div className="w-40 bg-muted shrink-0" />
                <div className="flex-1 p-4 space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-2 bg-muted rounded w-full" />
                  <div className="h-8 bg-muted rounded w-24" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : enrollments.length === 0 ? (
        <Card className="border-dashed bg-muted/20">
          <CardContent className="p-20 text-center space-y-4">
            <BookOpen className="w-16 h-16 mx-auto text-muted-foreground/30" />
            <div className="space-y-2">
              <p className="text-xl font-bold text-foreground">Your library is empty</p>
              <p className="text-muted-foreground max-w-sm mx-auto">Start your learning journey today by enrolling in one of our expert-led courses.</p>
            </div>
            <Button asChild size="lg" className="rounded-full px-8">
              <Link to="/student/browse">Browse Catalog</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {enrollments.map((e, i) => {
            const isCompleted = e.isCompleted || (e.progress?.percent ?? 0) === 100;
            const progress = e.progress?.percent ?? 0;

            return (
              <motion.div key={e.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.4 }} className="h-full">
                <CourseCard
                  course={{
                    id: e.course.id,
                    title: e.course.title,
                    subtitle: e.course.subtitle,
                    thumbnail: e.course.thumbnail,
                  }}
                  stats={
                    <div className="w-full flex items-center gap-2 mb-2 bg-background/50 p-2 rounded-lg border border-border/50">
                      <Progress value={progress} className="h-2 flex-1" />
                      <span className="text-[10px] font-bold text-muted-foreground w-8 text-right">{progress}%</span>
                    </div>
                  }
                  actions={
                    <div className="flex flex-col sm:flex-row gap-2 w-full mt-2">
                       <Button asChild size="sm" className="rounded-lg font-bold shadow-sm flex-1">
                        <Link to={`/student/course/${e.course.id}/learn`}>
                          {isCompleted ? "Review Content" : "Continue"}
                        </Link>
                      </Button>
                      {isCompleted && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="rounded-lg border-green-500/30 text-green-600 hover:bg-green-500/10 flex gap-2 flex-1 mt-2 sm:mt-0"
                          onClick={async () => {
                             try {
                               setDownloadingId(e.course.id);
                               const authStoreStr = localStorage.getItem("lms-auth");
                               let token = "";
                               if (authStoreStr) {
                                 const parsed = JSON.parse(authStoreStr);
                                 token = parsed?.state?.token || "";
                               }
                               const response = await fetch(`/api/certificates/course/${e.course.id}/generate`, {
                                 method: "POST",
                                 headers: {
                                   ...(token ? { Authorization: `Bearer ${token}` } : {})
                                 }
                               });
                               if (!response.ok) {
                                 const err = await response.json();
                                 throw new Error(err.error || "Failed to download certificate");
                               }
                               const blob = await response.blob();
                               const url = window.URL.createObjectURL(blob);
                               const a = document.createElement("a");
                               a.href = url;
                               a.download = `Certificate_${e.course.title.replace(/\s+/g, '_')}.pdf`;
                               document.body.appendChild(a);
                               a.click();
                               window.URL.revokeObjectURL(url);
                               document.body.removeChild(a);
                               toast({ title: "Certificate downloaded!", variant: "success" });
                             } catch (err: any) {
                               toast({ title: "Download failed", description: err.message, variant: "destructive" });
                             } finally {
                               setDownloadingId(null);
                             }
                          }}
                          disabled={downloadingId === e.course.id}
                        >
                          {downloadingId === e.course.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Award className="w-4 h-4" />
                          )}
                          Certificate
                        </Button>
                      )}
                    </div>
                  }
                />
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
