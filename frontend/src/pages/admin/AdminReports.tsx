import { Card, CardContent } from "@/components/ui/card";

export function AdminReports() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold font-display text-foreground">Reports</h1>
        <p className="mt-1 text-muted-foreground">Content and user reports</p>
      </div>
      <Card><CardContent className="p-12 text-center text-muted-foreground">Reports (coming soon).</CardContent></Card>
    </div>
  );
}
