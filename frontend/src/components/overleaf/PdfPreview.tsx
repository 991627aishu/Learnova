
import { FileDown, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PdfPreviewProps {
  pdfUrl: string | null;
  logs: string | null;
  errors?: any[];
  isCompiling: boolean;
  onRefresh: () => void;
}

export function PdfPreview({ pdfUrl, logs, errors = [], isCompiling, onRefresh }: PdfPreviewProps) {
  return (
    <div className="h-full flex flex-col bg-slate-900 overflow-hidden relative border-l border-slate-800">
      
      {/* Top Banner Toolbar */}
      <div className="flex items-center justify-between p-2 pl-4 border-b border-slate-800 bg-[#1e1e1e] shadow-sm z-10 w-full shrink-0">
        <span className="font-semibold text-xs tracking-wider uppercase text-slate-400">PDF Output</span>
        
        <div className="flex gap-2">
          {isCompiling && (
            <div className="flex items-center gap-2 text-primary text-xs px-2 mr-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Compiling...
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={onRefresh} className="h-8 w-8 text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition" disabled={isCompiling}>
            <RefreshCw className={`w-4 h-4 ${isCompiling ? "animate-spin" : ""}`} />
          </Button>
          {pdfUrl && (
            <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 transition">
              <a href={pdfUrl} download="compilation.pdf">
                <FileDown className="w-4 h-4" />
              </a>
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-[#2d2d2d] relative group">
        
        {/* State Displayers */}
        {logs && !pdfUrl ? (
          <div className="p-0 h-full overflow-auto bg-[#1a0606] flex flex-col">
            <div className="p-4 border-b border-red-900/30 bg-[#250d0d] flex items-center gap-3 shrink-0">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <div>
                <h2 className="text-sm font-black tracking-widest uppercase text-red-200">Compilation Failed</h2>
                <p className="text-[10px] text-red-400/60 font-bold uppercase">Check errors below</p>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto">
              {errors.length > 0 ? (
                <div className="divide-y divide-red-900/20">
                  {errors.map((err, i) => (
                    <div key={i} className="p-4 hover:bg-red-900/10 transition-colors group">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black bg-red-500 text-white px-2 py-0.5 rounded uppercase">Line {err.line || '??'}</span>
                      </div>
                      <p className="text-xs font-mono text-red-300 leading-relaxed">{err.message}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-red-300 font-mono text-xs whitespace-pre-wrap break-words leading-relaxed">
                  {logs}
                </div>
              )}
            </div>
          </div>
        ) : isCompiling && !pdfUrl ? (
          <div className="absolute inset-0 flex flex-col gap-4 items-center justify-center text-slate-500">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-sm tracking-widest uppercase font-semibold">Compiling...</p>
          </div>
        ) : pdfUrl ? (
          <>
            {isCompiling && (
              <div className="absolute top-4 right-4 bg-black/60 backdrop-blur text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-2 z-50 animate-pulse border border-white/10">
                <Loader2 className="w-4 h-4 animate-spin" /> Compiling...
              </div>
            )}
            <iframe 
              src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1`} 
              className="w-full h-full border-none shadow-2xl transition-opacity" 
              title="PDF output"
            />
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col gap-3 items-center justify-center text-slate-500 select-none">
            <RefreshCw className="w-12 h-12 mb-2 text-slate-700" />
            <h3 className="font-bold tracking-wider">NO PDF GENERATED</h3>
            <p className="text-sm text-center max-w-[200px]">Click compile or press Ctrl+S to render your LaTeX project.</p>
            <Button variant="outline" size="sm" onClick={onRefresh} className="mt-4 border-slate-700 text-slate-300 hover:bg-slate-800">
              Compile Now
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}
