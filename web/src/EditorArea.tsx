import { useState, useRef, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { useWebSocket } from './hooks/useWebSocket';
import { CRDTEngine } from './core/engine';
import { useRoom } from './context/RoomContext';
import type { SyncMessage } from './types/crdt';

const generateId = () => Math.random().toString(36).substring(2, 9);


const getMonacoLanguage = (id: number) => {
  switch (id) {
    case 71: return "javascript";
    case 70: return "python";
    case 60: return "go";
    case 62: return "java";
    case 54: return "cpp";
    case 50: return "c";
    default: return "javascript";
  }
};
export function EditorArea() {
  const { roomId, displayName, leaveRoom } = useRoom();
  
  const [siteId] = useState(generateId());
  const engineRef = useRef<CRDTEngine | null>(null);
  const monacoRef = useRef<any>(null);
  const isRemoteUpdate = useRef(false);
  const remoteCursorsRef=useRef<{[key:string]:any}>({});
  const handleRemoteMessage = useCallback((remoteOperation: SyncMessage) => {
    if (!remoteOperation || !engineRef.current || !monacoRef.current) return;
    const engine = engineRef.current;
    const editor = monacoRef.current;
    const model = editor.getModel();
    
    isRemoteUpdate.current = true;
    try {
      if (remoteOperation.type === 'insert' && remoteOperation.char) {
        const index = engine.remoteInsert(remoteOperation.char);
        const pos = model.getPositionAt(index);
        const text = String.fromCharCode(remoteOperation.char.value);

        editor.executeEdits("remote", [{
          range: { startLineNumber: pos.lineNumber, startColumn: pos.column, endLineNumber: pos.lineNumber, endColumn: pos.column },
          text: text,
          forceMoveMarkers: true
        }]);
      } else if (remoteOperation.type === 'delete' && remoteOperation.char) {
        const index = engine.remoteDelete(remoteOperation.char);
        if (index !== -1) {
          const startPos = model.getPositionAt(index);
          const endPos = model.getPositionAt(index + 1);

          editor.executeEdits("remote", [{
            range: { startLineNumber: startPos.lineNumber, startColumn: startPos.column, endLineNumber: endPos.lineNumber, endColumn: endPos.column },
            text: ""
          }]);
        }
      } else if(remoteOperation.type==='cursor'){
            const {lineNumber,column,senderId,displayName:senderName}=remoteOperation;
            if(!lineNumber || !column || !senderId) return ;
            let hash=0;
            for(let i=0;i<senderId.length;i++){
                hash=senderId.charCodeAt(i)+((hash<<5)-hash);
            }
            const colorIndex=Math.abs(hash)%5;
            if (!remoteCursorsRef.current[senderId]){
                remoteCursorsRef.current[senderId]=editor.createDecorationsCollection([]);
            }
            remoteCursorsRef.current[senderId].set([{
                range:{startLineNumber:lineNumber,startColumn:column,endLineNumber:lineNumber,
                endColumn:column+1},
                options:{
                    className:`remote-cursor-bar cursor-color-${colorIndex}`,
                    after:{
                        content:`${senderName}`,
                        inlineClassName:`remote-cursor-name-flag flag-color-${colorIndex}`
                    }
                }
            }])
        }
        else if(remoteOperation.type==='terminal_output'){
          setIsExecuting(false);
          setTerminalOutput(remoteOperation.output ||"Execution finished.");
      } 
    }finally {
      isRemoteUpdate.current = false;
    }
  }, []);

  const [terminalOutput, setTerminalOutput] = useState<string>("");
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [languageId,setLanguageId]=useState<number>(71);

  const [isTerminalOpen,setIsTerminalOpen]=useState<boolean>(true);

  const { isConnected, initialDoc, broadcastOperation,broadcastCursor,broadcastExecute } = useWebSocket(siteId, roomId!, handleRemoteMessage);
  
  useEffect(() => {
    if (!engineRef.current && initialDoc !== null) {
      console.log("Initializing CRDT Engine with server state...");
      engineRef.current = new CRDTEngine(siteId, initialDoc);
      if (monacoRef.current && initialDoc.length > 0) {
        const text = initialDoc.map(char => String.fromCharCode(char.value)).join('');
        isRemoteUpdate.current = true;
        try {
          monacoRef.current.setValue(text);
        } finally {
          isRemoteUpdate.current = false;
        }
      }
    }
  }, [initialDoc, siteId]);

  const handleEditorDidMount = (editor: any) => {
    monacoRef.current = editor;
    editor.getModel().setEOL(0);
    if (engineRef.current && engineRef.current.document.length > 0) {
      const text = engineRef.current.document.map(char => String.fromCharCode(char.value)).join('');
      isRemoteUpdate.current = true;
      try {
        editor.setValue(text);
      } finally {
        isRemoteUpdate.current = false;
      }
    }
    editor.onDidChangeCursorPosition((e:any)=>{
        if(!isRemoteUpdate.current){
            broadcastCursor(e.position.lineNumber,e.position.column,displayName);
        }
    })
  };

  const handleEditorChange = (_value: string | undefined, event: any) => {
    const engine = engineRef.current;
    if (!engine) return;
    if (isRemoteUpdate.current) return;
    
    event.changes.forEach((change: any) => {
      const index = change.rangeOffset;
      const text = change.text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const length = change.rangeLength;
      
      if (length > 0) {
        for (let i = 0; i < length; i++) {
          const deleteChar = engine.localDelete(index);
          if (deleteChar) broadcastOperation('delete', deleteChar);
        }
      }
      if (text.length > 0) {
        let currentInsertIndex=index;
        for (let i = 0; i < text.length; i++) {
          const charValue = text.charCodeAt(i);
          let newChar = engine.localInsert(currentInsertIndex, charValue);
          broadcastOperation('insert', newChar);
          currentInsertIndex++;
        }
      }
    });
  };
  const handleRunCode = () => {
    setIsExecuting(true);
    setIsTerminalOpen(true);
    setTerminalOutput("Executing code in the cloud...");
    
    broadcastExecute(languageId);
};
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#1e1e1e' }}>
      
      <div style={{ padding: '10px 20px', color: 'white', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <h2 style={{ margin: 0 }}>SyncEngine</h2>
          <span style={{ backgroundColor: '#333', padding: '4px 10px', borderRadius: '4px', fontSize: '14px' }}>
            Room: {roomId}
          </span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <select 
            value={languageId} 
            onChange={(e) => setLanguageId(Number(e.target.value))}
            style={{ backgroundColor: '#333', color: 'white', border: '1px solid #555', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer' }}
          >
            <option value={71}>JavaScript</option>
            <option value={70}>Python 3</option>
            <option value={60}>Go</option>
          </select>
          <button 
            onClick={handleRunCode} 
            disabled={isExecuting}
            style={{ backgroundColor: isExecuting ? 'gray' : '#4CAF50', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: isExecuting ? 'not-allowed' : 'pointer' }}
          >
            {isExecuting ? 'Running...' : '▶ Run Code'}
          </button>
          <span style={{ color: isConnected ? '#4caf50' : '#f44336', fontSize: '14px' }}>
            ● {isConnected ? 'Connected' : 'Disconnected'}
          </span>
          <span style={{ color: '#888', fontSize: '14px' }}>
            Typing as: <strong style={{color: 'white'}}>{displayName}</strong>
          </span>
          <button 
            onClick={leaveRoom}
            style={{ backgroundColor: '#f44336', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}
          >
            Leave Room
          </button>
        </div>
      </div>

      <div style={{ flexGrow: 1,minHeight: 0, overflow: 'hidden' }}>
        <Editor
          height="100%"
          language={getMonacoLanguage(languageId)}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 15,
            fontFamily: "'Fira Coda','Consolas',monospace",
            padding:{top:16},
            scrollBeyondLastLine:false,
          }}
          onMount={handleEditorDidMount}
          onChange={handleEditorChange}
        />
      </div>
      <div style={{ 
          height: isTerminalOpen ? '220px' : '55px', 
          backgroundColor: '#1e1e1e', 
          borderTop: '1px solid #3c3c3c', 
          display: 'flex', 
          flexDirection: 'column',
          transition: 'height 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden' 
      }}>
        
        <div 
          onClick={() => setIsTerminalOpen(!isTerminalOpen)}
          style={{ 
            padding: '8px 20px', 
            borderBottom: isTerminalOpen ? '1px solid #2d2d2d' : 'none', 
            display: 'flex', 
            alignItems: 'center',
            cursor: 'pointer',
            userSelect: 'none',
            minHeight: '35px',
            backgroundColor: '#1e1e1e'
          }}
        >
          <svg 
            width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"
            style={{ 
              marginRight: '8px', 
              transform: isTerminalOpen ? 'rotate(90deg)' : 'rotate(0deg)', 
              transition: 'transform 0.2s ease' 
            }}
          >
            <path d="M6 4L10 8L6 12" stroke="#888888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>

          <span style={{ color: '#e0e0e0', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>
            Terminal Output
          </span>
        </div>

        <div style={{ 
            flexGrow: 1, 
            padding: '15px 20px', 
            overflowY: 'auto', 
            color: '#d4d4d4', 
            fontFamily: "'Consolas', 'Courier New', monospace", 
            fontSize: '14px',
            lineHeight: '1.5',
            whiteSpace: 'pre-wrap',
            textAlign: 'left',  
            opacity: isTerminalOpen ? 1 : 0,
            transition: 'opacity 0.2s ease'
        }}>
            {terminalOutput || "Ready."}
        </div>
      </div>
    </div>
  );
}