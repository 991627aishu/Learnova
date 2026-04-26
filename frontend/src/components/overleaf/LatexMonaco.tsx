import { useRef, useEffect } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';
import { Loader2 } from 'lucide-react';

interface LatexMonacoProps {
  projectId: string;
  fileId: string;
  onSave?: () => void;
  token?: string;
  username: string;
  color?: string;
  onEditorMount?: (editor: any) => void;
}

export function LatexMonaco({ projectId, fileId, onSave, token, username, color = "#ff7f50", onEditorMount }: LatexMonacoProps) {
  const monaco = useMonaco();
  const editorRef = useRef<any>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);

  useEffect(() => {
    if (!editorRef.current || !monaco) return;

    // Room ID combines project and logical file id allowing multi-file distinct collaborations concurrently
    const roomName = `project/${projectId}/file/${fileId}`;
    const wsUrl = import.meta.env.VITE_WS_URL || `ws://${window.location.hostname}:3001/yjs/`;

    // 1. Initialize Document
    const ydoc = new Y.Doc();
    const ytext = ydoc.getText('monaco');

    // 2. Connect to local Express WebSocket Yjs endpoint
    const provider = new WebsocketProvider(wsUrl, roomName, ydoc, {
      connect: true,
      params: token ? { auth: token } : {}
    });

    providerRef.current = provider;

    // Share cursor presence info
    provider.awareness.setLocalStateField('user', {
      name: username,
      color: color
    });

    // 3. Bind Yjs to Editor Model
    const model = editorRef.current.getModel();
    bindingRef.current = new MonacoBinding(
      ytext,
      model,
      new Set([editorRef.current]),
      provider.awareness
    );

    return () => {
      // Cleanup
      bindingRef.current?.destroy();
      provider.disconnect();
      ydoc.destroy();
    };
  }, [projectId, fileId, monaco, token, username, color]);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;

    if (onEditorMount) onEditorMount(editor);

    // Hook up Ctrl+S exactly like VS Code
    // @ts-ignore - Monaco bindings can occasionally be undefined during init
    editor.addCommand(monaco?.KeyMod?.CtrlCmd | monaco?.KeyCode?.KeyS, () => {
      if (onSave) onSave();
    });
  };

  return (
    <div className="relative w-full h-full bg-[#1e1e1e]">
      <Editor
        height="100%"
        defaultLanguage="latex"
        theme="vs-dark"
        options={{
          minimap: { enabled: true, renderCharacters: false, scale: 0.75 },
          wordWrap: 'on',
          fontSize: 14,
          lineHeight: 1.6,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Menlo', monospace",
          renderWhitespace: 'boundary',
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on'
        }}
        onMount={handleEditorDidMount}
        loading={
          <div className="flex h-full items-center justify-center text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        }
      />
    </div>
  );
}
