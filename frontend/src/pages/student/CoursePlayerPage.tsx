import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight, Play, Download, CheckCircle, HelpCircle, ArrowLeft, Lock, FileText, Loader2, VideoOff, AlertCircle, Settings, Info } from "lucide-react";
import ReactPlayer from "react-player";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import { Star } from "lucide-react";

// --- VIDEO UTILS ---
const isYouTube = (url: string) => {
  return url.includes("youtube.com") || url.includes("youtu.be");
};

const isVimeo = (url: string) => {
  return url.includes("vimeo.com");
};

const isDirectVideoFile = (url: string) => {
  const commonExtensions = [".mp4", ".webm", ".ogg", ".mov", "/uploads/"];
  return commonExtensions.some(ext => url.toLowerCase().includes(ext));
};

const formatYouTubeUrl = (url: string) => {
  if (!isYouTube(url)) return url;
  try {
    const urlObj = new URL(url);
    let videoId = "";
    if (url.includes("youtu.be/")) {
      videoId = urlObj.pathname.substring(1);
    } else if (url.includes("youtube.com/embed/")) {
      return url; // Already in embed format
    } else {
      videoId = urlObj.searchParams.get("v") || "";
    }
    
    if (!videoId && url.includes("youtube.com/watch")) {
       // Handle cases where v= might be missing but ID is in path or other params
       videoId = urlObj.searchParams.get("v") || "";
    }

    return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0` : url;
  } catch (e) {
    return url;
  }
};

interface Lecture {
  id: string;
  title: string;
  type: string;
  videoUrl?: string | null;
  duration?: number | null;
  content?: string | null;
  quizId?: string | null;
  quiz?: any;
  attachments: Array<{ id: string; name: string; url: string; type: string }>;
}

interface Section {
  id: string;
  title: string;
  order: number;
  lectures: Lecture[];
}

interface CourseData {
  course: {
    id: string;
    title: string;
    sections: Section[];
  };
  progress: { percent: number; lectureProgress: Array<{ lectureId: string; completed: boolean }> } | null;
}

export function CoursePlayerPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [currentLecture, setCurrentLecture] = useState<Lecture | null>(null);
  const [isVideoBuffering, setIsVideoBuffering] = useState(false);
  const [isVideoError, setIsVideoError] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const toast = useToastStore((s) => s.add);
  const { user } = useAuthStore();
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [isDownloadingCertificate, setIsDownloadingCertificate] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  // Quiz State
  const [currentQuiz, setCurrentQuiz] = useState<any>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, any>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizResult, setQuizResult] = useState<{ score: number, totalMarks: number, results: any[] } | null>(null);

  // 1. Query Course Data (for all users - no enrollment check)
  const { data: courseData, isLoading: courseLoading } = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const res = await api<any>(`/courses/${courseId}`);
      if (res.error) throw new Error(res.error);
      return res.data.course;
    },
    enabled: !!courseId,
  });

  // 2. Query Enrollment Data (only for logged-in users)
  const { data: enrollmentData, isLoading: enrollmentLoading } = useQuery({
    queryKey: ["enrollment", courseId, "progress"],
    queryFn: async () => {
      const res = await api<{ enrollment: { course: CourseData["course"]; progress: CourseData["progress"] } }>(`/enrollments/${courseId}/progress`);
      if (res.error) return null;
      const enc = (res.data as { enrollment?: { course: CourseData["course"]; progress: CourseData["progress"] } })?.enrollment;
      return enc ? { course: enc.course, progress: enc.progress ?? null } as CourseData : null;
    },
    enabled: !!courseId && !!user,
  });

  const isLoading = courseLoading || (user && enrollmentLoading);
  const data = enrollmentData; // Use enrolled data if available, otherwise null
  const isEnrolled = !!enrollmentData;

  const { data: reviewsData, refetch: refetchReviews } = useQuery({
    queryKey: ["reviews", courseId],
    queryFn: async () => {
      const res = await api<{ reviews: any[] }>(`/reviews?courseId=${courseId}`);
      if (res.error) return { reviews: [] };
      return res.data!;
    },
    enabled: !!courseId,
  });

  const hasReviewed = reviewsData?.reviews?.some((r: any) => r.user?.id === user?.id);

  useEffect(() => {
    if (data?.progress?.percent === 100 && reviewsData && !hasReviewed) {
      setShowReviewModal(true);
    }
  }, [data?.progress?.percent, hasReviewed, reviewsData]);

  // 2. Computed Values
  const currentCourse = data?.course || courseData;
  const allLectures = currentCourse?.sections?.flatMap((s) => s.lectures) ?? [];
  const firstLecture = allLectures[0];
  const isCourseCompleted = data?.progress?.percent === 100;

  // 3. Access Control Logic
  const canViewFullContent = isEnrolled;
  const canViewFirstLecture = !user || isEnrolled; // Everyone can see first lecture preview
  const canViewPartialNotes = user && !isEnrolled; // Logged in but not enrolled can see partial notes
  
  // If course is 100% and no specific lecture is active, or if we want to show completion UI
  const [showCompletionUI, setShowCompletionUI] = useState(false);

  useEffect(() => {
    if (isCourseCompleted && !currentLecture) {
      setShowCompletionUI(true);
    }
  }, [isCourseCompleted, currentLecture]);

  const activeLecture = currentLecture ?? (showCompletionUI ? null : firstLecture);

  // 4. Access Control UI Components
  const EnrollPrompt = ({ title, description }: { title: string; description: string }) => (
    <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
      <CardContent className="p-6 text-center">
        <Lock className="w-12 h-12 text-amber-600 dark:text-amber-400 mx-auto mb-4" />
        <h3 className="font-bold text-lg mb-2">{title}</h3>
        <p className="text-muted-foreground mb-4">{description}</p>
        <Button 
          onClick={() => navigate(`/course/${courseId}`)}
          className="bg-amber-600 hover:bg-amber-700 text-white"
        >
          Enroll to Unlock Full Content
        </Button>
      </CardContent>
    </Card>
  );
  
  // Debug Log
  useEffect(() => {
    if (activeLecture) {
      console.log("[PLAYER_DEBUG] Active Lecture:", {
        id: activeLecture.id,
        title: activeLecture.title,
        type: activeLecture.type,
        videoUrl: activeLecture.videoUrl,
        isYT: activeLecture.videoUrl ? isYouTube(activeLecture.videoUrl) : false,
        isVimeo: activeLecture.videoUrl ? isVimeo(activeLecture.videoUrl) : false,
        isDirect: activeLecture.videoUrl ? isDirectVideoFile(activeLecture.videoUrl) : false,
      });
    }
  }, [activeLecture?.id]);

  const currentIndex = activeLecture ? allLectures.findIndex((l) => l.id === activeLecture.id) : -1;
  const nextLecture = currentIndex >= 0 && currentIndex < allLectures.length - 1 ? allLectures[currentIndex + 1] : null;

  const playerRef = useRef<ReactPlayer>(null);
  const [playbackRate, setPlaybackRate] = useState(1);

  // Reset video states upon lecture change
  useEffect(() => {
    setIsVideoBuffering(false);
    setIsVideoError(false);
    setPlayerReady(false);
  }, [activeLecture?.id]);

  // 3. Effects
  useEffect(() => {
    async function fetchQuiz() {
      if (activeLecture?.type === "quiz" && activeLecture?.id) {
        try {
          const res = await api<any>(`/lectures/${activeLecture.id}/quiz`);
          if (!res.error && res.data?.quiz) {
             setCurrentQuiz(res.data.quiz);
          } else {
             setCurrentQuiz(null);
          }
        } catch(e) {
          setCurrentQuiz(null);
        }
      } else {
        setCurrentQuiz(null);
      }
    }
    fetchQuiz();
  }, [activeLecture?.id, activeLecture?.type]);

  useEffect(() => {
    if (activeLecture?.type === "notes" && activeLecture.content) {
      const fetchPdf = async () => {
        setIsPdfLoading(true);
        setPdfError(null);
        try {
          const authStoreStr = localStorage.getItem("lms-auth");
          let token = "";
          if (authStoreStr) {
            const parsed = JSON.parse(authStoreStr);
            token = parsed?.state?.token || "";
          }

          const res = await fetch("/api/latex/compile", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ 
              code: activeLecture.content || " ", 
              projectId: activeLecture.videoUrl || undefined 
            })
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || errData.logs || "Failed to load PDF notes");
          }

          const data = await res.json();
          if (!data.success || !data.pdfBase64) {
             throw new Error(data.error || data.logs || "Compilation failed, no PDF generated.");
          }

          const resBlob = await fetch(`data:application/pdf;base64,${data.pdfBase64}`);
          const blob = await resBlob.blob();
          const url = URL.createObjectURL(blob);
          
          setPdfUrl(prev => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
        } catch(e: any) {
           setPdfError(e.message);
        } finally {
           setIsPdfLoading(false);
        }
      };
      fetchPdf();
    } else {
      setPdfUrl(null);
    }
  }, [activeLecture?.id, activeLecture?.content, activeLecture?.type]);

  useEffect(() => {
    const firstId = data?.course?.sections?.[0]?.id;
    if (firstId) setOpenSections((s) => (s[firstId] !== false ? s : { ...s, [firstId]: true }));
  }, [data?.course?.sections]);

  useEffect(() => {
    if (activeLecture && (activeLecture.type === "notes" || activeLecture.type === "file" || activeLecture.type === "article")) {
      const isCompleted = data?.progress?.lectureProgress?.some((p) => p.lectureId === activeLecture.id && p.completed);
      if (!isCompleted) {
        updateProgress.mutate({ lectureId: activeLecture.id, completed: true, progressPercent: 100 });
      }
    }
  }, [activeLecture?.id]);

  // 4. Handlers & Mutations
  const updateProgress = useMutation({
    mutationFn: async ({ lectureId, completed, progressPercent, autoNext }: { lectureId: string; completed?: boolean; progressPercent?: number; autoNext?: boolean }) => {
      const res = await api(`/enrollments/${courseId}/lectures/${lectureId}/progress`, {
        method: "PATCH",
        body: { completed: completed ?? false, progressPercent: progressPercent ?? 0 },
      });
      if (res.error) throw new Error(res.error);
      return { autoNext };
    },
    onSuccess: (resData) => {
      queryClient.invalidateQueries({ queryKey: ["enrollment", courseId] });
      if (resData.autoNext) {
        if (nextLecture) {
          setCurrentLecture(nextLecture);
          setQuizAnswers({});
          setQuizSubmitted(false);
          setQuizResult(null);
        } else {
          // No next lecture, course is potentially 100% completed
          setShowCompletionUI(true);
          setCurrentLecture(null);
        }
      }
    },
  });

  const toggleSection = (sectionId: string) => setOpenSections((s) => ({ ...s, [sectionId]: !s[sectionId] }));

  const handleDownloadCertificate = async () => {
    if (!courseId) return;
    setIsDownloadingCertificate(true);
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
        const err = await response.json();
        throw new Error(err.error || "Failed to download certificate");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Certificate_${data?.course.title.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({ title: "Certificate downloaded!", variant: "success" });
    } catch (err: any) {
      toast({ title: "Download failed", description: err.message, variant: "destructive" });
    } finally {
      setIsDownloadingCertificate(false);
    }
  };

  if (!courseId || isLoading || !data?.course) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-muted-foreground flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="font-bold tracking-widest uppercase text-xs">Loading Course Content...</p>
        </div>
      </div>
    );
  }

  const renderVideoPlayer = () => {
    const rawUrl = activeLecture?.videoUrl?.trim() || "";
    if (!rawUrl) return null;

    const formattedUrl = isYouTube(rawUrl) ? formatYouTubeUrl(rawUrl) : rawUrl;

    if (isDirectVideoFile(rawUrl)) {
      // For uploaded videos, ensure we use the full API URL if it's a relative path
      const videoSrc = rawUrl.startsWith('http') ? rawUrl : `${window.location.origin}/api${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
      
      return (
        <video 
          key={videoSrc}
          controls 
          autoPlay 
          className="w-full h-full object-contain"
          onEnded={() => updateProgress.mutate({ lectureId: activeLecture!.id, completed: true, progressPercent: 100, autoNext: true })}
          onError={(e) => {
            console.error("[NATIVE_VIDEO_ERROR]", e);
            setIsVideoError(true);
          }}
          onCanPlay={() => {
            console.log("[NATIVE_VIDEO_READY]", videoSrc);
            setPlayerReady(true);
          }}
          onLoadStart={() => {
            console.log("[NATIVE_VIDEO_LOADING]", videoSrc);
            setPlayerReady(false);
          }}
        >
          <source src={videoSrc} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      );
    }

    return (
      <ReactPlayer
        key={formattedUrl}
        ref={playerRef}
        url={formattedUrl}
        width="100%"
        height="100%"
        playing={true}
        controls={true}
        playbackRate={playbackRate}
        onReady={() => {
          console.log("[REACT_PLAYER_READY]", formattedUrl);
          setPlayerReady(true);
          setIsVideoBuffering(false);
        }}
        onStart={() => {
          console.log("[REACT_PLAYER_START]", formattedUrl);
          setPlayerReady(true);
          setIsVideoBuffering(false);
        }}
        onBuffer={() => setIsVideoBuffering(true)}
        onBufferEnd={() => setIsVideoBuffering(false)}
        onError={(e) => {
          console.error("[REACT_PLAYER_ERROR]", e, formattedUrl);
          setIsVideoError(true);
        }}
        onEnded={() => updateProgress.mutate({ lectureId: activeLecture!.id, completed: true, progressPercent: 100, autoNext: true })}
        config={{
          youtube: {
            playerVars: { 
              autoplay: 1, 
              modestbranding: 1, 
              rel: 0,
              showinfo: 0,
              controls: 1,
              origin: window.location.origin
            }
          },
          file: {
            attributes: {
              controlsList: "nodownload",
              onContextMenu: (e: any) => e.preventDefault(),
              crossOrigin: "anonymous",
              style: { width: '100%', height: '100%', objectFit: 'contain' }
            }
          }
        }}
      />
    );
  };

  return (
    <div className="flex flex-col xl:flex-row h-screen w-full overflow-hidden bg-background">
      {/* Left: Curriculum */}
      <aside className="w-full xl:w-80 shrink-0 border-r border-border/50 bg-card/30 overflow-hidden flex flex-col max-h-[400px] xl:max-h-none">
        <div className="p-4 border-b flex items-center justify-between bg-card/50">
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors px-0"
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate("/student");
              }
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowDebug(!showDebug)} className={cn(showDebug && "text-primary bg-primary/10")}>
            <Info className="w-4 h-4" />
          </Button>
        </div>
        <div className="p-4 border-b flex justify-between items-center bg-card/50">
          <div className="flex flex-col">
            <span className="font-bold text-foreground">Course Content</span>
            <div className="flex items-center gap-2">
               <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{data.progress?.percent ?? 0}% completed</span>
               {isCourseCompleted && (
                 <span className="px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600 text-[8px] font-bold uppercase tracking-tighter border border-green-500/20">
                    Completed
                 </span>
               )}
            </div>
          </div>
          {data.progress?.percent === 100 && (
            <Button 
              size="sm" 
              variant="outline"
              className="h-8 gap-1.5 border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary/40 transition-all text-[11px] font-bold"
              onClick={handleDownloadCertificate}
              disabled={isDownloadingCertificate}
            >
              {isDownloadingCertificate ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <CheckCircle className="w-3 h-3" />
              )}
              {isDownloadingCertificate ? "Generating..." : "Get Certificate"}
            </Button>
          )}
        </div>
        <div className="overflow-y-auto flex-1 p-2">
          {isCourseCompleted && (
            <button
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-bold mb-4 transition-all duration-200",
                showCompletionUI 
                  ? "bg-green-500/10 border-l-2 border-green-500 text-green-700 dark:text-green-400 shadow-sm" 
                  : "text-muted-foreground hover:bg-green-500/5 hover:text-green-600"
              )}
              onClick={() => {
                setShowCompletionUI(true);
                setCurrentLecture(null);
              }}
            >
              <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center">
                 <Star className={cn("h-3.5 w-3.5", showCompletionUI ? "fill-green-500" : "")} />
              </div>
              Course Completion
            </button>
          )}
          {data.course.sections.map((section) => (
            <div key={section.id}>
              <button
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-foreground hover:bg-muted/50"
                onClick={() => toggleSection(section.id)}
              >
                {openSections[section.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                {section.title}
              </button>
              <AnimatePresence>
                {openSections[section.id] !== false && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                    {section.lectures.map((lec, lectureIndex) => {
                      const isCompleted = data?.progress?.lectureProgress?.some((p) => p.lectureId === lec.id && p.completed);
                      const isActive = activeLecture?.id === lec.id;
                      
                      // Access Control Logic
                      const isFirstLecture = section.order === 1 && lectureIndex === 0;
                      let isLocked = false;
                      
                      if (!user) {
                        // Not logged in: only first lecture preview
                        isLocked = !isFirstLecture;
                      } else if (!isEnrolled) {
                        // Logged in but not enrolled: only first lecture preview
                        isLocked = !isFirstLecture;
                      }
                      // Enrolled users: no restrictions

                      let Icon = Play;
                      let iconColor = "text-slate-400";

                      if (isCompleted) {
                        Icon = CheckCircle;
                        iconColor = "text-green-500";
                      } else if (isLocked) {
                        Icon = Lock;
                        iconColor = "text-slate-500/50";
                      } else if (lec.type === "video") {
                        Icon = Play;
                        iconColor = isActive ? "text-primary" : "text-blue-500/70";
                      } else if (lec.type === "quiz") {
                        Icon = HelpCircle;
                        iconColor = isActive ? "text-primary" : "text-purple-500/70";
                      } else {
                        Icon = FileText;
                        iconColor = isActive ? "text-primary" : "text-orange-500/70";
                      }

                      return (
                        <button
                          key={lec.id}
                          disabled={isLocked && !isCompleted}
                          className={cn(
                            "group flex w-full items-center gap-3 rounded-lg py-2.5 pl-8 pr-3 text-left text-sm transition-all duration-200 cursor-pointer",
                            isActive 
                              ? "bg-primary/10 border-l-2 border-primary text-primary font-medium" 
                              : isLocked && !isCompleted
                                ? "text-muted-foreground/60 cursor-not-allowed"
                                : "text-muted-foreground hover:bg-muted/50 hover:translate-x-1"
                          )}
                          onClick={() => {
                            if (isLocked && !isCompleted) return;
                            setCurrentLecture(lec);
                            setShowCompletionUI(false);
                            setQuizAnswers({});
                            setQuizSubmitted(false);
                            setQuizResult(null);
                          }}
                        >
                          <Icon className={cn("h-4 w-4 shrink-0 transition-colors", iconColor, isActive && !isCompleted && "animate-pulse")} />
                          <span className="truncate flex-1">{lec.title}</span>
                          {lec.duration && (
                            <span className="text-xs text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity">
                              {Math.round(lec.duration / 60)}m
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </aside>

      {/* Center: Video / Content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-background relative">
        {/* Debug UI Overlay */}
        {showDebug && (
          <div className="absolute top-4 left-4 z-[100] bg-black/90 text-white p-4 rounded-xl border border-white/20 text-[10px] font-mono max-w-md pointer-events-none">
            <p className="text-primary font-bold mb-2 uppercase tracking-widest">Player Debug Info</p>
            <p>Course ID: {courseId}</p>
            <p>Lecture ID: {activeLecture?.id}</p>
            <p>Type: {activeLecture?.type}</p>
            <p className="break-all">URL: {activeLecture?.videoUrl || "NULL"}</p>
            <p>Format: {activeLecture?.videoUrl ? (isYouTube(activeLecture.videoUrl) ? "YouTube" : isDirectVideoFile(activeLecture.videoUrl) ? "Direct File" : "Other") : "N/A"}</p>
            <p>Ready: {playerReady ? "YES" : "NO"}</p>
            <p>Error: {isVideoError ? "YES" : "NO"}</p>
            <p>Show Completion UI: {showCompletionUI ? "YES" : "NO"}</p>
          </div>
        )}

        {showCompletionUI ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-900 overflow-y-auto">
             <div className="max-w-2xl w-full space-y-8 text-center">
                <div className="flex flex-col items-center space-y-4">
                   <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center animate-bounce">
                      <CheckCircle className="w-12 h-12 text-primary" />
                   </div>
                   <h1 className="text-4xl font-extrabold text-foreground tracking-tight">Congratulations!</h1>
                   <p className="text-xl text-muted-foreground">You've successfully completed the course.</p>
                </div>

                <Card className="border-2 border-primary/20 shadow-xl overflow-hidden bg-card/50 backdrop-blur-sm">
                   <CardContent className="p-8 space-y-6">
                      <div className="space-y-2">
                         <h2 className="text-2xl font-bold">{data.course.title}</h2>
                         <p className="text-sm text-muted-foreground uppercase tracking-widest font-semibold">with Instructor {data.course.sections[0]?.lectures[0]?.content ? "Team" : "Instructor"}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                         <Button 
                            size="lg" 
                            variant="default"
                            className="h-14 text-lg font-bold gap-2 shadow-lg hover:scale-[1.02] transition-all"
                            onClick={handleDownloadCertificate}
                            disabled={isDownloadingCertificate}
                         >
                            {isDownloadingCertificate ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                            {isDownloadingCertificate ? "Generating..." : "Download Certificate"}
                         </Button>
                         <Button 
                            size="lg" 
                            variant="outline"
                            className="h-14 text-lg font-bold gap-2 border-2 hover:bg-muted/50"
                            onClick={() => {
                              if (allLectures.length > 0) {
                                setCurrentLecture(allLectures[0]);
                                setShowCompletionUI(false);
                              }
                            }}
                         >
                            <ArrowLeft className="w-5 h-5" />
                            Review Lectures
                         </Button>
                      </div>
                   </CardContent>
                </Card>

                {/* Integrated Review Section */}
                <div className="space-y-6 pt-8">
                   <h3 className="text-xl font-bold">How was your experience?</h3>
                   {hasReviewed ? (
                     <div className="p-6 bg-green-500/5 border border-green-500/10 rounded-2xl flex flex-col items-center gap-2">
                        <Star className="w-8 h-8 fill-green-500 text-green-500" />
                        <p className="text-green-700 dark:text-green-400 font-medium">Thank you for your feedback! You've already reviewed this course.</p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            // Find current review data to prepopulate
                            const myReview = reviewsData?.reviews?.find((r: any) => r.user?.id === user?.id);
                            if (myReview) {
                              setRating(myReview.rating);
                              setReviewText(myReview.reviewText || "");
                            }
                            setShowReviewModal(true);
                          }} 
                          className="mt-2"
                        >
                          Edit Review
                        </Button>
                     </div>
                   ) : (
                     <Card className="border-dashed border-2">
                        <CardContent className="p-6 space-y-4">
                           <div className="flex justify-center gap-2">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button key={star} onClick={() => setRating(star)} className="focus:outline-none transition-transform hover:scale-125 active:scale-95">
                                  <Star className={cn("w-8 h-8", rating >= star ? "fill-yellow-500 text-yellow-500" : "text-slate-300 dark:text-foreground/20")} />
                                </button>
                              ))}
                           </div>
                           <Textarea 
                              placeholder="What did you like about this course? What can we improve?" 
                              value={reviewText} 
                              onChange={(e) => setReviewText(e.target.value)} 
                              className="min-h-[100px] bg-background/50"
                           />
                           <Button 
                              disabled={rating === 0 || isSubmittingReview} 
                              onClick={async () => {
                                setIsSubmittingReview(true);
                                const res = await api(`/reviews`, { method: "POST", body: { courseId, rating, reviewText } });
                                setIsSubmittingReview(false);
                                if (res.error) toast({ title: "Failed to submit review", description: res.error, variant: "destructive" });
                                else {
                                  toast({ title: "Review submitted successfully!", variant: "success" });
                                  refetchReviews();
                                  queryClient.invalidateQueries({ queryKey: ["courses"] });
                                }
                              }}
                              className="w-full"
                           >
                              {isSubmittingReview ? "Submitting..." : "Submit Review"}
                           </Button>
                        </CardContent>
                     </Card>
                   )}
                </div>
             </div>
          </div>
        ) : activeLecture?.type === "video" ? (
          <div className="flex-1 flex flex-col bg-slate-950 relative">
            <div className="flex-1 w-full relative bg-black flex items-center justify-center">
              {/* Access Control: Check if user can view this video */}
              {(() => {
                const isFirstLecture = currentCourse?.sections?.[0]?.lectures?.[0]?.id === activeLecture.id;
                if (!user) {
                  // Not logged in - only first lecture preview
                  if (!isFirstLecture) {
                    return (
                      <EnrollPrompt 
                        title="Preview Available" 
                        description="Sign up to access this lecture and the full course content."
                      />
                    );
                  }
                } else if (!isEnrolled) {
                  // Logged in but not enrolled - only first lecture preview
                  if (!isFirstLecture) {
                    return (
                      <EnrollPrompt 
                        title="Enroll to Continue" 
                        description="Enroll in this course to access all lectures and materials."
                      />
                    );
                  }
                }
                // User can view this content
                return null;
              })()}

              {/* Show video player if user has access */}
              {((!user && currentCourse?.sections?.[0]?.lectures?.[0]?.id === activeLecture.id) || isEnrolled) && (
                <>
                  {isVideoError || !activeLecture.videoUrl ? (
                    <div className="flex flex-col items-center justify-center text-muted-foreground gap-4 z-20">
                      <VideoOff className="w-16 h-16 text-destructive/80" />
                      <p className="text-xl font-bold text-slate-300">
                        {!activeLecture.videoUrl ? "No video URL provided." : "Video failed to load."}
                      </p>
                      {isVideoError && (
                        <>
                          <p className="text-sm text-center max-w-md">The video source may be invalid or restricted. Check the URL below.</p>
                          <Button variant="outline" onClick={() => { setIsVideoError(false); setPlayerReady(false); }}>
                            Retry Player
                          </Button>
                        </>
                      )}
                      {activeLecture.videoUrl && (
                        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-[10px] max-w-sm break-all font-mono">
                          URL: {activeLecture.videoUrl}
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="absolute inset-0 z-10 w-full h-full">
                        {renderVideoPlayer()}
                        
                        {/* Instant Loading Overlay */}
                        {!playerReady && !isVideoError && (
                          <div className="absolute inset-0 bg-black flex flex-col items-center justify-center gap-4 z-30">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <span className="text-white text-sm">Loading video...</span>
                          </div>
                        )}
                        
                        {/* Buffering Overlay */}
                        {isVideoBuffering && playerReady && (
                          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-4 z-30">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <span className="text-white text-sm">Buffering...</span>
                          </div>
                        )}
                      </div>

                      {/* Video Controls Overlay */}
                      <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center justify-between">
                        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPlaybackRate(prev => prev === 2 ? 0.5 : prev + 0.25)}
                            className="text-white hover:bg-white/20 h-6 px-2 text-xs font-mono"
                          >
                            {playbackRate}x
                          </Button>
                        </div>
                        
                        {/* Next Lecture Button */}
                        {nextLecture && isEnrolled && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setCurrentLecture(nextLecture);
                              setShowCompletionUI(false);
                            }}
                            className="bg-primary/90 hover:bg-primary text-white h-8 px-3 text-xs font-medium"
                          >
                            Next
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        ) : activeLecture?.type === "quiz" ? (
          <div className="flex-1 overflow-auto p-8 bg-white dark:bg-slate-950">
            <h2 className="text-3xl font-bold mb-6">{activeLecture?.title}</h2>
            
            {/* Access Control for Quiz Content */}
            {(() => {
              const isFirstLecture = currentCourse?.sections?.[0]?.lectures?.[0]?.id === activeLecture.id;
              if (!user) {
                // Not logged in - only first lecture preview
                if (!isFirstLecture) {
                  return (
                    <EnrollPrompt 
                      title="Quiz Preview Available" 
                      description="Sign up to access this quiz and full course content."
                    />
                  );
                }
              } else if (!isEnrolled) {
                // Logged in but not enrolled - only first lecture preview
                if (!isFirstLecture) {
                  return (
                    <EnrollPrompt 
                      title="Enroll to Take Quiz" 
                      description="Enroll in this course to access all quizzes and assessments."
                    />
                  );
                }
              }
              // User can view this content
              return null;
            })()}
            
            {currentQuiz && ((isEnrolled) || (!user && currentCourse?.sections?.[0]?.lectures?.[0]?.id === activeLecture.id)) ? (
              <div className="max-w-3xl space-y-8">
                {currentQuiz.questions?.map((q: any, i: number) => (
                  <Card key={q.id} className="border-2 shadow-sm">
                    <CardContent className="p-6">
                      <div className="flex gap-4">
                        <div className="w-8 h-8 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                          {i + 1}
                        </div>
                        <div className="space-y-4 flex-1">
                          <h3 className="text-lg font-medium">{q.text}</h3>
                          <p className="text-sm text-muted-foreground">{q.marks} {q.marks === 1 ? 'point' : 'points'}</p>
                          
                          {q.type === "multiple_choice" || q.type === "true_false" ? (
                            <div className="space-y-2">
                              {q.options?.map((opt: any) => (
                                <div key={opt.id} className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50 cursor-pointer" onClick={() => !quizSubmitted && setQuizAnswers(prev => ({ ...prev, [q.id]: opt.id }))}>
                                  <input 
                                    type="radio" 
                                    name={`question-${q.id}`} 
                                    value={opt.id} 
                                    checked={quizAnswers[q.id] === opt.id}
                                    onChange={() => !quizSubmitted && setQuizAnswers(prev => ({ ...prev, [q.id]: opt.id }))}
                                    disabled={quizSubmitted}
                                    className="w-4 h-4 text-primary focus:ring-primary border-primary"
                                  />
                                  <Label htmlFor={opt.id} className="flex-1 cursor-pointer">{opt.text}</Label>
                                </div>
                              ))}
                            </div>
                          ) : q.type === "multiple_select" ? (
                            <div className="space-y-2">
                              {q.options?.map((opt: any) => {
                                const isChecked = (quizAnswers[q.id] as string[])?.includes(opt.id);
                                return (
                                  <div key={opt.id} className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50">
                                    <Checkbox 
                                      id={opt.id}
                                      disabled={quizSubmitted}
                                      checked={isChecked}
                                      onCheckedChange={(checked) => {
                                        setQuizAnswers(prev => {
                                          const prevArr = (prev[q.id] as string[]) || [];
                                          if (checked) return { ...prev, [q.id]: [...prevArr, opt.id] };
                                          return { ...prev, [q.id]: prevArr.filter(id => id !== opt.id) };
                                        });
                                      }}
                                    />
                                    <Label htmlFor={opt.id} className="flex-1 cursor-pointer">{opt.text}</Label>
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <textarea 
                              disabled={quizSubmitted}
                              className="w-full min-h-[100px] border rounded-md p-3 focus:ring-2 focus:ring-primary"
                              placeholder="Type your answer here..."
                              value={(quizAnswers[q.id] as string) || ""}
                              onChange={(e) => setQuizAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                            />
                          )}

                          {quizSubmitted && (
                            <div className="mt-4 space-y-4">
                              <div className={cn(
                                "p-4 rounded-lg flex items-start gap-3 text-sm border",
                                quizResult?.results?.find(r => r.questionId === q.id)?.isCorrect 
                                  ? "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400" 
                                  : "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400"
                              )}>
                                {quizResult?.results?.find(r => r.questionId === q.id)?.isCorrect ? (
                                  <CheckCircle className="w-5 h-5 shrink-0" />
                                ) : (
                                  <AlertCircle className="w-5 h-5 shrink-0" />
                                )}
                                <div>
                                  <span className="font-bold block mb-1">
                                    {quizResult?.results?.find(r => r.questionId === q.id)?.isCorrect ? "Correct!" : "Incorrect"}
                                  </span>
                                  {!quizResult?.results?.find(r => r.questionId === q.id)?.isCorrect && (
                                    <p className="mt-1">
                                      <span className="font-medium">Correct Answer: </span>
                                      {q.options.filter((o: any) => o.isCorrect).map((o: any) => o.text).join(", ")}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {q.explanation && (
                                <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20 flex gap-3 text-sm text-blue-700 dark:text-blue-400">
                                  <HelpCircle className="w-5 h-5 shrink-0" />
                                  <div>
                                    <span className="font-bold block mb-1">Explanation:</span>
                                    {q.explanation}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <div className="pt-6 border-t flex items-center justify-between">
                  {quizResult ? (
                    <div className="flex items-center gap-3 text-lg font-bold text-green-600 dark:text-green-500 bg-green-50 dark:bg-green-950/30 px-6 py-3 rounded-xl">
                      <CheckCircle className="w-6 h-6" />
                      Score: {quizResult.score} / {quizResult.totalMarks}
                    </div>
                  ) : (
                    <div></div> // Spacer
                  )}
                  
                  {!quizSubmitted && (
                    <Button 
                      size="lg" 
                      onClick={async () => {
                        try {
                          const res = await api<any>(`/quizzes/${currentQuiz.id}/submit`, {
                            method: "POST",
                            body: { answers: quizAnswers }
                          });
                          if (res.error) throw new Error(res.error);
                          setQuizResult({ 
                            score: res.data.attempt.score, 
                            totalMarks: res.data.totalMarks,
                            results: res.data.results
                          });
                          setQuizSubmitted(true);
                          updateProgress.mutate({ lectureId: activeLecture.id, completed: true, progressPercent: 100, autoNext: false });
                          toast({ title: "Quiz submitted successfully!", variant: "success" });
                        } catch (e: any) {
                          toast({ title: "Failed to submit quiz", description: e.message, variant: "destructive" });
                        }
                      }}
                    >
                      Submit Quiz
                    </Button>
                  )}
                </div>
              </div>
            ) : (
               <div className="p-8 text-center text-muted-foreground bg-muted/30 rounded-xl border-dashed border-2">Quiz content not available. Please ask your instructor.</div>
            )}
            
          </div>
        ) : activeLecture?.type === "file" ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-900 border-2 border-dashed m-8 rounded-xl">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <Download className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">{activeLecture.title}</h2>
            <p className="text-muted-foreground mb-8 text-center max-w-md">This lecture is a downloadable file resource. Click the button below to download or view the file.</p>
            <div className="flex gap-4">
              {activeLecture.content ? (
                <Button size="lg" asChild>
                  <a href={activeLecture.content} target="_blank" rel="noopener noreferrer">
                    Download File
                  </a>
                </Button>
              ) : (
                <Button size="lg" disabled variant="secondary">File not available</Button>
              )}
            </div>
          </div>
        ) : activeLecture?.type === "notes" ? (
          <div className="flex-1 overflow-auto p-10 lg:p-16 bg-slate-100 dark:bg-slate-900 flex flex-col items-center">
            <h2 className="text-4xl font-bold mb-6 font-display text-foreground tracking-tight w-full max-w-5xl">{activeLecture?.title}</h2>
            
            {/* Access Control for Notes Content */}
            {(() => {
              const isFirstLecture = currentCourse?.sections?.[0]?.lectures?.[0]?.id === activeLecture.id;
              if (!user) {
                // Not logged in - only first lecture preview
                if (!isFirstLecture) {
                  return (
                    <EnrollPrompt 
                      title="Notes Preview Available" 
                      description="Sign up to access these notes and full course content."
                    />
                  );
                }
              } else if (!isEnrolled) {
                // Logged in but not enrolled - partial notes access
                if (!isFirstLecture) {
                  return (
                    <EnrollPrompt 
                      title="Enroll for Full Notes" 
                      description="Enroll in this course to access complete notes and materials."
                    />
                  );
                }
              }
              // User can view this content
              return null;
            })()}
            
            {/* Show notes if user has access */}
            {((isEnrolled) || (!user && currentCourse?.sections?.[0]?.lectures?.[0]?.id === activeLecture.id) || (user && !isEnrolled && currentCourse?.sections?.[0]?.lectures?.[0]?.id === activeLecture.id)) && (
              <div className="flex-1 w-full max-w-5xl bg-white dark:bg-slate-950 rounded-xl shadow-lg border border-border/50 overflow-hidden relative min-h-[600px]">
                {isPdfLoading ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p>Compiling PDF Notes...</p>
                  </div>
                ) : pdfError ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-4">
                    <AlertCircle className="w-8 h-8 text-destructive" />
                    <p>Failed to load PDF: {pdfError}</p>
                  </div>
                ) : pdfUrl ? (
                  <iframe src={`${pdfUrl}#toolbar=0`} className="w-full h-full border-none" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    No notes content provided.
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-auto p-10 lg:p-16 bg-background">
            <h2 className="text-4xl font-bold mb-10 font-display text-foreground tracking-tight max-w-3xl mx-auto">{activeLecture?.title}</h2>
            <div className="prose prose-slate dark:prose-invert prose-lg max-w-3xl mx-auto tracking-normal font-light leading-relaxed" dangerouslySetInnerHTML={{ __html: activeLecture?.content ?? "<p>No content available.</p>" }} />
          </div>
        )}
      </div>

      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center">Rate this Course</DialogTitle>
            <DialogDescription className="text-center">Congratulations on completing the course! Tell us what you think.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-6 py-4">
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => setRating(star)} className="focus:outline-none transition-transform hover:scale-110 active:scale-95">
                  <Star className={cn("w-10 h-10", rating >= star ? "fill-yellow-500 text-yellow-500" : "text-slate-300 dark:text-foreground")} />
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <Label>Write your feedback:</Label>
              <Textarea 
                placeholder="What did you like about this course?" 
                value={reviewText} 
                onChange={(e) => setReviewText(e.target.value)} 
                className="min-h-[120px]"
              />
            </div>
          </div>
          <div className="flex justify-end pt-4 border-t">
            <Button 
              disabled={rating === 0 || isSubmittingReview} 
              onClick={async () => {
                setIsSubmittingReview(true);
                const res = await api(`/reviews`, { method: "POST", body: { courseId, rating, reviewText } });
                setIsSubmittingReview(false);
                if (res.error) toast({ title: "Failed to submit review", description: res.error, variant: "destructive" });
                else {
                  toast({ title: "Review submitted successfully!", variant: "success" });
                  setShowReviewModal(false);
                  refetchReviews();
                  queryClient.invalidateQueries({ queryKey: ["courses"] });
                  queryClient.invalidateQueries({ queryKey: ["landing"] });
                }
              }}
              className="w-full sm:w-auto px-8"
            >
              {isSubmittingReview ? "Submitting..." : "Submit Review"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
