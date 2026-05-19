import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Search, Heart, Play, Award } from "lucide-react";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CourseCard } from "@/components/common/CourseCard";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface Course {
  id: string;
  title: string;
  subtitle?: string | null;
  price: number;
  thumbnail?: string | null;
  difficulty?: string | null;
  category?: { name: string } | null;
  instructor?: { firstName: string; lastName: string } | null;
  averageRating?: number;
  reviewCount?: number;
  _count?: { enrollments: number; reviews: number };
}

export function BrowseCourses() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [difficulty, setDifficulty] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const navigate = useNavigate();
  
  const token = useAuthStore((s) => s.token);
  const toast = useToastStore((s) => s.add);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await api<{ categories: Array<{ id: string; name: string }> }>("/categories");
      if (res.error) throw new Error(res.error);
      return res.data!;
    },
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["courses", "browse", search, categoryId, difficulty, price],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (categoryId) params.set("categoryId", categoryId);
      if (difficulty) params.set("difficulty", difficulty);
      if (price) params.set("price", price);
      const res = await api<{ courses: Course[] }>(`/courses?${params}`);
      if (res.error) throw new Error(res.error);
      return res.data!;
    },
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
  });

  // Get user's enrollments to show enrollment status
  const { data: enrollmentsData } = useQuery({
    queryKey: ["my-enrollments"],
    queryFn: async () => {
      if (!token) return { enrollments: [] };
      const res = await api<{ enrollments: any[] }>("/enrollments/my");
      if (res.error) return { enrollments: [] };
      return res.data!;
    },
    enabled: !!token,
  });

  const { data: wishlistData, refetch: refetchWishlist } = useQuery({
    queryKey: ["wishlist"],
    queryFn: async () => {
      if (!token) return { items: [] };
      const res = await api<{ items: any[] }>("/wishlist");
      if (res.error) return { items: [] };
      return res.data!;
    },
    enabled: !!token,
  });

  const courses = data?.courses ?? [];
  const wishlistItems = wishlistData?.items ?? [];
  const enrollments = enrollmentsData?.enrollments ?? [];
  const isWishlisted = (courseId: string) => wishlistItems.some((w: any) => w.course?.id === courseId);
  const getEnrollmentStatus = (courseId: string) => {
    const enrollment = enrollments.find((e: any) => e.courseId === courseId);
    return {
      isEnrolled: !!enrollment,
      progress: enrollment?.progress?.percent || 0
    };
  };

  const toggleWishlist = async (e: React.MouseEvent, courseId: string) => {
    e.stopPropagation();
    if (!token) {
      toast({ title: "Sign in required", variant: "destructive" });
      return;
    }
    const currentlyWishlisted = isWishlisted(courseId);
    const method = currentlyWishlisted ? "DELETE" : "POST";
    const res = await api(`/wishlist/${courseId}`, { method });
    if (res.error) {
      toast({ title: "Error", description: res.error, variant: "destructive" });
    } else {
      toast({ title: currentlyWishlisted ? "Removed from wishlist" : "Added to wishlist", variant: "success" });
      refetchWishlist();
    }
  };

  const handleEnroll = async (courseId: string, price: number) => {
    if (!token) {
      toast({ title: "Sign in required", variant: "destructive" });
      return;
    }

    if (price > 0) {
      try {
        const res = await api<any>("/payments/create-checkout-session", {
          method: "POST",
          body: { courseId }
        });
        if (res.error) throw new Error(res.error);
        if (res.data?.url) {
          window.location.href = res.data.url;
        }
      } catch (e: any) {
        toast({ title: "Checkout Error", description: e.message, variant: "destructive" });
      }
      return;
    }

    const res = await api<{ enrollment: unknown }>(`/enrollments/${courseId}`, { method: "POST" });
    if (res.error) toast({ title: "Error", description: res.error, variant: "destructive" });
    else toast({ title: "Enrolled successfully!", variant: "success" });
  };

  const handleContinueLearning = (courseId: string) => {
    navigate(`/course/${courseId}`);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold font-display tracking-tight text-foreground">Browse Courses</h1>
        <p className="mt-1 text-lg text-muted-foreground">Find your next course and level up your skills</p>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search courses..." className="pl-12 h-12 rounded-xl bg-background/50 border-border/50 text-base shadow-sm focus-visible:ring-primary/20" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus-visible:ring-primary/20"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">All categories</option>
          {categories?.categories?.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus-visible:ring-primary/20"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
        >
          <option value="">All difficulties</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
        <select
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus-visible:ring-primary/20"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        >
          <option value="">All prices</option>
          <option value="free">Free</option>
          <option value="paid">Paid</option>
        </select>
      </div>
      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm h-[400px]">
              <div className="aspect-video bg-muted animate-pulse" />
              <CardContent className="p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                </div>
                <div className="h-6 w-full bg-muted animate-pulse rounded" />
                <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
                <div className="mt-auto pt-4 flex justify-between items-center">
                  <div className="h-6 w-16 bg-muted animate-pulse rounded" />
                  <div className="h-9 w-24 bg-muted animate-pulse rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="p-12 text-center flex flex-col items-center gap-4">
            <div className="text-red-500 font-bold text-lg">Failed to load courses.</div>
            <p className="text-sm text-muted-foreground">There was a problem reaching the server.</p>
            <Button onClick={() => refetch()} variant="outline" className="border-red-500/20 text-red-500 hover:bg-red-500/10 hover:text-red-600">Try Again</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c, i) => {
            const enrollmentStatus = getEnrollmentStatus(c.id);
            return (
              <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="h-full">
                <CourseCard
                  course={{
                    id: c.id,
                    title: c.title,
                    subtitle: c.subtitle,
                    thumbnail: c.thumbnail,
                    price: c.price,
                    category: c.category?.name,
                    instructor: c.instructor ? `${c.instructor.firstName} ${c.instructor.lastName}` : undefined,
                    rating: c.averageRating,
                    reviewCount: c.reviewCount,
                    difficulty: c.difficulty || undefined,
                    studentCount: c._count?.enrollments,
                    isEnrolled: enrollmentStatus.isEnrolled,
                    progress: enrollmentStatus.progress,
                  }}
                  onClick={() => navigate(`/course/${c.id}`)}
                  topRightOverlay={
                    <button 
                      onClick={(e) => toggleWishlist(e, c.id)}
                      className="p-2.5 rounded-full bg-background/80 backdrop-blur shadow-sm hover:bg-background hover:scale-110 transition-all"
                    >
                      <Heart className={`w-5 h-5 transition-colors ${isWishlisted(c.id) ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
                    </button>
                  }
                  headerBadge={
                    enrollmentStatus.isEnrolled && (
                      <span className="bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-1 rounded-full text-xs font-bold">
                        {enrollmentStatus.progress === 100 ? (
                          <>
                            <Award className="w-3 h-3 mr-1 inline" />
                            Completed
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 mr-1 inline" />
                            Enrolled
                          </>
                        )}
                      </span>
                    )
                  }
                  actions={
                    enrollmentStatus.isEnrolled ? (
                      <Button 
                        size="sm" 
                        className="rounded-lg shadow-sm font-semibold hover:-translate-y-0.5 transition-all ml-auto bg-green-600 hover:bg-green-700"
                        onClick={(e) => { e.stopPropagation(); handleContinueLearning(c.id); }}
                      >
                        {enrollmentStatus.progress === 100 ? "View Certificate" : "Continue Learning"}
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        className={cn(
                          "rounded-lg shadow-sm font-semibold hover:-translate-y-0.5 transition-all ml-auto",
                          c.price > 0 ? "bg-amber-600 hover:bg-amber-700" : "bg-primary"
                        )} 
                        onClick={(e) => { e.stopPropagation(); handleEnroll(c.id, c.price); }}
                      >
                        {c.price > 0 ? "Buy Now" : "Enroll Now"}
                      </Button>
                    )
                  }
                />
              </motion.div>
            );
          })}
        </div>
      )}
      {!isLoading && !isError && courses.length === 0 && (
        <Card><CardContent className="p-12 text-center text-muted-foreground">No courses available yet.</CardContent></Card>
      )}
    </div>
  );
}
