import { Card, CardContent } from "@/components/ui/card";

export function InstructorEarnings() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold font-display text-foreground">Earnings</h1>
        <p className="mt-1 text-muted-foreground">Revenue and payouts</p>
      </div>
      <Card><CardContent className="p-12 text-center text-muted-foreground">Earnings (integrate with payments).</CardContent></Card>
    </div>
  );
}
