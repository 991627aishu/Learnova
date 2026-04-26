import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HelpCircle } from "lucide-react";
import { QuizCard } from "@/components/common/QuizCard";
import { Button } from "@/components/ui/button";

interface Attempt {
  id: string;
  score: number;
  totalMarks: number;
  createdAt: string;
  quizName: string;
  courseName: string;
  courseId: string;
}

export function QuizResultsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["quiz-attempts"],
    queryFn: async () => {
      const res = await api<{ attempts: Attempt[] }>("/quizzes/my/attempts");
      if (res.error) throw new Error(res.error);
      return res.data!;
    },
  });

  const attempts = data?.attempts ?? [];

  // Group attempts by course
  const groupedAttempts = attempts.reduce((acc, attempt) => {
    const courseName = attempt.courseName || "Other Quizzes";
    if (!acc[courseName]) acc[courseName] = [];
    acc[courseName].push(attempt);
    return acc;
  }, {} as Record<string, Attempt[]>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Loading results...</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-4xl font-bold font-display text-foreground tracking-tight">Quiz Analytics</h1>
        <p className="mt-2 text-muted-foreground">Track your progress and review your performance across all courses.</p>
      </div>

      {attempts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-16 text-center text-muted-foreground">
            <HelpCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-lg">No quiz attempts yet. Start learning to see your results here!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-8">
          {Object.entries(groupedAttempts).map(([courseName, courseAttempts]) => (
            <section key={courseName} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-1 bg-primary rounded-full" />
                <h2 className="text-xl font-bold text-foreground">{courseName}</h2>
                <Badge variant="secondary" className="ml-2">
                  {courseAttempts.length} {courseAttempts.length === 1 ? 'Attempt' : 'Attempts'}
                </Badge>
              </div>

              <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                {courseAttempts.map((a) => {
                  return (
                    <QuizCard
                      key={a.id}
                      quiz={{
                        id: a.id,
                        title: a.quizName,
                        courseName: a.courseName,
                        score: a.score,
                        totalMarks: a.totalMarks,
                        createdAt: a.createdAt,
                      }}
                      action={
                        <Button className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-white shrink-0">
                          Retake
                        </Button>
                      }
                    />
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}


