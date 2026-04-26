import { useState, useRef, useEffect, KeyboardEvent, MouseEvent } from 'react';
import { ChevronRight, ChevronDown, File, Folder, FileImage, MoreVertical, Trash, Edit, Download, FilePlus, FolderPlus, Upload, Loader2, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api, apiFormData } from '@/lib/api';
import { useToastStore } from '@/store/toastStore';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface FileNode {
  id: string;
  name: string;
  path: string;
  isFolder: boolean;
  content?: string | null;
  s3Url?: string | null;
}

interface TreeItem extends FileNode {
  children?: TreeItem[];
}

// Convert flat path array to nested tree
function buildFileTree(files: FileNode[]): TreeItem[] {
  const root: TreeItem[] = [];
  const map: Record<string, TreeItem> = {};

  const sorted = [...files].sort((a, b) => {
     if (a.isFolder === b.isFolder) return a.name.localeCompare(b.name);
     return a.isFolder ? -1 : 1; // Folders first
  });

  sorted.forEach(file => { map[file.path] = { ...file, children: file.isFolder ? [] : undefined }; });

  sorted.forEach(file => {
    const parts = file.path.split('/').filter(Boolean);
    if (parts.length > 1) {
      parts.pop();
      const parentPath = '/' + parts.join('/');
      const parent = map[parentPath];
      if (parent && parent.children) {
        parent.children.push(map[file.path]);
      } else {
        root.push(map[file.path]);
      }
    } else {
      root.push(map[file.path]);
    }
  });

  return root;
}

// File / Folder Icons
const getIcon = (node: TreeItem) => {
  if (node.isFolder) return <Folder className="w-4 h-4 text-emerald-400" />;
  const lPath = node.path.toLowerCase();
  if (lPath.endsWith('.tex')) return <FileText className="w-4 h-4 text-emerald-500" />;
  if (lPath.match(/\.(png|jpg|jpeg|gif|svg)$/)) return <FileImage className="w-4 h-4 text-blue-400" />;
  return <File className="w-4 h-4 text-slate-400" />;
};

interface TreeNodeProps {
  node: TreeItem;
  level: number;
  activeId: string | null;
  expandedFolders: Set<string>;
  toggleFolder: (id: string) => void;
  onSelect: (f: FileNode) => void;
  onContextMenu: (e: MouseEvent, node: TreeItem) => void;
  renameNodeId: string | null;
  onRenameSubmit: (id: string, newName: string) => void;
  onRenameCancel: () => void;
}

function TreeNode({ node, level, activeId, expandedFolders, toggleFolder, onSelect, onContextMenu, renameNodeId, onRenameSubmit, onRenameCancel }: TreeNodeProps) {
  const [editName, setEditName] = useState(node.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const isOpen = expandedFolders.has(node.id);

  const isActive = activeId === node.id;
  const isEditing = renameNodeId === node.id;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (editName.trim() && editName.trim() !== node.name) {
        onRenameSubmit(node.id, editName.trim());
      } else {
        onRenameCancel();
      }
    }
    if (e.key === 'Escape') {
      setEditName(node.name);
      onRenameCancel();
    }
  };

  const handleBlur = () => {
    if (editName.trim() && editName.trim() !== node.name) {
      onRenameSubmit(node.id, editName.trim());
    } else {
      onRenameCancel();
    }
  };

  const renderContent = () => {
    if (isEditing) {
      return (
        <input
          ref={inputRef}
          className="flex-1 bg-slate-900 border border-blue-500 rounded px-1 text-sm outline-none text-white h-5"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onClick={(e) => e.stopPropagation()}
        />
      );
    }
    return <span className="truncate flex-1">{node.name}</span>;
  };

  return (
    <div>
      <div 
        className={cn(
          "flex items-center gap-1.5 py-1 px-2 cursor-pointer hover:bg-slate-800/70 text-slate-300 transition-colors text-sm group select-none",
          isActive && !isEditing && "bg-[#094771] text-white font-medium"
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => {
          if (node.isFolder) toggleFolder(node.id);
          else onSelect(node);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          onContextMenu(e, node);
        }}
      >
        <div className="w-4 h-4 flex items-center justify-center shrink-0">
          {node.isFolder && (
            isOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          )}
        </div>
        {getIcon(node)}
        {renderContent()}
        {!isEditing && (
          <div className="opacity-0 group-hover:opacity-100 flex items-center pr-1 shrink-0 bg-transparent text-slate-400 hover:text-white" onClick={(e) => { e.stopPropagation(); onContextMenu(e, node); }}>
            <MoreVertical className="w-3.5 h-3.5" />
          </div>
        )}
      </div>
      
      {isOpen && node.children?.map(child => (
        <TreeNode 
          key={child.id} 
          node={child} 
          level={level + 1} 
          activeId={activeId} 
          expandedFolders={expandedFolders}
          toggleFolder={toggleFolder}
          onSelect={onSelect}
          onContextMenu={onContextMenu}
          renameNodeId={renameNodeId}
          onRenameSubmit={onRenameSubmit}
          onRenameCancel={onRenameCancel}
        />
      ))}
    </div>
  );
}

interface FileTreeProps {
  projectId: string;
  files: FileNode[];
  activeFileId: string | null;
  onSelectFile: (file: FileNode) => void;
  onRefresh: () => void;
}

export function FileTree({ projectId, files, activeFileId, onSelectFile, onRefresh }: FileTreeProps) {
  const [tree, setTree] = useState<TreeItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  
  // Initialize top-level folders to open by default once
  useEffect(() => {
    const initialExpanded = new Set<string>();
    files.filter(f => f.isFolder).forEach(f => initialExpanded.add(f.id));
    setExpandedFolders(initialExpanded);
  }, []); // Only run once on mount!
  
  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, node: TreeItem | null } | null>(null);
  
  // Inline actions
  const [renameNodeId, setRenameNodeId] = useState<string | null>(null);
  const [createNode, setCreateNode] = useState<{ isFolder: boolean, parentPath: string } | null>(null);
  const [createName, setCreateName] = useState("");
  const [nodeToDelete, setNodeToDelete] = useState<TreeItem | null>(null);

  const addToast = useToastStore((s) => s.add);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTree(buildFileTree(files));
  }, [files]);

  useEffect(() => {
    if (createNode && createInputRef.current) {
      createInputRef.current.focus();
    }
  }, [createNode]);

  // Handle outside click for context menu
  useEffect(() => {
    const hideContext = () => setContextMenu(null);
    document.addEventListener("click", hideContext);
    return () => document.removeEventListener("click", hideContext);
  }, []);

  const handleContextMenu = (e: MouseEvent, node: TreeItem) => {
    setContextMenu({ x: e.pageX, y: e.pageY, node });
  };

  // --- API Handlers ---
  const handleUploadFiles = async (uploadFiles: FileList) => {
    setIsUploading(true);
    let allSuccess = true;
    for (let i = 0; i < uploadFiles.length; i++) {
      const file = uploadFiles[i];
      const formData = new FormData();
      formData.append("file", file);
      // Determine target path; simple flat root for drag and drop for now
      formData.append("path", `/${file.name}`);
      
      const { error } = await apiFormData<{success: boolean}>(`/latex-projects/${projectId}/files/upload`, formData);
      if (error) {
        addToast({ title: `Failed to upload ${file.name}`, description: error, variant: "destructive" });
        allSuccess = false;
      }
    }
    
    setIsUploading(false);
    if (allSuccess && uploadFiles.length > 0) {
      addToast({ title: "Upload successful", variant: "success" });
    }
    onRefresh();
  };

  const handleCreateSubmit = async () => {
    if (!createNode || !createName.trim()) {
      setCreateNode(null);
      return;
    }

    const { isFolder, parentPath } = createNode;
    const name = createName.trim();
    const newPath = parentPath === '/' ? `/${name}` : `${parentPath}/${name}`;

    const { error } = await api<{ success: boolean; file: FileNode }>(`/latex-projects/${projectId}/files/create`, {
      method: 'POST',
      body: { name, path: newPath, isFolder }
    });

    if (error) {
      addToast({ title: "Failed to create", description: error, variant: "destructive" });
    } else {
      addToast({ title: `${isFolder ? 'Folder' : 'File'} created`, variant: "success" });
    }
    
    setCreateNode(null);
    setCreateName("");
    onRefresh();
  };

  const handleRenameSubmit = async (id: string, newName: string) => {
    const node = files.find(f => f.id === id);
    setRenameNodeId(null);
    
    if (!node) return;
    
    // Compute new path
    const parts = node.path.split('/');
    parts.pop();
    const parentPath = parts.join('/') || '';
    const newPath = `${parentPath}/${newName}`;

    const { error } = await api<{ success: boolean }>(`/latex-projects/${projectId}/files/rename`, {
      method: 'PATCH',
      body: { fileId: id, newName, newPath }
    });

    if (error) {
      addToast({ title: "Rename failed", description: error, variant: "destructive" });
    } else {
      addToast({ title: "Renamed successfully", variant: "success" });
      onRefresh();
    }
  };

  const handleDelete = async () => {
    if (!nodeToDelete) return;
    const node = nodeToDelete;
    
    const { error } = await api<{ success: boolean }>(`/latex-projects/${projectId}/files/delete?fileId=${node.id}`, {
      method: 'DELETE'
    });

    if (error) {
      addToast({ title: "Delete failed", description: error, variant: "destructive" });
    } else {
      addToast({ title: "Deleted securely", variant: "success" });
      onRefresh();
    }
    setNodeToDelete(null);
  };

  const handleDownload = (node: TreeItem) => {
    // Basic download trigger
    if (node.s3Url) {
      window.open(node.s3Url, '_blank');
    } else if (node.content) {
      const blob = new Blob([node.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = node.name;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // --- Drag & Drop Handlers ---
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleUploadFiles(e.dataTransfer.files);
    }
  };

  return (
    <div 
      className={cn(
        "h-full bg-[#181818] flex flex-col font-sans select-none overflow-hidden relative border-r border-slate-800 transition-colors",
        isDragging && "bg-slate-800/80 ring-2 ring-inset ring-blue-500"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Upload Progress Overlay */}
      {isUploading && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center flex-col gap-3">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="text-sm font-medium text-emerald-400">Uploading files...</p>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between py-2 px-3 border-b border-slate-800 shrink-0 bg-[#252526]">
        <span className="font-semibold text-xs tracking-wider uppercase text-slate-400">Files</span>
        <div className="flex items-center gap-0.5">
          <button onClick={() => setCreateNode({ isFolder: false, parentPath: '/' })} className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors" title="New File">
            <FilePlus className="w-4 h-4" />
          </button>
          <button onClick={() => setCreateNode({ isFolder: true, parentPath: '/' })} className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors" title="New Folder">
            <FolderPlus className="w-4 h-4" />
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors" title="Upload File">
            <Upload className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <input 
        type="file" 
        multiple 
        className="hidden" 
        ref={fileInputRef} 
        onChange={(e) => {
          if (e.target.files) handleUploadFiles(e.target.files);
          // reset input so same file can be uploaded again
          if (fileInputRef.current) fileInputRef.current.value = "";
        }}
      />

      <div className="flex-1 overflow-y-auto py-2 file-tree-scroll" onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.pageX, y: e.pageY, node: null }) }}>
        {tree.map(node => (
          <TreeNode 
            key={node.id} 
            node={node} 
            level={0} 
            activeId={activeFileId} 
            expandedFolders={expandedFolders}
            toggleFolder={toggleFolder}
            onSelect={onSelectFile}
            onContextMenu={handleContextMenu}
            renameNodeId={renameNodeId}
            onRenameSubmit={handleRenameSubmit}
            onRenameCancel={() => setRenameNodeId(null)}
          />
        ))}

        {/* Inline Create Input */}
        {createNode && (
          <div className="flex items-center gap-1.5 py-1 px-2 text-sm pl-8">
            <div className="w-4 h-4 flex items-center justify-center shrink-0" />
            {createNode.isFolder ? <Folder className="w-4 h-4 text-emerald-400" /> : <File className="w-4 h-4 text-slate-400" />}
            <input
              ref={createInputRef}
              className="flex-1 bg-slate-900 border border-blue-500 rounded px-1 text-sm outline-none text-white h-5"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateSubmit();
                if (e.key === 'Escape') { setCreateNode(null); setCreateName(""); }
              }}
              onBlur={handleCreateSubmit}
              placeholder={createNode.isFolder ? "folder name" : "file.tex"}
            />
          </div>
        )}

        {tree.length === 0 && !createNode && (
          <div className="text-center text-xs text-slate-500 py-6 px-4 flex flex-col items-center gap-2">
            <Upload className="w-8 h-8 text-slate-700 mx-auto" />
            <p>Drag and drop files here to upload</p>
          </div>
        )}
      </div>

      {/* Context Menu floating absolutely fixed to page */}
      {contextMenu && (
        <div 
          className="fixed z-50 bg-[#252526] border border-slate-700 rounded-md shadow-xl py-1 w-48 text-sm"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.node ? (
            <>
              <button 
                className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-blue-600 hover:text-white flex items-center gap-2"
                onClick={() => { setRenameNodeId(contextMenu.node!.id); setContextMenu(null); }}
              >
                <Edit className="w-4 h-4" /> Rename
              </button>
              <button 
                className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-blue-600 hover:text-white flex items-center gap-2"
                onClick={() => { handleDownload(contextMenu.node!); setContextMenu(null); }}
              >
                <Download className="w-4 h-4" /> Download
              </button>
              <div className="h-px bg-slate-700 my-1 mx-2" />
              <button 
                className="w-full text-left px-3 py-1.5 text-red-400 hover:bg-red-500 hover:text-white flex items-center gap-2"
                onClick={() => { setNodeToDelete(contextMenu.node!); setContextMenu(null); }}
              >
                <Trash className="w-4 h-4" /> Delete
              </button>
            </>
          ) : (
            <>
              <button 
                className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-blue-600 hover:text-white flex items-center gap-2"
                onClick={() => { setCreateNode({ isFolder: false, parentPath: '/' }); setContextMenu(null); }}
              >
                <FilePlus className="w-4 h-4" /> New File
              </button>
              <button 
                className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-blue-600 hover:text-white flex items-center gap-2"
                onClick={() => { setCreateNode({ isFolder: true, parentPath: '/' }); setContextMenu(null); }}
              >
                <FolderPlus className="w-4 h-4" /> New Folder
              </button>
            </>
          )}
        </div>
      )}
      {/* Delete Confirmation Dialog */}
      <Dialog open={!!nodeToDelete} onOpenChange={(open) => !open && setNodeToDelete(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete {nodeToDelete?.isFolder ? "Folder" : "File"}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-semibold text-foreground">{nodeToDelete?.name}</span>? 
              {nodeToDelete?.isFolder && " This will delete all files and folders inside it."}
              <br/><br/>This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setNodeToDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
