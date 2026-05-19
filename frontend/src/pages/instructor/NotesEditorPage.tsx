import { LectureNotesEditor } from "@/components/latex/LectureNotesEditor";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export function NotesEditorPage() {
  // Render the lecture-specific LaTeX editor with persistence
  return (
    <div className="w-full h-screen overflow-hidden">
      <ErrorBoundary>
        <LectureNotesEditor />
      </ErrorBoundary>
    </div>
  );
}
