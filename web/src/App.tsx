import { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useWebSocket } from './hooks/useWebSocket';
import { CRDTEngine } from './core/engine';
import './App.css';

const generateSiteId = () => Math.random().toString(36).substring(2, 9);

function App() {
  const [siteId] = useState(generateSiteId());
  const engineRef = useRef<CRDTEngine | null>(null);
  const {isConnected,initialDoc,remoteOperation,broadcastOperation}=useWebSocket(siteId);
  useEffect(() => {
    if (!engineRef.current && initialDoc) {
      console.log("Initializing CRDT Engine with server state...");
      engineRef.current=new CRDTEngine(siteId,initialDoc);
    }
  }, [initialDoc,siteId]);
  const monacoRef=useRef<any>(null);
  const handleEditorDidMount=(editor:any,monaco:any)=>{
    monacoRef.current=editor;
  };

  const handleEditorChange=(value:string | undefined,event:any)=>{
    const engine=engineRef.current;
    if(!engine)return;
    event.changes.forEach((change:any)=>{
      const index=change.rangeOffset;
      const text=change.text;
      if(text.length>0){
        for(let i=0;i<text.length; i++){
          const charValue=text.charCodeAt(i);
          let newChar=engine.localInsert(index+i,charValue);
          broadcastOperation('insert',newChar)
          console.log(`Inserted '${text}' at index ${index}`);
        }
      } else{
        let length=change.rangeLength;
        for(let i=0;i<length;i++){
          const deleteChar=engine.localDelete(index)
          if(deleteChar) broadcastOperation('delete',deleteChar);
        }
        console.log(`Deleted ${change.rangeLength} characters at index ${index}`);
      }
    });
  };
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#1e1e1e' }}>
      
      <div style={{ padding: '10px 20px', color: 'white', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between' }}>
        <h2>SyncEngine</h2>
        <div>
          Status: <span style={{ color: isConnected ? '#4caf50' : '#f44336' }}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
          <span style={{ marginLeft: '15px', color: '#888' }}>Site ID: {siteId}</span>
        </div>
      </div>

      <div style={{ flexGrow: 1 }}>
        <Editor
          height="100%"
          defaultLanguage="javascript"
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 16,
          }}
          onMount={handleEditorDidMount}
          onChange={handleEditorChange}
        />
      </div>

    </div>
  );
}

export default App;