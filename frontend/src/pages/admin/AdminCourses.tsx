import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { useToastStore } from "@/store/toastStore";

interface Course {
  id: string;
  title: string;
  status: string;
  instructor?: { firstName: string; lastName: string };
  _count?: { enrollments: number };
}

export function AdminCourses() {
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.add);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "courses"],
    queryFn: async () => {
      const res = await api<{ courses: Course[] }>("/admin/courses");
      if (res.error) throw new Error(res.error);
      return res.data!;
    },
  });

  const updateCourseStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await api(`/admin/courses/${id}/status`, {
        method: "PATCH",
        body: { status },
      });
      if (res.error) throw new Error(res.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
      toast({ title: "Course status updated", variant: "success" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to update course", description: err.message, variant: "destructive" });
    }
  });

  const courses = data?.courses ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold font-display text-foreground">Courses</h1>
        <p className="mt-1 text-muted-foreground">Moderate and manage courses</p>
      </div>
      <Card>
        <CardContent className="p-0">
          {isLoading ? <div className="p-6 animate-pulse h-48" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr>
                    <th className="text-left p-4 font-medium">Title</th>
                    <th className="text-left p-4 font-medium">Instructor</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Enrollments</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((c) => (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-4 font-medium">{c.title}</td>
                      <td className="p-4">{c.instructor ? `${c.instructor.firstName} ${c.instructor.lastName}` : "—"}</td>
                      <td className="p-4">
                        <select 
                          className="rounded border px-2 py-1 text-sm bg-background"
                          value={c.status}
                          onChange={(e) => updateCourseStatus.mutate({ id: c.id, status: e.target.value })}
                        >
                          <option value="draft">Draft</option>
                          <option value="published">Published</option>
                          <option value="archived">Archived</option>
                        </select>
                      </td>
                      <td className="p-4">{c._count?.enrollments ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
