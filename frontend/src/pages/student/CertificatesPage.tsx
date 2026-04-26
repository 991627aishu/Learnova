import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Download, Calendar, GraduationCap, Award, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToastStore } from "@/store/toastStore";


interface Certificate {
  id: string;
  certificateId: string;
  issuedAt: string;
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
    queryKey: ["my-certificates"],
    queryFn: async () => {
      const res = await api<{ certificates: Certificate[] }>("/certificates/my");
      if (res.error) throw new Error(res.error);
      return res.data!;
    },
  });

  const certificates = data?.certificates ?? [];

  const handleDownload = async (courseId: string, courseTitle: string) => {
    setDownloadingId(courseId);
    try {
      const authStoreStr = localStorage.getItem("lms-auth");
      let token = "";
      if (authStoreStr) {
        const parsed = JSON.parse(authStoreStr);
        token = parsed?.state?.token || "";
      }

      const response = await fetch(`/api/certificates/course/${courseId}/generate`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to download certificate");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Certificate_${courseTitle.replace(/\s+/g, '_')}.pdf`;
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
          {certificates.map((cert) => (
            <Card key={cert.id} className="group overflow-hidden border-border/40 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 flex flex-col">
              <div className="aspect-[16/10] relative overflow-hidden flex items-center justify-center bg-slate-950">
                <img 
                  src={cert.course.thumbnail || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60"} 
                  className="max-h-full max-w-full object-contain transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100"
                  alt={cert.course.title}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-center gap-2 text-white/90 text-xs font-bold uppercase tracking-widest mb-1">
                    <Calendar className="w-3 h-3" />
                    Issued {new Date(cert.issuedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                  </div>
                  <h3 className="text-white font-black text-lg leading-tight line-clamp-2">{cert.course.title}</h3>
                </div>
                <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-primary/90 backdrop-blur-sm flex items-center justify-center text-white shadow-lg">
                  <Trophy className="w-5 h-5" />
                </div>
              </div>
              <CardContent className="p-5 flex-1 flex flex-col justify-between gap-4">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                  <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full">ID: {cert.certificateId}</span>
                </div>
                
                <Button 
                  className="w-full h-12 rounded-xl font-bold shadow-lg shadow-primary/10 gap-2 group-hover:translate-y-[-2px] transition-all"
                  onClick={() => handleDownload(cert.course.id, cert.course.title)}
                  disabled={downloadingId === cert.course.id}
                >
                  {downloadingId === cert.course.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {downloadingId === cert.course.id ? "Generating PDF..." : "Download Certificate"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
