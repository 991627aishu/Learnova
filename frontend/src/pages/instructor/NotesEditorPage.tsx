import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useToastStore } from "@/store/toastStore";
import { EditorLayout } from "@/components/overleaf/EditorLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";

interface ProjectResponse {
  success: boolean;
  projects: any[];
}

export function NotesEditorPage() {
  const { lectureId } = useParams<{ lectureId: string }>();
  const [projectId, setProjectId] = useState<string | null>(null);
  const toast = useToastStore(s => s.add);

  // 1. Fetch existing projects to see if this lecture already has an Overleaf container
  const { data: projectsData, isLoading: isLoadingProjects } = useQuery({
    queryKey: ["latexProjects"],
    queryFn: async () => {
      const res = await api<ProjectResponse>(`/latex-projects`);
      if (res.error) throw new Error(res.error);
      return res.data?.projects || [];
    }
  });

  const createProjectMutation = useMutation({
    mutationFn: async () => {
      const res = await api<{ success: boolean, project: any }>(`/latex-projects`, {
        method: "POST",
        body: { title: `Lecture ${lectureId} Notes`, lectureId }
      });
      if (res.error) throw new Error(res.error);
      return res.data!.project;
    },
    onSuccess: (project) => {
      setProjectId(project.id);
    },
    onError: () => {
      toast({ title: "Failed to initialize Overleaf Sandbox", variant: "destructive" });
    }
  });

  // Automatically provision a true project if one doesn't exist for this lecture!
  useEffect(() => {
    if (!isLoadingProjects && projectsData) {
      const existingProject = projectsData.find(p => p.lectureId === lectureId);
      if (existingProject) {
        setProjectId(existingProject.id);
      } else if (!createProjectMutation.isPending && !createProjectMutation.isSuccess) {
        createProjectMutation.mutate();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingProjects, projectsData, lectureId]);

  if (isLoadingProjects || !projectId) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#1e1e1e] text-slate-400 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        <p className="tracking-widest uppercase font-semibold text-xs animate-pulse">Initializing Overleaf Project Sandbox...</p>
      </div>
    );
  }

  // Render the full multi-pane VS-Code IDE replica!
  return (
    <div className="w-full h-screen overflow-hidden">
      <ErrorBoundary>
        <EditorLayout projectId={projectId} />
      </ErrorBoundary>
    </div>
  );
}
