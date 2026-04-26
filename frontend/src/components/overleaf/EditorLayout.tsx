import { useState, useCallback, useEffect, useRef } from 'react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { FileTree, FileNode } from './FileTree';
import { LatexMonaco } from './LatexMonaco';
import { PdfPreview } from './PdfPreview';
import { Play, Share2, Settings, Loader2, PanelLeftClose, PanelLeft, ArrowLeft, FileImage, Save } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToastStore } from '@/store/toastStore';
import { api } from '@/lib/api';

interface EditorLayoutProps {
  projectId: string;
}

export function EditorLayout({ projectId }: EditorLayoutProps) {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [activeFile, setActiveFile] = useState<FileNode | null>(null);
  const monacoEditorRef = useRef<any>(null);
  const [showFileTree, setShowFileTree] = useState(true);
  const navigate = useNavigate();
  const { courseId, lectureId } = useParams<{ courseId: string; lectureId: string }>();
  
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [compileLog, setCompileLog] = useState<string | null>(null);
  const [compileErrors, setCompileErrors] = useState<any[]>([]);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isAttaching, setIsAttaching] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  const addToast = useToastStore((s) => s.add);

  // Authenticate Details
  const authStoreStr = localStorage.getItem("lms-auth");
  const token = authStoreStr ? JSON.parse(authStoreStr)?.state?.token : null;
  const username = authStoreStr ? JSON.parse(authStoreStr)?.state?.user?.firstName : "Guest";

  const fetchProjectFiles = useCallback(() => {
    api<{ success: boolean; project: { files: FileNode[] } }>(`/latex-projects/${projectId}`)
      .then(res => {
        if (res.data && res.data.project.files) {
          setFiles(res.data.project.files);
        }
      });
  }, [projectId]);

  useEffect(() => {
    // Initial Project Fetch
    api<{ success: boolean; project: { files: FileNode[] } }>(`/latex-projects/${projectId}`)
      .then(res => {
        if (res.data && res.data.project.files?.length > 0) {
          setFiles(res.data.project.files);
          // Auto select main.tex or the first file
          const mainFile = res.data.project.files.find(f => f.name === 'main.tex') || res.data.project.files[0];
          setActiveFile(mainFile);
        }
      })
      .finally(() => setIsInitializing(false));
  }, [projectId]);

  const triggerCompile = useCallback(async () => {
    if (!activeFile) {
        addToast({ title: "No file selected", description: "Please select a file to compile", variant: "destructive" });
        return;
    }
    setIsCompiling(true);
    setCompileLog(null);
    setCompileErrors([]);
    try {
      addToast({ title: "Compiling...", variant: "default" });
      const code = monacoEditorRef.current ? monacoEditorRef.current.getValue() : activeFile?.content || "";
      const dispatchRes = await fetch(`/api/latex/compile`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code, projectId })
      });

      const data = await dispatchRes.json();

      if (!dispatchRes.ok || !data.success) {
         setCompileLog(data.error || data.logs || "Compilation catastrophically failed");
         setCompileErrors(data.errors || []);
         setPdfUrl(null);
      } else {
         addToast({ title: "Compiled successfully!", variant: "success" });
         setCompileErrors([]);
         
         const resBlob = await fetch(`data:application/pdf;base64,${data.pdfBase64}`);
         const blob = await resBlob.blob();
         
         setPdfUrl(prev => {
            if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
            return URL.createObjectURL(blob);
         });
      }
    } catch (err: any) {
       setCompileLog(err.message || "Network error or compilation service timed out.");
    } finally {
      setIsCompiling(false);
    }
  }, [projectId, token, addToast, activeFile]);

  const attachToLecture = async () => {
    setIsAttaching(true);
    try {
      // Find main.tex or fallback to active
      let targetCode = "";
      if (activeFile?.name === 'main.tex') {
        targetCode = monacoEditorRef.current ? monacoEditorRef.current.getValue() : activeFile.content || "";
      } else {
        const mainFileResponse = await api<{ success: boolean; file: FileNode }>(`/latex-projects/${projectId}/files/content?fileId=${files.find(f => f.name === 'main.tex')?.id}`);
        targetCode = mainFileResponse.data?.file?.content || "";
      }

      const res = await api(`/lectures/${lectureId}`, {
        method: 'PATCH',
        body: {
          content: targetCode,
          videoUrl: projectId // Store projectId in videoUrl so the student player can mount the sandbox!
        }
      });
      if (res.error) throw new Error(res.error);
      addToast({ title: "Attached to lesson successfully!", variant: "success" });
    } catch (err: any) {
      addToast({ title: "Failed to attach", description: err.message, variant: "destructive" });
    } finally {
      setIsAttaching(false);
    }
  };

  if (isInitializing) {
    return <div className="h-full w-full flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;
  }

  return (
    <div className="h-full w-full flex flex-col bg-[#1e1e1e] text-slate-200">
      
      {/* Universal Top Toolbar */}
      <div className="h-12 border-b border-slate-800 flex items-center justify-between px-4 bg-[#252526] shrink-0 overflow-hidden">
         <div className="flex items-center gap-2 md:gap-4">
            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-white" onClick={() => navigate(`/instructor/course/${courseId}/edit`)} title="Back to Curriculum Builder">
               <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="w-px h-6 bg-slate-700 hidden md:block mx-1" />
            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-white" onClick={() => setShowFileTree(!showFileTree)} title="Toggle File Explorer">
               {showFileTree ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
            </Button>
            <h1 className="font-bold text-sm tracking-wide bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent flex items-center gap-2 whitespace-nowrap hidden sm:flex">
               Overleaf Clone Engine
            </h1>
         </div>
         <div className="flex items-center gap-2">
            <Button size="sm" variant="default" className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 font-semibold h-8" onClick={triggerCompile} disabled={isCompiling}>
               {isCompiling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Compile
            </Button>
            <Button size="sm" variant="default" className="bg-blue-600 hover:bg-blue-500 text-white gap-2 font-semibold h-8" onClick={attachToLecture} disabled={isAttaching}>
               {isAttaching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Attach to Lesson
            </Button>
            <div className="w-px h-6 bg-slate-700 mx-2" />
            <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-slate-700"><Share2 className="w-4 h-4 text-slate-400 hover:text-white" /></Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-slate-700"><Settings className="w-4 h-4 text-slate-400 hover:text-white" /></Button>
         </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
          
          {/* LEFT: File Tree Explorer */}
          {showFileTree && (
            <div className="flex-shrink-0 h-full border-r border-slate-800" style={{ minWidth: '220px', maxWidth: '300px' }}>
              <FileTree 
                projectId={projectId}
                files={files} 
                activeFileId={activeFile?.id || null} 
                onSelectFile={setActiveFile} 
                onRefresh={fetchProjectFiles}
              />
            </div>
          )}
          
          {/* Editor & PDF Layout Area */}
          <div className="flex-1 overflow-hidden h-full">
            {/* @ts-ignore */}
            <PanelGroup direction="horizontal">
              
              {/* CENTER: Code Editor */}
              <Panel defaultSize={50} minSize={20}>
            <div className="h-full flex flex-col">
              <div className="h-9 border-b border-slate-800 flex items-center px-4 bg-[#252526]">
                <div className="text-xs font-mono text-slate-400 tracking-tight bg-[#1e1e1e] h-full px-4 border-t-2 border-t-blue-500 flex items-center gap-2">
                   {activeFile?.path || 'No file selected'}
                </div>
              </div>
              <div className="flex-1 bg-[#1e1e1e] relative flex items-center justify-center">
                {!activeFile ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600">
                     <p>Select a file to view or edit</p>
                  </div>
                ) : activeFile.path.match(/\.(png|jpg|jpeg|gif|svg)$/i) ? (
                  <div className="w-full h-full p-4 flex items-center justify-center bg-black/20">
                    <img src={activeFile.s3Url || ''} alt={activeFile.name} className="max-w-full max-h-full object-contain shadow-lg" />
                  </div>
                ) : activeFile.path.match(/\.pdf$/i) ? (
                  <div className="w-full h-full bg-black/20">
                    <iframe src={activeFile.s3Url || ''} className="w-full h-full border-none" title={activeFile.name} />
                  </div>
                ) : activeFile.path.match(/\.tex$/i) ? (
                  <div className="absolute inset-0">
                    <LatexMonaco 
                      projectId={projectId} 
                      fileId={activeFile.id} 
                      token={token} 
                      username={username}
                      onSave={triggerCompile}
                      onEditorMount={(editor) => { monacoEditorRef.current = editor; }}
                    />
                  </div>
                ) : (
                  <div className="text-slate-500 text-center space-y-4">
                    <FileImage className="w-12 h-12 mx-auto text-slate-700" />
                    <p>Preview not available for this file type</p>
                    {activeFile.s3Url && (
                       <Button variant="outline" className="text-slate-300" onClick={() => window.open(activeFile.s3Url || '', '_blank')}>Download File</Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Panel>
          
          <PanelResizeHandle className="w-1 bg-slate-800 hover:bg-blue-500 transition-colors cursor-col-resize active:bg-blue-600 focus:bg-blue-500 focus:outline-none" />
          
          {/* RIGHT: PDF View */}
          <Panel defaultSize={50} minSize={20}>
            <PdfPreview 
              pdfUrl={pdfUrl} 
              logs={compileLog} 
              errors={compileErrors}
              isCompiling={isCompiling} 
              onRefresh={triggerCompile}
            />
          </Panel>
          
            </PanelGroup>
          </div>
      </div>
    </div>
  );
}
