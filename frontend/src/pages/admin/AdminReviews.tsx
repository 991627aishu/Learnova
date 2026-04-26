import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";

interface Review {
  id: string;
  rating: number;
  comment?: string | null;
  user?: { firstName: string; lastName: string };
  course?: { title: string };
}

export function AdminReviews() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "reviews"],
    queryFn: async () => {
      const res = await api<{ reviews: Review[] }>("/admin/reviews");
      if (res.error) throw new Error(res.error);
      return res.data!;
    },
  });

  const reviews = data?.reviews ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold font-display text-foreground">Reviews</h1>
        <p className="mt-1 text-muted-foreground">Moderate course reviews</p>
      </div>
      <Card>
        <CardContent className="p-0">
          {isLoading ? <div className="p-6 animate-pulse h-48" /> : (
            <div className="divide-y">
              {reviews.map((r) => (
                <div key={r.id} className="p-4">
                  <div className="flex justify-between">
                    <span className="font-medium">{r.course?.title}</span>
                    <span className="text-amber-600">{r.rating} ★</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{r.user ? `${r.user.firstName} ${r.user.lastName}` : "—"}</p>
                  {r.comment && <p className="text-sm text-muted-foreground mt-2">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
