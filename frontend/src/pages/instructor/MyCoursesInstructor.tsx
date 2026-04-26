import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Trash2, Edit2, PlayCircle, StopCircle, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToastStore } from "@/store/toastStore";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CourseCard } from "@/components/common/CourseCard";
import { cn } from "@/lib/utils";

interface Course {
  id: string;
  title: string;
  status: string;
  thumbnail?: string | null;
  _count: { enrollments: number; sections: number };
  category?: { name: string } | null;
}

export function MyCoursesInstructor() {
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.add);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["courses", "my-instructor"],
    queryFn: async () => {
      const res = await api<{ courses: Course[] }>("/courses/my-instructor");
      if (res.error) throw new Error(res.error);
      return res.data!;
    },
  });

  const handleTogglePublish = async (courseId: string, currentStatus: string) => {
    const newStatus = currentStatus === "published" ? "draft" : "published";
    const res = await api<{ success: boolean }>(`/courses/${courseId}`, {
      method: "PATCH",
      body: { status: newStatus },
    });
    if (res.error) {
      toast({ title: "Error updating course", description: res.error, variant: "destructive" });
    } else {
      toast({ title: `Course ${newStatus} successfully`, variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["courses", "my-instructor"] });
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api<{ success: boolean }>(`/courses/${id}`, { method: "DELETE" });
      if (res.error) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      toast({ title: "Course deleted", variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["courses", "my-instructor"] });
      setCourseToDelete(null);
    },
    onError: (err: any) => {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    }
  });

  const courses = data?.courses ?? [];

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black font-display tracking-tight text-foreground">My Courses</h1>
          <p className="mt-2 text-muted-foreground">Manage and grow your curriculum catalog.</p>
        </div>
        <Button asChild size="lg" className="rounded-xl shadow-lg shadow-primary/20"><Link to="/instructor/courses/new">Create New Course</Link></Button>
      </div>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="overflow-hidden border-border/40">
              <CardContent className="p-6 animate-pulse space-y-4">
                <div className="h-5 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-10 bg-muted rounded w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <Card className="border-dashed bg-muted/20">
          <CardContent className="p-20 text-center space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto opacity-40">
              <PlayCircle className="w-8 h-8" />
            </div>
            <p className="text-xl font-bold text-foreground">No courses yet.</p>
            <p className="text-muted-foreground max-w-xs mx-auto">Start sharing your knowledge by creating your first course today.</p>
            <Button asChild size="lg" className="rounded-xl"><Link to="/instructor/courses/new">Create First Course</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <CourseCard
              key={c.id}
              course={{
                id: c.id,
                title: c.title,
                thumbnail: c.thumbnail,
                category: c.category?.name,
              }}
              headerBadge={
                <div className={cn(
                  "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                  c.status === "published" ? "bg-green-500/10 text-green-600" : "bg-amber-500/10 text-amber-600"
                )}>
                  {c.status}
                </div>
              }
              stats={
                <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-background/50 px-2 py-1 rounded">
                  <span className="flex items-center gap-1"><PlayCircle className="w-3 h-3" /> {c._count.sections} Sections</span>
                  <span className="flex items-center gap-1"><PlayCircle className="w-3 h-3" /> {c._count.enrollments} Students</span>
                </div>
              }
              actions={
                <div className="flex items-center w-full gap-2 mt-2">
                  <Button asChild variant="outline" size="sm" className="rounded-lg font-bold flex-1">
                    <Link to={`/instructor/course/${c.id}/edit`}>
                      <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit
                    </Link>
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="rounded-lg font-bold flex-1"
                    onClick={(e) => { e.stopPropagation(); handleTogglePublish(c.id, c.status); }}
                  >
                    {c.status === "published" ? (
                      <><StopCircle className="w-3.5 h-3.5 mr-1.5" /> Unpublish</>
                    ) : (
                      <><PlayCircle className="w-3.5 h-3.5 mr-1.5" /> Publish</>
                    )}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="rounded-lg w-9 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/5 shrink-0"
                    onClick={(e) => { e.stopPropagation(); setCourseToDelete(c); }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              }
              onClick={() => {}}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!courseToDelete} onOpenChange={(open) => !open && setCourseToDelete(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-foreground">Delete Course?</DialogTitle>
            <DialogDescription className="pt-2 text-muted-foreground leading-relaxed">
              This action cannot be undone. All content, enrollments, and associated data for <span className="font-bold text-foreground">"{courseToDelete?.title}"</span> will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex gap-3">
            <Button variant="outline" className="flex-1 font-bold rounded-xl" onClick={() => setCourseToDelete(null)}>Cancel</Button>
            <Button 
              variant="destructive" 
              className="flex-1 font-bold rounded-xl bg-destructive hover:bg-destructive/90 shadow-lg shadow-destructive/20" 
              onClick={() => courseToDelete && deleteMutation.mutate(courseToDelete.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deleting...</>
              ) : (
                "Delete Permanently"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

