import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AdminSettings() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold font-display text-foreground">Settings</h1>
        <p className="mt-1 text-muted-foreground">Platform configuration</p>
      </div>
      <Card>
        <CardHeader><CardTitle>General</CardTitle></CardHeader>
        <CardContent className="text-muted-foreground">Site name, branding, and global options (coming soon).</CardContent>
      </Card>
    </div>
  );
}
