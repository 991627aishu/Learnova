import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToastStore } from "@/store/toastStore";
import { CourseCard } from "@/components/common/CourseCard";

interface WishlistItem {
  id: string;
  course: { 
    id: string; 
    title: string; 
    subtitle?: string | null; 
    thumbnail?: string | null;
    price?: number;
    instructor?: { firstName: string; lastName: string };
    _count?: { enrollments: number } 
  };
}

export function WishlistPage() {
  const toast = useToastStore((s) => s.add);
  const { data, refetch } = useQuery({
    queryKey: ["wishlist"],
    queryFn: async () => {
      const res = await api<{ items: WishlistItem[] }>("/wishlist");
      if (res.error) throw new Error(res.error);
      return res.data!;
    },
  });

  const items = data?.items ?? [];

  const remove = async (courseId: string) => {
    const res = await api(`/wishlist/${courseId}`, { method: "DELETE" });
    if (res.error) toast({ title: "Error", description: res.error, variant: "destructive" });
    else { toast({ title: "Removed from wishlist" }); refetch(); }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold font-display text-foreground">Wishlist</h1>
        <p className="mt-1 text-muted-foreground">Courses you saved for later</p>
      </div>
      {items.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-muted-foreground">You haven't added any courses to your wishlist.</CardContent></Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <CourseCard
              key={item.id}
              course={{
                id: item.course.id,
                title: item.course.title,
                subtitle: item.course.subtitle,
                thumbnail: item.course.thumbnail,
                price: item.course.price,
                instructor: item.course.instructor ? `${item.course.instructor.firstName} ${item.course.instructor.lastName}` : undefined,
              }}
              actions={
                <Button variant="ghost" size="sm" onClick={() => remove(item.course.id)} className="text-red-400 hover:text-red-500 hover:bg-red-400/10 w-full lg:w-auto mt-2 lg:mt-0 ml-auto">
                  Remove
                </Button>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
