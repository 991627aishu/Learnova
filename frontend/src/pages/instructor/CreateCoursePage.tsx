import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api";
import { useToastStore } from "@/store/toastStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUpload } from "@/components/common/FileUpload";
import { Sparkles, Loader2, Plus, Code, Binary, Server, Briefcase, Palette, User } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  price: z.number().min(0),
  category: z.string().min(1, "Category is required"),
  subcategory: z.string().min(1, "Subcategory is required"),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  language: z.string().default("en"),
  thumbnail: z.string().optional(),
});
type Form = z.infer<typeof schema>;

const CATEGORIES = [
  {
    name: "Development",
    icon: Code,
    subcategories: ["Web Development", "Mobile Development", "Programming Languages", "Game Development", "Software Engineering", "Database Management"]
  },
  {
    name: "Data Science",
    icon: Binary,
    subcategories: ["Machine Learning", "Artificial Intelligence", "Data Analysis", "Deep Learning", "Big Data"]
  },
  {
    name: "IT & Software",
    icon: Server,
    subcategories: ["Network Security", "Cloud Computing", "DevOps", "Operating Systems", "Cybersecurity"]
  },
  {
    name: "Business",
    icon: Briefcase,
    subcategories: ["Entrepreneurship", "Management", "Finance", "Communication", "Marketing"]
  },
  {
    name: "Design",
    icon: Palette,
    subcategories: ["Graphic Design", "UX/UI Design", "User Experience Design", "Interior Design", "Web Design"]
  },
  {
    name: "Health & Fitness",
    icon: User,
    subcategories: ["Fitness", "Yoga", "Nutrition", "Mental Health", "Self Defense"]
  }
];

export function CreateCoursePage() {
  const navigate = useNavigate();
  const toast = useToastStore((s) => s.add);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { price: 0, language: "en" },
  });
  
  const difficulty = watch("difficulty");
  const language = watch("language");
  const thumbnail = watch("thumbnail");
  const selectedCategoryName = watch("category");
  const subcategory = watch("subcategory");

  const subcategories = CATEGORIES.find(c => c.name === selectedCategoryName)?.subcategories || [];

  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiTitle, setAiTitle] = useState("");

  const handleAiGenerate = async () => {
    if (!aiTitle) {
      toast({ title: "Title required", description: "Please enter a course title for the AI to generate content.", variant: "destructive" });
      return;
    }
    setIsAiGenerating(true);
    try {
      const res = await api<any>("/courses/generate-ai", {
        method: "POST",
        body: { title: aiTitle }
      });
      if (res.error) throw new Error(res.error);
      toast({ title: "Magic happened!", description: "AI has generated a full course for you.", variant: "success" });
      navigate(`/instructor/course/${res.data.course.id}/edit`);
    } catch (e: any) {
      toast({ title: "AI Generation Failed", description: e.message, variant: "destructive" });
    } finally {
      setIsAiGenerating(false);
    }
  };

  const onSubmit = async (data: Form) => {
    setLoading(true);
    const res = await api<{ course: { id: string } }>("/courses", { method: "POST", body: data });
    setLoading(false);
    if (res.error) toast({ title: "Error", description: res.error, variant: "destructive" });
    else {
      toast({ title: "Course created", variant: "success" });
      navigate(`/instructor/course/${res.data!.course.id}/edit`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div>
        <h1 className="text-4xl font-black font-display tracking-tight text-foreground">Create New Course</h1>
        <p className="mt-2 text-muted-foreground">Choose how you want to build your curriculum today.</p>
      </div>

      <Tabs defaultValue="manual" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 h-14 p-1 bg-muted/50 rounded-xl">
          <TabsTrigger value="manual" className="rounded-lg font-bold flex gap-2 items-center">
            <Plus className="w-4 h-4" /> Manual Creation
          </TabsTrigger>
          <TabsTrigger value="ai" className="rounded-lg font-bold flex gap-2 items-center text-primary data-[state=active]:bg-primary data-[state=active]:text-white">
            <Sparkles className="w-4 h-4" /> AI Magic Builder
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manual">
          <Card className="border-border/40 shadow-xl shadow-black/5">
            <CardHeader>
              <CardTitle>Course Details</CardTitle>
              <CardDescription>Fill in the basics to get started with your manual curriculum.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input placeholder="Course title" {...register("title")} />
                  {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label>Subtitle (optional)</Label>
                  <Input placeholder="Brief subtitle" {...register("subtitle")} />
                </div>
                
                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <textarea 
                    className="flex min-h-[100px] w-full rounded-xl border border-input bg-background/50 px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none" 
                    placeholder="Describe your course..." 
                    {...register("description")} 
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Price ($)</Label>
                    <Input type="number" step="0.01" min={0} {...register("price", { valueAsNumber: true })} />
                    {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Difficulty</Label>
                    <Select value={difficulty} onValueChange={(v) => setValue("difficulty", v as Form["difficulty"])}>
                      <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={selectedCategoryName} onValueChange={(v) => {
                      setValue("category", v);
                      setValue("subcategory", "");
                    }}>
                      <SelectTrigger className="h-12 rounded-xl border-primary/10 focus:ring-primary/20 transition-all">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c.name} value={c.name} className="py-3 cursor-pointer">
                            <div className="flex items-center gap-3">
                              <c.icon className="w-4 h-4 text-primary" />
                              <span className="font-medium text-sm">{c.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.category && <p className="text-sm text-destructive">{errors.category.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>Subcategory</Label>
                    <Select 
                      value={subcategory} 
                      onValueChange={(v) => setValue("subcategory", v)}
                      disabled={!selectedCategoryName}
                    >
                      <SelectTrigger className="h-12 rounded-xl border-primary/10 focus:ring-primary/20 transition-all">
                        <SelectValue placeholder={selectedCategoryName ? "Select Subcategory" : "First select a category"} />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {subcategories.map((sub) => (
                          <SelectItem key={sub} value={sub} className="py-2 cursor-pointer">
                            {sub}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.subcategory && <p className="text-sm text-destructive">{errors.subcategory.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select value={language} onValueChange={(v) => setValue("language", v)}>
                    <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Select language" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="zh">Chinese</SelectItem>
                      <SelectItem value="hi">Hindi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Course Thumbnail</Label>
                  <FileUpload 
                    value={thumbnail} 
                    onUploadSuccess={(url) => setValue("thumbnail", url)} 
                    accept="image/*" 
                    maxSize={5 * 1024 * 1024}
                  />
                </div>

                <Button type="submit" className="w-full h-14 text-lg font-bold rounded-xl shadow-lg hover:shadow-primary/20 transition-all" disabled={loading}>
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creating Course...
                    </div>
                  ) : "Create Course"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

    <TabsContent value="ai">
      <Card className="border-border/40 shadow-xl shadow-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Course Generator
          </CardTitle>
          <CardDescription>
            Enter a title and let our AI build a complete course curriculum, educational content, and quizzes for you in seconds.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label className="text-base font-bold">What do you want to teach?</Label>
            <Input 
              placeholder="e.g. Advanced Quantum Physics or Modern Web Development" 
              className="h-14 text-lg rounded-xl border-primary/20 focus-visible:ring-primary/20"
              value={aiTitle}
              onChange={(e) => setAiTitle(e.target.value)}
              disabled={isAiGenerating}
            />
            <p className="text-xs text-muted-foreground italic">
              AI will generate: Description, Modules, Lessons, Notes, and Quizzes.
            </p>
          </div>

          <Button 
            className="w-full h-14 text-lg font-bold rounded-xl bg-gradient-to-r from-primary to-blue-600 hover:opacity-90 transition-all shadow-lg shadow-primary/20"
            onClick={handleAiGenerate}
            disabled={isAiGenerating || !aiTitle}
          >
            {isAiGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Magically Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Generate Full Course
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </TabsContent>
  </Tabs>
</div>
  );
}
