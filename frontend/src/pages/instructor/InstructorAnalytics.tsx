import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface AnalyticsResponse {
  stats: {
    totalCourses: number;
    totalEnrollments: number;
    totalRevenue: number;
    averageRating: number;
  };
  revenueData: { name: string; revenue: number }[];
  engagementData: { name: string; activeStudents: number }[];
}

export function InstructorAnalytics() {
  const { data, isLoading } = useQuery({
    queryKey: ["instructor", "analytics"],
    queryFn: async () => {
      const res = await api<AnalyticsResponse>("/analytics/instructor");
      if (res.error) throw new Error(res.error);
      return res.data;
    },
  });

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading analytics...</div>;
  }

  const chartData = data?.engagementData || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold font-display text-foreground">Analytics</h1>
        <p className="mt-1 text-muted-foreground">Course engagement and growth</p>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Courses</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{data?.stats.totalCourses || 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Enrollments</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{data?.stats.totalEnrollments || 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">${data?.stats.totalRevenue || 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Average Rating</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{data?.stats.averageRating || "N/A"}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Student engagement</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="activeStudents" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
