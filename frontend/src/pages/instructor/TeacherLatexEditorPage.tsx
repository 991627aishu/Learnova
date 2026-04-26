import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import {
  AlertCircle,
  Download,
  FilePlus2,
  Loader2,
  Play,
  Save,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, apiFormData } from "@/lib/api";
import { useToastStore } from "@/store/toastStore";
import { useAuthStore } from "@/store/authStore";

interface LatexDocument {
  id: string;
  title: string;
  content: string;
  pdfUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CompileError {
  message: string;
  line: number | null;
  raw: string;
}

// Simplified response types for legacy compilation
interface CompileResponse {
  success: boolean;
  pdfBase64?: string;
  pdfUrl?: string;
  error?: string;
  logs?: string;
  errors?: CompileError[];
}

const LAST_DOCUMENT_STORAGE_KEY = "teacher-latex-last-document-id";
const EDITOR_CONTENT_STORAGE_KEY = "teacher-latex-editor-content";
const AUTO_SAVE_DELAY_MS = 2000; // 2 seconds auto-save

function buildSnapshot(title: string, content: string): string {
  return `${title}\u0000${content}`;
}

function escapeForLatexTitle(title: string): string {
  return title.replace(/\\/g, '\\backslash ').replace('{', '\\{').replace('}', '\\}');
}

function buildDefaultTemplate(title: string): string {
  return `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{amsfonts}
\\usepackage{amssymb}
\\usepackage{graphicx}
\\usepackage[margin=1in]{geometry}
\\title{${escapeForLatexTitle(title)}}
\\author{Teacher}
\\date{\\today}

\\begin{document}
\\maketitle

\\section{Introduction}
Your content here.

\\end{document}`;
}

function saveEditorContentToSession(content: string): void {
  try {
    sessionStorage.setItem(EDITOR_CONTENT_STORAGE_KEY, content);
  } catch (error) {
    console.warn("Failed to save editor content to session:", error);
  }
}

function restoreEditorContentFromSession(): string | null {
  try {
    return sessionStorage.getItem(EDITOR_CONTENT_STORAGE_KEY);
  } catch (error) {
    console.warn("Failed to restore editor content from session:", error);
    return null;
  }
}

export function TeacherLatexEditorPage() {
  const addToast = useToastStore((state) => state.add);
  const token = useAuthStore((state) => state.token);

  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [title, setTitle] = useState("Untitled Notes");
  const [content, setContent] = useState("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [compileLogs, setCompileLogs] = useState<string | null>(null);
  const [compileErrors, setCompileErrors] = useState<CompileError[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const editorRef = useRef<any>(null);
  const saveTimerRef = useRef<number | null>(null);
  const compileTimerRef = useRef<number | null>(null);
  const isSavingRef = useRef(false);
  const queuedSaveRef = useRef(false);
  const isCompilingRef = useRef(false);
  const titleRef = useRef(title);
  const contentRef = useRef(content);
  const snapshotRef = useRef(buildSnapshot(title, content));

  const saveLabel = useMemo(() => {
    if (isSaving) return "Saving...";
    if (hasPendingChanges) return "Unsaved changes";
    if (!lastSavedAt) return "Saved";
    return `Saved at ${lastSavedAt.toLocaleTimeString()}`;
  }, [hasPendingChanges, isSaving, lastSavedAt]);

  const applyDocument = useCallback((document: LatexDocument, preserveEditorContent: boolean = true) => {
    setIsReady(false);
    setDocumentId(document.id);
    
    // CRITICAL: NEVER overwrite editor content if user has typed anything
    const currentEditorValue = editorRef.current?.getValue();
    const sessionContent = restoreEditorContentFromSession();
    const finalContent = sessionContent || currentEditorValue || document.content;
    
    setTitle(document.title);
    setContent(finalContent);
    setPdfUrl(document.pdfUrl ?? null);
    setCompileLogs(null);
    setCompileErrors([]);

    // Update refs with preserved content
    titleRef.current = document.title;
    contentRef.current = finalContent;
    snapshotRef.current = buildSnapshot(document.title, finalContent);

    setHasPendingChanges(sessionContent || currentEditorValue ? true : false);
    setLastSavedAt(new Date(document.updatedAt));
    localStorage.setItem(LAST_DOCUMENT_STORAGE_KEY, document.id);

    window.setTimeout(() => setIsReady(true), 0);
  }, []);

  const createDocument = useCallback(async (): Promise<LatexDocument> => {
    const response = await api<{ success: boolean; document: LatexDocument }>("/latex/create", {
      method: "POST",
      body: { title: "Untitled Notes" },
    });

    if (response.error || !response.data?.document) {
      throw new Error(response.error || "Failed to create LaTeX document");
    }

    return response.data.document;
  }, []);

  const getDocument = useCallback(async (id: string): Promise<LatexDocument> => {
    const response = await api<{ success: boolean; document: LatexDocument }>(`/latex/${id}`);
    if (response.error || !response.data?.document) {
      throw new Error(response.error || "Failed to load LaTeX document");
    }
    return response.data.document;
  }, []);

  const saveDocument = useCallback(
    async (notify: boolean): Promise<boolean> => {
      const docId = documentId;
      if (!docId) return false;

      const nextTitle = titleRef.current.trim() || "Untitled Notes";
      const nextContent = contentRef.current;
      const nextSnapshot = buildSnapshot(nextTitle, nextContent);

      if (nextSnapshot === snapshotRef.current) {
        return true;
      }

      if (isSavingRef.current) {
        queuedSaveRef.current = true;
        return false;
      }

      isSavingRef.current = true;
      setIsSaving(true);

      try {
        const response = await api<{ success: boolean; document: LatexDocument }>(`/latex/${docId}`, {
          method: "PUT",
          body: {
            title: nextTitle,
            content: nextContent,
          },
        });

        if (response.error || !response.data?.document) {
          throw new Error(response.error || "Failed to save LaTeX document");
        }

        const updated = response.data.document;
        snapshotRef.current = buildSnapshot(updated.title, updated.content);
        setHasPendingChanges(false);
        setLastSavedAt(new Date(updated.updatedAt));

        if (updated.title !== titleRef.current) {
          titleRef.current = updated.title;
          setTitle(updated.title);
        }
        // NEVER overwrite editor content - editor is source of truth
        if (updated.content !== contentRef.current) {
          contentRef.current = updated.content;
          setContent(updated.content);
          // DON'T overwrite editor - let user keep their changes
        }

        if (notify) {
          addToast({ title: "Document saved", variant: "success" });
        }

        return true;
      } catch (error: any) {
        addToast({
          title: "Save failed",
          description: error?.message || "Could not save your document",
          variant: "destructive",
        });
        return false;
      } finally {
        isSavingRef.current = false;
        setIsSaving(false);

        if (queuedSaveRef.current) {
          queuedSaveRef.current = false;
          void saveDocument(false);
        }
      }
    },
    [addToast, documentId]
  );

  const compileDocument = useCallback(
    async (force: boolean, notify: boolean) => {
      const docId = documentId;
      if (!docId || isCompilingRef.current) return;

      // Get CURRENT editor content - this is the source of truth
      const currentEditorContent = editorRef.current?.getValue() || contentRef.current;
      
      if (!token) {
        addToast({ title: "Authentication required", variant: "destructive" });
        return;
      }

      isCompilingRef.current = true;
      setIsCompiling(true);

      try {
        // STEP 1: ALWAYS save editor content first
        await saveDocument(false);
        
        // STEP 2: THEN compile with current editor content
        const response = await fetch("/api/latex/compile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ 
            code: currentEditorContent,
            projectId: docId,
            force 
          }),
        });

        const payload = (await response.json().catch(() => ({}))) as any;

        if (!response.ok || !payload.success) {
          setCompileErrors(payload.errors ?? []);
          setCompileLogs(payload.logs || payload.error || "Compilation failed");
          if (notify) {
            addToast({
              title: "Compilation failed",
              description: payload.error || "Fix the LaTeX errors and retry",
              variant: "destructive",
            });
          }
          return;
        }

        // Handle PDF response - NEVER clear editor content
        if (payload.pdfBase64) {
          const pdfBlob = new Blob([Uint8Array.from(atob(payload.pdfBase64), c => c.charCodeAt(0))], { type: 'application/pdf' });
          const pdfUrl = URL.createObjectURL(pdfBlob);
          setPdfUrl(pdfUrl);
        } else if (payload.pdfUrl) {
          setPdfUrl(payload.pdfUrl);
        }
        
        setCompileErrors([]);
        setCompileLogs(null);
        
        // IMPORTANT: NEVER clear or modify editor content

        if (notify) {
          addToast({
            title: "Compilation complete",
            variant: "success",
          });
        }
      } catch (error: any) {
        setCompileLogs(error?.message || "Compilation request failed");
        setCompileErrors([]);
        if (notify) {
          addToast({
            title: "Compilation failed",
            description: error?.message || "Compilation request failed",
            variant: "destructive",
          });
        }
      } finally {
        isCompilingRef.current = false;
        setIsCompiling(false);
      }
    },
    [addToast, documentId, saveDocument, token]
  );

  const handleCreateNewDocument = useCallback(async () => {
    const saved = await saveDocument(false);
    if (!saved && hasPendingChanges) {
      return;
    }

    try {
      const document = await createDocument();
      applyDocument(document);
      addToast({ title: "New document created", variant: "success" });
    } catch (error: any) {
      addToast({
        title: "Could not create document",
        description: error?.message || "Failed to create a new LaTeX document",
        variant: "destructive",
      });
    }
  }, [addToast, applyDocument, createDocument, hasPendingChanges, saveDocument]);

  const insertTextInEditor = useCallback((text: string) => {
    const editor = editorRef.current;
    if (!editor) {
      const next = `${contentRef.current}\n${text}`;
      contentRef.current = next;
      setContent(next);
      saveEditorContentToSession(next);
      return;
    }

    const selection = editor.getSelection();
    editor.executeEdits("latex-image-upload", [
      {
        range: selection,
        text,
        forceMoveMarkers: true,
      },
    ]);
    editor.focus();
    const nextValue = editor.getValue();
    contentRef.current = nextValue;
    setContent(nextValue);
    saveEditorContentToSession(nextValue);
  }, []);

  const handleImageUpload = useCallback(
    async (files: FileList) => {
      if (!files.length) return;
      setIsUploadingImage(true);

      const snippets: string[] = [];

      for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        console.log("Processing image upload:", {
          name: file.name,
          type: file.type,
          size: file.size
        });
        
        if (!file.type.startsWith("image/")) {
          console.warn("Skipping non-image file:", file.name, file.type);
          addToast({
            title: `Invalid file type: ${file.name}`,
            description: "Only image files are supported",
            variant: "destructive",
          });
          continue;
        }

        const formData = new FormData();
        formData.append("image", file);

        try {
          console.log("Sending upload request for:", file.name);
          const response = await apiFormData<{
            success: boolean;
            image: { snippet: string; filename: string; url: string };
          }>("/latex/upload-image", formData);

          console.log("Upload response:", response);

          if (response.error || !response.data?.image) {
            console.error("Upload failed:", response.error);
            addToast({
              title: `Upload failed: ${file.name}`,
              description: response.error || "Image upload failed",
              variant: "destructive",
            });
            continue;
          }

          console.log("Upload successful:", response.data.image);
          snippets.push(
            `\\begin{figure}[h]
\\centering
${response.data.image.snippet}
\\caption{${file.name}}
\\end{figure}`
          );
        } catch (error: any) {
          console.error("Upload error:", error);
          addToast({
            title: `Upload error: ${file.name}`,
            description: error.message || "Network error occurred",
            variant: "destructive",
          });
        }
      }

      if (snippets.length) {
        insertTextInEditor(`\n${snippets.join("\n\n")}\n`);
        addToast({ title: "Image inserted into LaTeX", variant: "success" });
      }

      setIsUploadingImage(false);
    },
    [addToast, insertTextInEditor]
  );

  useEffect(() => {
    let isMounted = true;

    const loadInitialDocument = async () => {
      setIsBootstrapping(true);
      setIsReady(false);

      try {
        const url = new URL(window.location.href);
        const queryDocumentId = url.searchParams.get("docId");
        const storedDocumentId = localStorage.getItem(LAST_DOCUMENT_STORAGE_KEY);
        const candidateId = queryDocumentId || storedDocumentId;

        let document: LatexDocument;
        if (candidateId) {
          try {
            document = await getDocument(candidateId);
          } catch {
            document = await createDocument();
          }
        } else {
          document = await createDocument();
        }

        if (!isMounted) return;
        applyDocument(document);
      } catch (error: any) {
        if (!isMounted) return;
        addToast({
          title: "Editor initialization failed",
          description: error?.message || "Failed to initialize teacher editor",
          variant: "destructive",
        });
      } finally {
        if (isMounted) {
          setIsBootstrapping(false);
        }
      }
    };

    void loadInitialDocument();

    return () => {
      isMounted = false;
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      if (compileTimerRef.current) window.clearTimeout(compileTimerRef.current);
    };
  }, [addToast, applyDocument, createDocument, getDocument]);

  useEffect(() => {
    titleRef.current = title;
    contentRef.current = content;
    
    // Auto-save editor content to session storage
    if (content) {
      saveEditorContentToSession(content);
    }
  }, [title, content]);

  useEffect(() => {
    if (!isReady || !documentId) return;

    const nextSnapshot = buildSnapshot(title, content);
    const changed = nextSnapshot !== snapshotRef.current;
    setHasPendingChanges(changed);

    if (!changed) return;

    // Auto-save with debounce (2 seconds)
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      void saveDocument(false);
    }, AUTO_SAVE_DELAY_MS);

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [content, documentId, isReady, saveDocument, title]);

  // Removed auto-compile to prevent interference with manual operations
  // User will compile manually when ready

  if (isBootstrapping) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0f172a] text-slate-200">
        <div className="flex items-center gap-3 text-sm">
          <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
          Initializing Teacher Notes Editor...
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-[#0f172a] text-slate-100">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-800 bg-[#111827] px-4">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="h-9 max-w-md border-slate-700 bg-slate-900 text-slate-100"
          placeholder="Document title"
        />
        <div className="text-xs text-slate-400">{saveLabel}</div>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-2" onClick={handleCreateNewDocument}>
            <FilePlus2 className="h-4 w-4" />
            New
          </Button>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => void saveDocument(true)}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>
          <Button
            size="sm"
            className="gap-2 bg-emerald-600 text-white hover:bg-emerald-500"
            onClick={() => void compileDocument(true, true)}
            disabled={isCompiling}
          >
            {isCompiling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Compile
          </Button>
          <Button size="sm" variant="outline" className="gap-2" asChild disabled={!pdfUrl}>
            <a href={pdfUrl || "#"} download={`${title || "teacher-notes"}.pdf`}>
              <Download className="h-4 w-4" />
              Download PDF
            </a>
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
        <div
          className={`relative min-h-0 border-r border-slate-800 ${isDragActive ? "bg-slate-800/60" : "bg-[#111827]"}`}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragActive(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setIsDragActive(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragActive(false);
            if (event.dataTransfer.files?.length) {
              void handleImageUpload(event.dataTransfer.files);
            }
          }}
        >
          {isUploadingImage && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="flex items-center gap-2 rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                Uploading image...
              </div>
            </div>
          )}

          <div className="flex h-10 items-center justify-between border-b border-slate-800 px-4 text-xs text-slate-400">
            <span>LaTeX Editor</span>
            <span className="flex items-center gap-1">
              <UploadCloud className="h-3.5 w-3.5" />
              Drag images into editor
            </span>
          </div>

          <Editor
            height="calc(100% - 40px)"
            defaultLanguage="latex"
            theme="vs-dark"
            value={content}
            onChange={(value) => {
              const newContent = value ?? "";
              setContent(newContent);
              // Immediately save to session storage to prevent content loss
              saveEditorContentToSession(newContent);
            }}
            onMount={(editor, monaco) => {
              editorRef.current = editor;
              editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
                void saveDocument(true);
              });
            }}
            options={{
              minimap: { enabled: true },
              wordWrap: "on",
              fontSize: 14,
              lineHeight: 22,
              smoothScrolling: true,
              scrollBeyondLastLine: false,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            }}
          />
        </div>

        <div className="flex min-h-0 flex-col bg-[#0b1220]">
          <div className="flex h-10 items-center justify-between border-b border-slate-800 px-4 text-xs text-slate-400">
            <span>Live PDF Preview</span>
            {isCompiling && (
              <span className="flex items-center gap-1 text-cyan-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Compiling
              </span>
            )}
          </div>

          <div className="min-h-0 flex-1 bg-slate-900">
            {pdfUrl ? (
              <iframe
                title="Compiled PDF"
                src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                className="h-full w-full border-0"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                Compile to render PDF preview
              </div>
            )}
          </div>

          <div className="h-56 border-t border-slate-800 bg-[#111827]">
            <div className="flex h-10 items-center gap-2 border-b border-slate-800 px-4 text-xs text-slate-300">
              <AlertCircle className="h-3.5 w-3.5" />
              Compile Errors
            </div>
            <div className="h-[calc(100%-40px)] overflow-auto p-3 text-xs">
              {compileErrors.length ? (
                <div className="space-y-2">
                  {compileErrors.map((errorItem, index) => (
                    <div key={`${errorItem.raw}-${index}`} className="rounded border border-red-800/40 bg-red-950/20 p-2">
                      <div className="mb-1 text-[11px] font-semibold text-red-300">
                        {errorItem.line ? `Line ${errorItem.line}` : "Unknown line"}
                      </div>
                      <div className="font-mono text-red-200">{errorItem.message}</div>
                    </div>
                  ))}
                </div>
              ) : compileLogs ? (
                <pre className="whitespace-pre-wrap font-mono text-red-200">{compileLogs}</pre>
              ) : (
                <div className="text-slate-500">No compile errors.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
