import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Download, Calendar, GraduationCap, Award, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToastStore } from "@/store/toastStore";

interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  enrolledAt: string;
  completedAt: string | null;
  isCompleted: boolean;
  course: {
    id: string;
    title: string;
    thumbnail?: string | null;
  };
}

export function CertificatesPage() {
  const toast = useToastStore((s) => s.add);

  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["my-enrollments"],
    queryFn: async () => {
      const res = await api<{ enrollments: Enrollment[] }>("/enrollments/my");
      if (res.error) throw new Error(res.error);
      return res.data!;
    },
  });

  // Filter only completed enrollments for certificates
  const certificates = data?.enrollments?.filter(enrollment => enrollment.isCompleted && enrollment.completedAt) ?? [];

  const handleDownload = async (enrollment: Enrollment) => {
    setDownloadingId(enrollment.id);
    console.log("🔥 DOWNLOADING CERTIFICATE");
    console.log("📋 Enrollment ID:", enrollment.id);
    console.log("📚 Course:", enrollment.course.title);
    
    try {
      // Get JWT token
      const token = localStorage.getItem("lms_token");
      if (!token) {
        throw new Error("Authentication required");
      }

      // Fetch the certificate as BLOB using the new API endpoint
      const response = await fetch(`/api/certificates/download/${enrollment.id}`, {
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
      a.download = `GATEHUB_Certificate_${enrollment.course.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
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
  };


  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Award className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-4xl font-bold font-display text-foreground tracking-tight">Certificates</h1>
          </div>
          <p className="text-muted-foreground text-lg font-medium">Your earned achievements and professional credentials</p>
        </div>
        
        {certificates.length > 0 && (
          <div className="bg-card/50 backdrop-blur-sm border border-border/50 px-6 py-3 rounded-2xl flex items-center gap-4 shadow-sm">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest font-black text-muted-foreground/60">Total Earned</span>
              <span className="text-xl font-black text-foreground">{certificates.length}</span>
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse h-64 bg-card/30" />
          ))}
        </div>
      ) : certificates.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent">
          <CardContent className="p-24 text-center flex flex-col items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center">
              <GraduationCap className="w-10 h-10 text-muted-foreground/40" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-foreground">No certificates yet</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Complete your enrolled courses to 100% and pass the final assessments to earn your official certificates.
              </p>
            </div>
            <Button variant="outline" className="mt-4 rounded-xl px-8 h-12 font-bold" asChild>
              <a href="/student/browse">Browse Courses</a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {certificates.map((enrollment) => (
            <Card key={enrollment.id} className="group overflow-hidden border-border/40 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 flex flex-col backdrop-blur-sm bg-card/80">
              <div className="aspect-[16/10] relative overflow-hidden flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
                <img 
                  src={enrollment.course.thumbnail || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60"} 
                  className="max-h-full max-w-full object-contain transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100"
                  alt={enrollment.course.title}
                  onError={(e) => {
                    // Fallback to default image if thumbnail fails to load
                    const target = e.target as HTMLImageElement;
                    if (!target.src.includes("unsplash.com")) {
                      target.src = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60";
                    }
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-center gap-2 text-white/90 text-xs font-bold uppercase tracking-widest mb-1">
                    <Calendar className="w-3 h-3" />
                    Completed {new Date(enrollment.completedAt!).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                  </div>
                  <h3 className="text-white font-black text-lg leading-tight line-clamp-2">{enrollment.course.title}</h3>
                </div>
                <div className="absolute top-4 right-4 w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 backdrop-blur-sm flex items-center justify-center text-white shadow-lg border border-white/20">
                  <Trophy className="w-6 h-6" />
                </div>
                {/* Glassmorphism overlay */}
                <div className="absolute inset-0 bg-white/5 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <CardContent className="p-5 flex-1 flex flex-col justify-between gap-4 backdrop-blur-sm bg-gradient-to-br from-white/5 to-transparent">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">
                  <span className="bg-gradient-to-r from-primary/20 to-primary/10 text-primary border border-primary/20 px-2 py-1 rounded-full backdrop-blur-sm">ID: {enrollment.id}</span>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    className="w-full h-11 rounded-xl font-bold shadow-lg shadow-primary/10 gap-2 group-hover:translate-y-[-2px] transition-all duration-300 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary"
                    onClick={() => handleDownload(enrollment)}
                    disabled={downloadingId === enrollment.id}
                  >
                    {downloadingId === enrollment.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    {downloadingId === enrollment.id ? "Generating..." : "Download Certificate"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
