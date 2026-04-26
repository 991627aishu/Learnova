import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Star } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Review {
  id: string;
  rating: number;
  reviewText: string | null;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
    profileImage: string | null;
  };
  course: {
    id: string;
    title: string;
    averageRating: number;
    reviewCount: number;
  };
}

export function InstructorReviews() {
  const { data, isLoading } = useQuery({
    queryKey: ["instructor", "reviews"],
    queryFn: async () => {
      const res = await api<{ reviews: Review[] }>("/reviews/instructor");
      if (res.error) throw new Error(res.error);
      return res.data!.reviews;
    },
  });

  const reviews = data ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold font-display text-foreground">Student Reviews</h1>
        <p className="mt-1 text-muted-foreground">Monitor feedback across all your published courses</p>
      </div>

      {isLoading ? (
        <Card><CardContent className="p-12 text-center text-muted-foreground animate-pulse">Loading reviews...</CardContent></Card>
      ) : reviews.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-muted-foreground">You don't have any student reviews yet.</CardContent></Card>
      ) : (
        <div className="grid gap-6">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardHeader className="pb-3 border-b border-slate-100 bg-muted/30">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg text-foreground">{review.course.title}</CardTitle>
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <div className="flex items-center text-amber-500">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="ml-1 font-medium">{review.course.averageRating.toFixed(1)}</span>
                      </div>
                      <span className="text-slate-300">•</span>
                      <span>{review.course.reviewCount} total review{review.course.reviewCount !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={review.user.profileImage || review.user.avatar || undefined} />
                    <AvatarFallback>{review.user.firstName[0]}{review.user.lastName[0]}</AvatarFallback>
                  </Avatar>
                  <div className="space-y-2 flex-grow">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-foreground">{review.user.firstName} {review.user.lastName}</p>
                        <div className="flex items-center gap-1 mt-1 text-amber-500">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`w-3.5 h-3.5 ${i < review.rating ? "fill-current" : "text-slate-200"}`} />
                          ))}
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">{format(new Date(review.createdAt), "MMM d, yyyy")}</span>
                    </div>
                    {review.reviewText && (
                      <p className="text-foreground italic border-l-2 border-slate-200 pl-3">"{review.reviewText}"</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
