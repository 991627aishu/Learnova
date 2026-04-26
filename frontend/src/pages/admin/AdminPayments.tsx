import { Card, CardContent } from "@/components/ui/card";

export function AdminPayments() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold font-display text-foreground">Payments</h1>
        <p className="mt-1 text-muted-foreground">Platform revenue and payouts</p>
      </div>
      <Card><CardContent className="p-12 text-center text-muted-foreground">Payments (integrate with payment provider).</CardContent></Card>
    </div>
  );
}
