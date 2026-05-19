import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Trophy, Users, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CourseCard } from "@/components/common/CourseCard";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

interface CoursesResponse {
  success: boolean;
  courses: Array<{
    id: string;
    title: string;
    subtitle?: string;
    thumbnail?: string;
    price: number;
    averageRating?: number;
    reviewCount?: number;
    category?: string;
    categoryRel?: { name: string };
    instructor?: {
      firstName: string;
      lastName: string;
    };
  }>;
}

export function LandingPage() {
  const navigate = useNavigate();

  const { data: coursesData, isLoading: coursesLoading, isError: coursesError } = useQuery<CoursesResponse>({
    queryKey: ["landing", "featured-courses"],
    queryFn: async (): Promise<CoursesResponse> => {
      try {
        const res = await api<CoursesResponse>("/courses");
        if (res.error) {
          console.error("API Error:", res.error);
          // Return empty courses data instead of throwing to prevent page crash
          return { success: true, courses: [] };
        }
        if (!res.data) {
          console.error("No data received");
          return { success: true, courses: [] };
        }
        console.log("API RAW RESPONSE:", res);
        console.log("COURSES:", res.data);
        console.log("COURSES COUNT:", res.data.courses?.length || 0);
        console.log("FIRST COURSE:", res.data.courses?.[0]);
        return res.data;
      } catch (err) {
        console.error("Fetch failed:", err);
        // Return empty courses data instead of throwing to prevent page crash
        return { success: true, courses: [] };
      }
    },
    retry: 1, // Reduce retries to prevent hanging
    retryDelay: 1000,
  });

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans selection:bg-amber-500/30">
      {/* Hero Section */}
      <main className="flex-1 pt-20">
        <section className="relative min-h-[85vh] flex items-center pt-10 pb-20 overflow-hidden bg-gradient-to-b from-background via-background to-secondary/20 dark:to-[#0a0a0a]/50 transition-colors">
          {/* Background Gradients */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-amber-500/10 dark:bg-amber-500/15 rounded-full blur-[120px] -z-10 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-yellow-600/10 dark:bg-yellow-600/15 rounded-full blur-[100px] -z-10 pointer-events-none" />

          <div className="container mx-auto z-10 relative px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-sm font-bold tracking-wide uppercase mb-8 backdrop-blur-sm shadow-[0_0_15px_rgba(251,191,36,0.1)]">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                  Learn from Gate Hub
                </div>
                <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground leading-[1.1] mb-6 drop-shadow-sm">
                  Master new skills with <br className="hidden md:block" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 dark:from-amber-400 dark:via-yellow-500 dark:to-amber-600">THE GATE HUB</span> today.
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed font-sans">
                  Unlock your potential with carefully designed courses taught by your instructor. Join a community of learners, strengthen your knowledge, and accelerate your academic success.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                  <Link to="/register" className="w-full sm:w-auto px-8 py-4 rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 dark:from-amber-400 dark:to-yellow-500 text-white dark:text-[#0a0a0a] font-semibold text-lg flex items-center justify-center gap-2 hover:shadow-[0_0_25px_rgba(251,191,36,0.5)] dark:hover:shadow-[0_0_30px_rgba(251,191,36,0.7)] transition-all hover:-translate-y-1">
                    Start Learning Now <ArrowRight className="w-5 h-5" />
                  </Link>
                  <a href="#courses" className="w-full sm:w-auto px-8 py-4 rounded-full border border-amber-500/30 dark:border-amber-400/40 bg-secondary/50 dark:bg-transparent text-foreground dark:text-amber-400 font-semibold text-lg hover:bg-secondary dark:hover:bg-amber-400/10 transition-all text-center group">
                    Explore Courses
                  </a>
                </div>
              </div>

              {/* Right Content - Graphic */}
              <div className="relative hidden lg:flex justify-center items-center">
                <div className="absolute inset-0 bg-amber-500/10 dark:bg-amber-400/15 rounded-full blur-[100px] animate-pulse"></div>
                <div className="relative z-10 p-8 rounded-[3rem] bg-background/50 dark:bg-[#0a0a0a]/60 backdrop-blur-xl border border-amber-500/20 dark:border-amber-400/30 shadow-xl dark:shadow-[0_0_50px_rgba(251,191,36,0.2)] transition-transform duration-700 hover:-translate-y-4">
                  <img
                    src="/logo.png"
                    alt="Futuristic Tech Illustration"
                    className="w-full max-w-lg object-contain relative z-10 dark:drop-shadow-[0_0_40px_rgba(251,191,36,0.6)] drop-shadow-2xl"
                  />
                  {/* Decorative Elements (Dark mode shines) */}
                  <div className="hidden dark:block absolute top-10 right-10 w-20 h-20 border border-amber-400/40 rounded-full animate-spin-slow opacity-50" style={{ animationDuration: '10s' }} />
                  <div className="hidden dark:block absolute bottom-10 left-10 w-32 h-32 border border-yellow-400/20 rounded-full animate-spin-slow opacity-30" style={{ animationDuration: '15s', animationDirection: 'reverse' }} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 bg-secondary/30 dark:bg-[#0a0a0a] relative overflow-hidden border-t border-amber-500/5 dark:border-amber-400/10 transition-colors">
          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center mb-16">
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-foreground">Why Choose THE GATE HUB?</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">THE GATE HUB provides a structured digital learning space where students can access course materials, practice resources, and guided lessons designed to strengthen understanding and improve academic performance.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: <BookOpen className="w-8 h-8 text-amber-600 dark:text-amber-400" />,
                  title: "Guided Courses",
                  description: "Carefully designed courses and lessons provided by your instructor to simplify complex topics and improve conceptual understanding."
                },
                {
                  icon: <Trophy className="w-8 h-8 text-amber-600 dark:text-amber-400" />,
                  title: "Learning Materials",
                  description: "Access lecture notes, PDFs, study resources, and assignments all in one place for efficient learning."
                },
                {
                  icon: <Users className="w-8 h-8 text-amber-600 dark:text-amber-400" />,
                  title: "Student Learning Hub",
                  description: "A dedicated platform where students can explore content, practice quizzes, and enhance their knowledge in a focused learning environment."
                }
              ].map((feature, i) => (
                <div key={i} className="group p-8 rounded-[2rem] bg-card dark:bg-[#0a0a0a]/50 border border-border/50 dark:border-amber-400/20 hover:border-amber-500/30 dark:hover:border-amber-400/80 hover:shadow-lg dark:hover:shadow-[0_15px_40px_-10px_rgba(251,191,36,0.4)] hover:-translate-y-3 transition-all duration-500 relative overflow-hidden backdrop-blur-md">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-yellow-600/5 dark:from-amber-400/0 dark:to-amber-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 dark:bg-amber-400/5 dark:border dark:border-amber-400/20 flex items-center justify-center mb-6 shrink-0 group-hover:scale-110 group-hover:bg-amber-500/20 dark:group-hover:bg-amber-400/20 transition-all shadow-[inset_0_0_15px_rgba(251,191,36,0.05)] dark:shadow-[inset_0_0_20px_rgba(251,191,36,0.1)]">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-foreground dark:group-hover:text-yellow-300 transition-colors">{feature.title}</h3>
                  <p className="text-muted-foreground dark:text-slate-400 leading-relaxed relative z-10">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Categories Section */}
        <section id="categories" className="py-24 border-y border-border/50 dark:border-amber-400/10 bg-background/50 dark:bg-[#0a0a0a] transition-colors">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-foreground">Top Categories</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg transition duration-500">Explore courses by category to find your perfect fit.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                "Artificial Intelligence",
                "Data Structures & Algorithms",
                "Machine Learning",
                "Deep Learning",
                "Generative AI",
                "Natural Language Processing",
                "Computer Vision",
                "Data Science",
              ].map((cat) => (
                <Link key={cat} to={`/login`} className="p-6 rounded-2xl bg-card dark:bg-[#0a0a0a]/30 border border-border/50 dark:border-amber-400/10 hover:border-amber-500/40 dark:hover:border-amber-400/50 hover:shadow-lg dark:hover:shadow-[0_0_20px_rgba(251,191,36,0.15)] transition-all text-center group flex items-center justify-center relative overflow-hidden backdrop-blur-sm">
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/5 dark:via-amber-400/5 to-amber-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform -translate-x-full group-hover:translate-x-full" />
                  <h3 className="font-bold text-lg text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors z-10">{cat}</h3>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Courses Section */}
        <section id="courses" className="py-24 bg-secondary/30 dark:bg-[#0a0a0a] relative overflow-hidden transition-colors">
          <div className="absolute hidden dark:block top-1/2 left-1/2 w-[800px] h-[400px] -translate-x-1/2 -translate-y-1/2 bg-amber-400/5 rounded-full blur-[150px] pointer-events-none" />

          <div className="container mx-auto px-4 relative z-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-16">
              <div>
                <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-foreground">Featured Courses</h2>
                <p className="text-muted-foreground max-w-2xl text-lg">Hand-picked premium courses to start your journey.</p>
              </div>
              <Link to="/login" className="mt-6 md:mt-0 text-amber-600 dark:text-amber-400 font-bold dark:hover:text-yellow-300 hover:underline dark:hover:no-underline dark:hover:shadow-[0_0_10px_rgba(251,191,36,0.5)] transition-all flex items-center gap-2 group border-b border-transparent dark:hover:border-amber-400 pb-1">
                View all courses <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="grid md:grid-cols-3 gap-10">
              {coursesLoading ? (
                  [1, 2, 3, 4, 5, 6].map(i => <Card key={i} className="border-border/50 dark:border-amber-400/10 bg-card/50 dark:bg-[#0a0a0a]/50 h-[450px] animate-pulse"><div className="h-56 bg-muted/50 dark:bg-[#0a0a0a]/50" /></Card>)
              ) : coursesError ? (
                <div className="col-span-full text-center py-12">
                  <div className="text-red-500 mb-2">Unable to load courses</div>
                  <p className="text-muted-foreground text-sm">The course catalog is temporarily unavailable. Please check back later.</p>
                </div>
              ) : coursesData?.courses?.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <div className="text-muted-foreground mb-2">No courses available yet</div>
                  <p className="text-muted-foreground/70 text-sm">Check back soon for new courses!</p>
                </div>
              ) : (
                <>
                  {console.log("RENDERING COURSES:", coursesData.courses?.length || 0)}
                  {Array.isArray(coursesData.courses) && coursesData.courses.map((c: any, index: number) => {
                    console.log(`RENDERING COURSE ${index + 1}:`, c.title);
                    return (
                      <CourseCard 
                        key={c.id}
                        course={{
                          id: c.id,
                          title: c.title || "Untitled Course",
                          instructor: c.instructor ? `${c.instructor.firstName || ""} ${c.instructor.lastName || ""}`.trim() || "Unknown Instructor" : "Unknown Instructor",
                          thumbnail: c.thumbnail,
                          price: c.price,
                          rating: c.averageRating || 0,
                          reviewCount: c.reviewCount || 0,
                          category: c.categoryRel?.name || c.category || "Uncategorized",
                          subtitle: c.subtitle
                        }}
                        onClick={() => {
                          console.log("COURSE CLICKED:", c.title);
                          navigate(`/course/${c.id}`);
                        }}
                      />
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </section>

        {/* Free Learning Resources Button */}
        <section className="py-16 bg-background dark:bg-[#0a0a0a] transition-colors">
          <div className="container mx-auto px-4 text-center">
            <Link 
              to="/resources" 
              className="px-10 py-5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 dark:from-amber-400 dark:to-yellow-500 text-white dark:text-[#0a0a0a] font-bold text-lg hover:-translate-y-1 transition-all shadow-lg hover:shadow-[0_0_20px_rgba(251,191,36,0.4)] dark:hover:shadow-[0_0_40px_rgba(251,191,36,0.6)] inline-flex items-center gap-3"
            >
              Free Learning Resources →
            </Link>
          </div>
        </section>

        {/* Simple CTA before footer */}
        <section className="py-32 relative overflow-hidden text-center bg-background dark:bg-[#0a0a0a] transition-colors border-b dark:border-amber-400/20">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-yellow-600/5 dark:from-amber-400/5 dark:to-yellow-400/5 -z-10" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-amber-500/10 dark:bg-amber-400/5 rounded-full blur-[150px] -z-10 dark:opacity-100 opacity-50" />
          <div className="container mx-auto px-4 relative z-10">
            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-foreground drop-shadow-sm text-balance">Start your learning journey with THE GATE HUB.</h2>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">Access guided lessons, organized resources, and a focused learning environment designed to support students in mastering new concepts.</p>
            <Link to="/register" className="px-10 py-5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 dark:from-amber-400 dark:to-yellow-500 text-white dark:text-[#0a0a0a] font-bold text-lg hover:-translate-y-1 transition-all shadow-lg hover:shadow-[0_0_20px_rgba(251,191,36,0.4)] dark:hover:shadow-[0_0_40px_rgba(251,191,36,0.6)] inline-flex items-center gap-3">
              Get Started for Free <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
