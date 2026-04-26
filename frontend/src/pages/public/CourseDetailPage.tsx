import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, PlayCircle, Globe, User, ShieldCheck, ArrowLeft, Loader2, Star, FileText, Target, Zap, ListChecks, Users, Trophy } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import ReactMarkdown from 'react-markdown';
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, token } = useAuthStore();
  const toast = useToastStore((s) => s.add);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isDownloadingCertificate, setIsDownloadingCertificate] = useState(false);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const { data: courseData, isLoading, refetch } = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const res = await api<any>(`/courses/${courseId}`);
      if (res.error) throw new Error(res.error);
      return res.data.course;
    },
    enabled: !!courseId,
  });

  const { data: aiDetails } = useQuery({
    queryKey: ["course-ai-details", courseId],
    queryFn: async () => {
      const res = await api<any>(`/courses/${courseId}/ai-details`);
      if (res.error) return null;
      return res.data.details;
    },
    enabled: !!courseId,
  });

  const { data: enrollmentStatus, refetch: refetchEnrollment } = useQuery({
    queryKey: ["enrollment-check", courseId],
    queryFn: async () => {
      const res = await api<any>(`/enrollments/${courseId}/check`);
      if (res.error) return { enrolled: false, paid: false };
      
      // Also fetch progress if enrolled
      if (res.data.enrolled) {
        const progressRes = await api<any>(`/enrollments/${courseId}/progress`);
        if (!progressRes.error) {
          return { ...res.data, progress: progressRes.data.progress };
        }
      }
      return res.data;
    },
    enabled: !!courseId && !!token,
  });

  const handleDownloadCertificate = async () => {
    if (!courseId) return;
    setIsDownloadingCertificate(true);
    try {
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
      a.download = `Certificate_${courseData?.title.replace(/\s+/g, '_')}.pdf`;
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

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast({ title: "Payment Successful!", description: "You are now enrolled in the course.", variant: "success" });
      refetch();
      refetchEnrollment();
    }
  }, [searchParams, toast, refetch, refetchEnrollment]);

  const handleEnroll = async () => {
    if (!token) {
      toast({ title: "Sign in required", variant: "destructive" });
      navigate("/login");
      return;
    }

    const isPaid = courseData.price === 0 || enrollmentStatus?.paid;
    const isEnrolled = enrollmentStatus?.enrolled;

    if (courseData.price > 0 && !isPaid) {
      setIsProcessingPayment(true);
      try {
        // Fetch Razorpay Key
        const keyRes = await api<any>("/payments/razorpay/key");
        if (keyRes.error) throw new Error("Could not fetch payment key");
        const RAZORPAY_KEY_ID = keyRes.data.keyId;

        // Create Razorpay Order
        const orderRes = await api<any>("/payments/razorpay/create-order", {
          method: "POST",
          body: { courseId }
        });

        if (orderRes.error) throw new Error(orderRes.error);

        const { orderId, amount, currency } = orderRes.data;

        const options = {
          key: RAZORPAY_KEY_ID,
          amount: amount,
          currency: currency,
          name: "Learnova",
          description: courseData.title,
          order_id: orderId,
          handler: async function (response: any) {
            try {
              const verifyRes = await api<any>("/payments/razorpay/verify", {
                method: "POST",
                body: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  courseId
                }
              });

              if (verifyRes.error) throw new Error(verifyRes.error);

              toast({ title: "Payment Successful!", variant: "success" });
              console.log("Payment success: Enrollment saved");
              refetchEnrollment();
              refetch();
              navigate(`/course/${courseId}`);
            } catch (err: any) {
              toast({ title: "Verification Failed", description: err.message, variant: "destructive" });
            } finally {
              setIsProcessingPayment(false);
            }
          },
          prefill: {
            name: user ? `${user.firstName} ${user.lastName}` : "",
            email: user?.email || "",
          },
          theme: {
            color: "#06b6d4",
          },
          modal: {
            ondismiss: function() {
              setIsProcessingPayment(false);
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } catch (e: any) {
        toast({ title: "Payment Error", description: e.message, variant: "destructive" });
        setIsProcessingPayment(false);
      }
      return;
    }

    if (isEnrolled) {
      navigate(`/student/course/${courseId}/learn`);
      return;
    }

    const res = await api<{ enrollment: unknown }>(`/enrollments/${courseId}`, { method: "POST" });
    if (res.error) toast({ title: "Error", description: res.error, variant: "destructive" });
    else {
      toast({ title: "Enrolled successfully!", variant: "success" });
      refetchEnrollment();
      navigate(`/student/course/${courseId}/learn`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!courseData) return <div>Course not found</div>;

  const isEnrolled = enrollmentStatus?.enrolled;
  const isPaid = courseData.price === 0 || enrollmentStatus?.paid;
  const aiContent = courseData.aiContent ? JSON.parse(courseData.aiContent) : aiDetails;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero Section */}
      <div className="bg-slate-900 text-white py-16 px-4">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-12 items-center">
          <div className="flex-1 space-y-6">
            <Button 
              variant="ghost" 
              className="text-white/70 hover:text-white p-0 flex items-center gap-2 mb-4"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
            <Badge variant="secondary" className="bg-primary/20 text-primary border-none uppercase tracking-widest text-[10px] font-bold py-1 px-3">
              {courseData.category?.name || "Premium Course"}
            </Badge>
            <h1 className="text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              {courseData.title}
            </h1>
            <p className="text-xl text-slate-300 font-light max-w-2xl leading-relaxed">
              {courseData.subtitle}
            </p>
            <div className="flex flex-wrap gap-6 text-sm font-medium text-slate-400">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                <span className="text-white">{courseData.averageRating?.toFixed(1) || "4.8"}</span> ({courseData.reviewCount || 0} reviews)
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>By {courseData.instructor?.firstName} {courseData.instructor?.lastName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <span>English</span>
              </div>
            </div>
          </div>
          
          <Card className="w-full lg:w-96 shrink-0 overflow-hidden border-none shadow-2xl shadow-primary/20 bg-slate-800 lg:-mb-32 z-10">
            <div className="aspect-video relative group bg-slate-950 flex items-center justify-center overflow-hidden">
              <img 
                src={courseData.thumbnail || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60"} 
                className="max-h-full max-w-full object-contain transition-transform duration-700 group-hover:scale-110"
                alt={courseData.title}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100">
                <div className="w-20 h-20 bg-primary/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-2xl">
                  <PlayCircle className="w-10 h-10 text-white fill-current" />
                </div>
              </div>
            </div>
            <CardContent className="p-8 space-y-6">
              <div className="flex items-baseline justify-between">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-white">${courseData.price}</span>
                  {courseData.price > 0 && <span className="text-slate-400 line-through text-lg font-light">$99.99</span>}
                </div>
                {courseData.price > 0 && <Badge className="bg-green-500/20 text-green-400 border-none font-bold">80% OFF</Badge>}
              </div>
              
              <Button 
                className={cn(
                  "w-full h-14 text-lg font-bold rounded-xl shadow-lg transition-all active:scale-95",
                  isEnrolled ? "bg-secondary hover:bg-secondary/80 text-secondary-foreground" : "bg-primary hover:bg-primary/90 shadow-primary/20"
                )}
                onClick={handleEnroll}
                disabled={isProcessingPayment}
              >
                {isProcessingPayment ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </div>
                ) : isEnrolled ? (
                  isPaid ? "Continue Learning" : "Complete Purchase"
                ) : (
                  courseData.price > 0 ? "Enroll Now" : "Start Learning"
                )}
              </Button>

              {isEnrolled && enrollmentStatus?.progress && (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-muted-foreground uppercase tracking-wider text-[10px]">Your Progress</span>
                    <span className="text-primary">{enrollmentStatus.progress.percent}%</span>
                  </div>
                  <Progress value={enrollmentStatus.progress.percent} className="h-2 bg-slate-700" />
                  
                  {enrollmentStatus.progress.percent === 100 && (
                    <Button 
                      variant="outline" 
                      className="w-full mt-2 border-primary/50 text-primary hover:bg-primary/10 gap-2 font-bold"
                      onClick={handleDownloadCertificate}
                      disabled={isDownloadingCertificate}
                    >
                      {isDownloadingCertificate ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trophy className="w-4 h-4" />
                      )}
                      {isDownloadingCertificate ? "Generating PDF..." : "Download Certificate"}
                    </Button>
                  )}
                </div>
              )}
              
              <div className="space-y-4 pt-4 border-t border-white/5">
                <p className="text-sm font-bold text-white uppercase tracking-widest opacity-50">This course includes:</p>
                <div className="grid gap-3 text-sm text-slate-300">
                  <div className="flex items-center gap-3"><PlayCircle className="w-4 h-4 text-primary" /> 24.5 hours on-demand video</div>
                  <div className="flex items-center gap-3"><FileText className="w-4 h-4 text-primary" /> 12 downloadable resources</div>
                  <div className="flex items-center gap-3"><CheckCircle className="w-4 h-4 text-primary" /> Full lifetime access</div>
                  <div className="flex items-center gap-3"><ShieldCheck className="w-4 h-4 text-primary" /> Certificate of completion</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 mt-12 lg:mt-40 flex flex-col lg:flex-row gap-16">
        <div className="flex-1 space-y-12">
          {aiContent?.whatYouWillLearn && (
            <section className="space-y-6 bg-card border border-border/40 p-8 rounded-2xl">
              <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                <Target className="w-6 h-6 text-primary" />
                What You Will Learn
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {aiContent.whatYouWillLearn.map((outcome: string, idx: number) => (
                  <div key={idx} className="flex gap-3 text-sm text-muted-foreground leading-snug">
                    <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    <span>{outcome}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-4">
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
              <div className="w-1 h-8 bg-primary rounded-full" />
              Course Description
            </h2>
            <div className="prose prose-slate dark:prose-invert max-w-none text-muted-foreground font-light leading-relaxed">
              {aiContent?.description ? (
                <ReactMarkdown>{aiContent.description}</ReactMarkdown>
              ) : (
                courseData.description
              )}
            </div>
          </section>

          {aiContent?.skills && (
            <section className="space-y-4">
              <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                <Zap className="w-6 h-6 text-primary" />
                Skills You Will Gain
              </h2>
              <div className="flex flex-wrap gap-2">
                {aiContent.skills.map((skill: string, idx: number) => (
                  <Badge key={idx} variant="secondary" className="px-4 py-2 rounded-lg text-sm bg-secondary/50 border-none">
                    {skill}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-6">
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
              <div className="w-1 h-8 bg-primary rounded-full" />
              Curriculum
            </h2>
            <div className="space-y-4">
              {courseData.sections?.map((section: any, idx: number) => (
                <Card key={section.id} className="border-border/40 overflow-hidden hover:border-primary/20 transition-all">
                  <div className="bg-muted/30 p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-background border border-border/50 flex items-center justify-center font-black text-primary">
                        {idx + 1}
                      </div>
                      <h3 className="font-bold text-lg">{section.title}</h3>
                    </div>
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{section.lectures?.length} Lectures</span>
                  </div>
                  <div className="divide-y divide-border/30">
                    {section.lectures?.map((lecture: any) => (
                      <div key={lecture.id} className="p-4 flex items-center justify-between hover:bg-muted/10 transition-colors group">
                        <div className="flex items-center gap-4">
                          <PlayCircle className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          <span className="text-sm font-medium">{lecture.title}</span>
                        </div>
                        {lecture.duration && <span className="text-xs text-muted-foreground">{Math.round(lecture.duration / 60)} min</span>}
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </section>
        </div>

        <div className="lg:w-80 space-y-8">
          {aiContent?.requirements && (
            <section className="space-y-4">
              <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                <ListChecks className="w-5 h-5 text-primary" />
                Requirements
              </h2>
              <ul className="space-y-2">
                {aiContent.requirements.map((req: string, idx: number) => (
                  <li key={idx} className="text-sm text-muted-foreground flex gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    {req}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {aiContent?.targetAudience && (
            <section className="space-y-4">
              <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Who is this for?
              </h2>
              <ul className="space-y-2">
                {aiContent.targetAudience.map((target: string, idx: number) => (
                  <li key={idx} className="text-sm text-muted-foreground flex gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    {target}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="space-y-4">
            <h2 className="text-xl font-black tracking-tight">Instructor</h2>
            <Card className="border-border/40 bg-card/50">
              <CardContent className="p-6 text-center space-y-4">
                <div className="w-24 h-24 rounded-full bg-primary/10 mx-auto border-4 border-background flex items-center justify-center text-3xl font-black text-primary">
                  {courseData.instructor?.firstName?.[0]}{courseData.instructor?.lastName?.[0]}
                </div>
                <div>
                  <h4 className="font-bold text-lg">{courseData.instructor?.firstName} {courseData.instructor?.lastName}</h4>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mt-1">Lead Instructor</p>
                </div>
                <p className="text-sm text-muted-foreground font-light leading-relaxed">
                  Expert educator with 10+ years of experience in specialized learning environments.
                </p>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
