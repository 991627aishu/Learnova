import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { BookOpen, Award, Loader2, Calendar, Download, Eye } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { CourseCard } from "@/components/common/CourseCard";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useToastStore } from "@/store/toastStore";
import { cn } from "@/lib/utils";

interface Enrollment {
  id: string;
  isCompleted: boolean;
  completedAt?: string | null;
  enrolledAt: string;
  lastAccessed?: string | null;
  course: {
    id: string;
    title: string;
    subtitle?: string | null;
    thumbnail?: string | null;
    difficulty?: string | null;
    category?: { name: string } | null;
    instructor?: { firstName: string; lastName: string } | null;
    averageRating?: number;
    reviewCount?: number;
    _count: { sections: number; enrollments: number };
  };
  progress: { percent: number; lastAccessed?: string | null } | null;
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
  const completedCount = enrollments.filter(e => e.isCompleted).length;
  const inProgressCount = enrollments.filter(e => !e.isCompleted).length;

  // Get certificates for completed courses
  const { data: certificatesData } = useQuery({
    queryKey: ["my-certificates"],
    queryFn: async () => {
      const res = await api<{ certificates: any[] }>("/certificates/my");
      if (res.error) return { certificates: [] };
      return res.data!;
    },
  });

  const certificates = certificatesData?.certificates ?? [];
  const getCertificateForCourse = (courseId: string) => certificates.find(c => c.courseId === courseId);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black font-display text-foreground tracking-tight">My Learning</h1>
          <p className="mt-2 text-muted-foreground">You have {enrollments.length} total {enrollments.length === 1 ? 'enrollment' : 'enrollments'}.</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-card/50 backdrop-blur-sm border border-border/50 px-4 py-2 rounded-xl">
            <div className="text-xs text-muted-foreground">In Progress</div>
            <div className="text-xl font-bold text-foreground">{inProgressCount}</div>
          </div>
          <div className="bg-card/50 backdrop-blur-sm border border-border/50 px-4 py-2 rounded-xl">
            <div className="text-xs text-muted-foreground">Completed</div>
            <div className="text-xl font-bold text-green-500">{completedCount}</div>
          </div>
          <Button asChild variant="outline" className="w-fit">
            <Link to="/student/browse">Explore More</Link>
          </Button>
        </div>
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
            const certificate = getCertificateForCourse(e.course.id);
            const lastAccessed = e.progress?.lastAccessed || e.lastAccessed;

            return (
              <motion.div key={e.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.4 }} className="h-full">
                <CourseCard
                  course={{
                    id: e.course.id,
                    title: e.course.title,
                    subtitle: e.course.subtitle,
                    thumbnail: e.course.thumbnail,
                    instructor: e.course.instructor ? `${e.course.instructor.firstName} ${e.course.instructor.lastName}` : undefined,
                    rating: e.course.averageRating,
                    reviewCount: e.course.reviewCount,
                    difficulty: e.course.difficulty || undefined,
                    studentCount: e.course._count.enrollments,
                    isEnrolled: true,
                    progress: progress,
                  }}
                  stats={
                    <div className="w-full space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Progress</span>
                        <span className="font-bold">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      {lastAccessed && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          Last accessed: {new Date(lastAccessed).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  }
                  headerBadge={
                    isCompleted && (
                      <span className="bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-1 rounded-full text-xs font-bold">
                        <Award className="w-3 h-3 mr-1 inline" />
                        Completed
                      </span>
                    )
                  }
                  actions={
                    <div className="flex gap-2 w-full">
                      <Button 
                        asChild 
                        size="sm" 
                        className={cn(
                          "rounded-lg font-bold shadow-sm flex-1",
                          isCompleted ? "bg-green-600 hover:bg-green-700" : "bg-primary"
                        )}
                      >
                        <Link to={`/student/course/${e.course.id}/learn`}>
                          {isCompleted ? "Review Content" : "Continue Learning"}
                        </Link>
                      </Button>
                      {isCompleted && certificate && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="rounded-lg border-green-500/30 text-green-600 hover:bg-green-500/10 flex gap-2 backdrop-blur-sm"
                          onClick={async () => {
                            setDownloadingId(certificate.certificateId);
                            console.log("🎯 DOWNLOADING CERTIFICATE FROM MY COURSES");
                            console.log("📋 Certificate ID:", certificate.certificateId);
                            console.log("📚 Course:", e.course.title);
                            
                            try {
                              // Get JWT token
                              const token = localStorage.getItem("lms_token");
                              if (!token) {
                                throw new Error("Authentication required");
                              }

                              // Fetch the certificate as BLOB
                              const response = await fetch(`/api/certificates/download/${certificate.certificateId}`, {
                                headers: {
                                  'Authorization': `Bearer ${token}`
                                }
                              });

                              console.log("📡 Response status:", response.status);

                              if (!response.ok) {
                                const errorText = await response.text();
                                console.error("❌ Download error:", response.status, errorText);
                                throw new Error(`Download failed: ${response.status} ${response.statusText}`);
                              }

                              // Create BLOB from response
                              const blob = await response.blob();
                              console.log("✅ Certificate blob created, size:", blob.size, "bytes");

                              if (blob.size === 0) {
                                throw new Error("Downloaded file is empty");
                              }

                              // Create download link
                              const urlBlob = window.URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = urlBlob;
                              a.download = `THE_GATE_HUB_Certificate_${e.course.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
                              document.body.appendChild(a);
                              a.click();
                              
                              // Cleanup
                              setTimeout(() => {
                                document.body.removeChild(a);
                                window.URL.revokeObjectURL(urlBlob);
                              }, 100);
                              
                              toast({ title: "Certificate downloaded successfully!", variant: "success" });
                            } catch (err: any) {
                              console.error("❌ Certificate download error:", err);
                              toast({ 
                                title: "Download failed", 
                                description: err.message || "Please try again later", 
                                variant: "destructive" 
                              });
                            } finally {
                              setDownloadingId(null);
                            }
                          }}
                          disabled={downloadingId === certificate.certificateId}
                        >
                          {downloadingId === certificate.certificateId ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                      {isCompleted && certificate && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="rounded-lg border-blue-500/30 text-blue-600 hover:bg-blue-500/10 flex gap-2 backdrop-blur-sm"
                          onClick={async () => {
                            console.log("👁️ PREVIEWING CERTIFICATE FROM MY COURSES:", certificate.certificateId);
                            
                            try {
                              const previewUrl = `/api/certificates/preview/${certificate.certificateId}`;
                              const previewWindow = window.open(previewUrl, '_blank', 'width=900,height=700,scrollbars=yes');
                              
                              if (!previewWindow) {
                                throw new Error("Popup blocked. Please allow popups for this site.");
                              }
                              
                              toast({ title: "Certificate preview opened", variant: "success" });
                            } catch (err: any) {
                              console.error("❌ Certificate preview error:", err);
                              toast({ 
                                title: "Preview failed", 
                                description: err.message || "Please try again later", 
                                variant: "destructive" 
                              });
                            }
                          }}
                        >
                          <Eye className="w-4 h-4" />
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
