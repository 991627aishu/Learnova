import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, GraduationCap, Calendar, Search } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Student {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  enrolledAt: string;
  progress: number;
}

interface CourseGroup {
  courseTitle: string;
  students: Student[];
}

export function InstructorStudents() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["instructor", "students"],
    queryFn: async () => {
      const res = await api<{ courses: CourseGroup[] }>("/enrollments/instructor/students");
      if (res.error) throw new Error(res.error);
      return res.data!;
    },
  });

  const courseGroups = data?.courses ?? [];

  const filteredGroups = courseGroups.map(group => ({
    ...group,
    students: group.students.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.courseTitle.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(group => group.students.length > 0);

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold font-display text-foreground flex items-center gap-3">
            <Users className="w-10 h-10 text-primary" />
            Students
          </h1>
          <p className="mt-1 text-muted-foreground">Manage and track students enrolled in your courses</p>
        </div>
        
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search students or courses..." 
            className="pl-10 h-11 bg-card/50 border-border/50 focus:bg-background transition-all rounded-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-6">
          {[1, 2].map(i => (
            <Card key={i} className="animate-pulse h-48 bg-card/30" />
          ))}
        </div>
      ) : filteredGroups.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent">
          <CardContent className="p-20 text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center">
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-xl font-bold text-foreground">
                {searchTerm ? "No results found" : "No students enrolled yet"}
              </p>
              <p className="text-muted-foreground max-w-xs mx-auto">
                {searchTerm 
                  ? "Try adjusting your search terms to find what you're looking for." 
                  : "Once students enroll in your courses, they will appear here grouped by course."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-8">
          {filteredGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-4">
              <div className="flex items-center gap-3 px-1">
                <GraduationCap className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold text-foreground tracking-tight">
                  {group.courseTitle}
                  <span className="ml-3 text-sm font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                    {group.students.length} {group.students.length === 1 ? 'Student' : 'Students'}
                  </span>
                </h2>
              </div>
              
              <Card className="border-border/40 shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/20 text-muted-foreground">
                          <th className="text-left p-4 font-bold uppercase tracking-wider text-[10px]">Student Info</th>
                          <th className="text-left p-4 font-bold uppercase tracking-wider text-[10px]">Enrollment Date</th>
                          <th className="text-left p-4 font-bold uppercase tracking-wider text-[10px]">Learning Progress</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20">
                        {group.students.map((s, idx) => (
                          <tr key={idx} className="hover:bg-muted/30 transition-colors group">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 border border-border/50 shadow-sm">
                                  <AvatarImage src={s.avatar || undefined} />
                                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                    {s.name.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-bold text-foreground group-hover:text-primary transition-colors">{s.name}</div>
                                  <div className="text-xs text-muted-foreground font-medium">{s.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="w-3.5 h-3.5" />
                                <span className="font-medium">{new Date(s.enrolledAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="space-y-2 max-w-[180px]">
                                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                                  <span className={s.progress === 100 ? "text-green-500" : "text-muted-foreground"}>
                                    {s.progress === 100 ? "Completed" : "In Progress"}
                                  </span>
                                  <span className="text-foreground">{s.progress}%</span>
                                </div>
                                <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
                                  <div 
                                    className={cn(
                                      "h-full transition-all duration-500 rounded-full",
                                      s.progress === 100 ? "bg-green-500" : "bg-primary"
                                    )} 
                                    style={{ width: `${s.progress}%` }} 
                                  />
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

