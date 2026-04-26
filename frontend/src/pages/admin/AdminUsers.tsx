import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToastStore } from "@/store/toastStore";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  suspended: boolean;
}

export function AdminUsers() {
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.add);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const res = await api<{ users: User[]; total: number }>("/admin/users");
      if (res.error) throw new Error(res.error);
      return res.data!;
    },
  });

  const updateUser = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<User> }) => {
      const res = await api(`/admin/users/${id}`, {
        method: "PATCH",
        body: data,
      });
      if (res.error) throw new Error(res.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast({ title: "User updated", variant: "success" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to update user", description: err.message, variant: "destructive" });
    }
  });

  const users = data?.users ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold font-display text-foreground">Users</h1>
        <p className="mt-1 text-muted-foreground">Manage platform users</p>
      </div>
      <Card>
        <CardContent className="p-0">
          {isLoading ? <div className="p-6 animate-pulse h-48" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr>
                    <th className="text-left p-4 font-medium">Name</th>
                    <th className="text-left p-4 font-medium">Email</th>
                    <th className="text-left p-4 font-medium">Role</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-right p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-4">{u.firstName} {u.lastName}</td>
                      <td className="p-4">{u.email}</td>
                      <td className="p-4">
                        <select 
                          className="rounded border px-2 py-1 text-sm bg-background"
                          value={u.role}
                          onChange={(e) => updateUser.mutate({ id: u.id, data: { role: e.target.value } })}
                        >
                          <option value="student">Student</option>
                          <option value="instructor">Instructor</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.suspended ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {u.suspended ? "Suspended" : "Active"}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <Button 
                          variant={u.suspended ? "outline" : "destructive"} 
                          size="sm"
                          onClick={() => updateUser.mutate({ id: u.id, data: { suspended: !u.suspended } })}
                        >
                          {u.suspended ? "Unblock" : "Block"}
                        </Button>
                      </td>
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
