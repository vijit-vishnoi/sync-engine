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

  const [terminalOutput, setTerminalOutput] = useState<string>("");
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [languageId,setLanguageId]=useState<number>(71);

  const [isTerminalOpen,setIsTerminalOpen]=useState<boolean>(true);
  const [cooldown, setCooldown] = useState<number>(0);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const [activeUsers,setActiveUsers]=useState<{[key:string]:{name:string}}>({});
  const handleRemoteMessage = useCallback((remoteOperation: SyncMessage) => {
    if (!remoteOperation ) return;
    if(remoteOperation.type==='presence_state' && remoteOperation.activeUsers){
      const newUsersObj:{[key:string]:{name:string}}={};
      Object.entries(remoteOperation.activeUsers).forEach(([id,name])=>{
        if(id!==siteId){
          newUsersObj[id]={name:name as string};
        }
      });
      setActiveUsers(newUsersObj);
      return;
    }
    if(!engineRef.current || !monacoRef.current) return 
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
  }, [siteId]);
  const { isConnected, initialDoc, broadcastOperation,broadcastCursor,broadcastExecute } = useWebSocket(siteId, roomId!,displayName, handleRemoteMessage);


  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    };
  }, []);
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
    if (cooldown > 0) return;
    setIsExecuting(true);
    setIsTerminalOpen(true);
    setTerminalOutput("Executing code in the cloud...");
    
    broadcastExecute(languageId);
    setCooldown(2);
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    
    cooldownTimerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownTimerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
};
  return (
    <div className="editor-layout">
      
      <div className="editor-top-bar">
        <div className="top-bar-group">
          <span className="brand-title">SyncEngine</span>
          <div className="vertical-divider"></div>
          <span className="room-id-display">
            ID: <span>{roomId}</span>
          </span>
        </div>
        
        <div className="top-bar-group right">
          <div className="user-status-group" style={{ gap: '0' }}>
            
            {Object.entries(activeUsers).map(([id, user], index) => {
              let hash = 0;
              for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
              const colors = ['#FF5F56', '#FFBD2E', '#27C93F', '#0070F3', '#F81CE5'];
              const color = colors[Math.abs(hash) % colors.length];

              return (
                <div 
                  key={id} title={user.name}
                  style={{
                    width: '28px', height: '28px', borderRadius: '50%', backgroundColor: color,
                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: 'bold', border: '2px solid #252526',
                    marginLeft: index === 0 ? '0' : '-8px', zIndex: 10 - index
                  }}
                >
                  {user.name.substring(0, 2).toUpperCase()}
                </div>
              );
            })}
            
            <div 
              title={`${displayName} (You)`}
              style={{
                width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#555',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: 'bold', border: '2px solid #252526',
                marginLeft: Object.keys(activeUsers).length > 0 ? '-8px' : '0', zIndex: 0
              }}
            >
              {displayName.substring(0, 2).toUpperCase()}
            </div>
            
            <div 
              title={isConnected ? 'Connected' : 'Disconnected'}
              style={{
                width: '10px', height: '10px', borderRadius: '50%', 
                backgroundColor: isConnected ? '#4caf50' : '#f44336', 
                marginLeft: '10px', border: '2px solid #252526'
              }}
            ></div>
          </div>

          <div className="vertical-divider"></div>
          
          <select 
            value={languageId} 
            onChange={(e) => setLanguageId(Number(e.target.value))}
            className="language-dropdown"
          >
            <option value={71}>JavaScript</option>
            <option value={70}>Python</option>
            <option value={60}>Go</option>
            <option value={62}>Java</option>
            <option value={54}>C++</option>
            <option value={50}>C</option>
          </select>

          <button 
            onClick={handleRunCode} 
            disabled={isExecuting || cooldown > 0}
            title={cooldown > 0 ? `Cooldown (${cooldown}s)` : "Run Code"}
            className="icon-btn"
            style={{ opacity: (isExecuting || cooldown > 0) ? 0.5 : 1 }}
          >
            {cooldown > 0 ? (
              <span style={{ color: '#89d185', fontSize: '13px', fontWeight: 'bold', fontFamily: "'Consolas', monospace", padding: '0 4px' }}>
                {cooldown}s
              </span>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#89d185" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            )}
          </button>

          <div className="vertical-divider"></div>

          <button 
            onClick={leaveRoom}
            title="Leave Room"
            className="icon-btn"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d4d4d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>

      <div className="editor-wrapper">
        <Editor
          height="100%"
          language={getMonacoLanguage(languageId)}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 15,
            fontFamily: "'Fira Code', 'Consolas', monospace",
            padding:{top:16},
            scrollBeyondLastLine:false,
          }}
          onMount={handleEditorDidMount}
          onChange={handleEditorChange}
        />
      </div>

      <div 
        className="terminal-container"
        style={{ height: isTerminalOpen ? '220px' : '36px' }} 
      >
        <div 
          onClick={() => setIsTerminalOpen(!isTerminalOpen)}
          className={`terminal-header ${isTerminalOpen ? 'open' : ''}`}
        >
          <svg 
            width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"
            className={`terminal-chevron ${isTerminalOpen ? 'open' : ''}`}
          >
            <path d="M6 4L10 8L6 12" stroke="#888888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="terminal-title">Terminal Output</span>
        </div>

        <div 
          className="terminal-body"
          style={{ opacity: isTerminalOpen ? 1 : 0 }} 
        >
          {terminalOutput || "Ready."}
        </div>
      </div>
    </div>
  );
}