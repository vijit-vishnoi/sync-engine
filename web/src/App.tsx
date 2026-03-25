import { useState, useRef, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { useWebSocket } from './hooks/useWebSocket';
import { CRDTEngine } from './core/engine';
import './App.css';
import type { SyncMessage } from './types/crdt';

const generateSiteId = () => Math.random().toString(36).substring(2, 9);

function App() {
  const [siteId] = useState(generateSiteId());
  const engineRef = useRef<CRDTEngine | null>(null);
  const monacoRef=useRef<any>(null);
  const isRemoteUpdate=useRef(false);
  const handleRemoteMessage=useCallback((remoteOperation:SyncMessage)=>{

    if(!remoteOperation || !remoteOperation.char||!engineRef.current || !monacoRef.current) return ;
    const engine=engineRef.current;
    const editor=monacoRef.current;
    const model=editor.getModel();
    
    isRemoteUpdate.current=true;

    if(remoteOperation.type=='insert'){
      const index=engine.remoteInsert(remoteOperation.char);
      const pos=model.getPositionAt(index);
      const text=String.fromCharCode(remoteOperation.char.value);

      editor.executeEdits("remote",[{
        range:{startLineNumber:pos.lineNumber,startColumn:pos.column,endLineNumber:pos.lineNumber,endColumn:pos.column},
        text:text,
        forceMoveMarkers:true
      }]);
    } else if(remoteOperation.type=='delete'){
      const index=engine.remoteDelete(remoteOperation.char);
      if(index!=-1){
        const startPos=model.getPositionAt(index);
        const endPos=model.getPositionAt(index+1);

        editor.executeEdits("remote",[{
          range:{startLineNumber:startPos.lineNumber,startColumn:startPos.column,endLineNumber:endPos.lineNumber,endColumn:endPos.column},
          text:""
        }]);
      }
    }
    isRemoteUpdate.current=false;
  },[]);
  const {isConnected,initialDoc,broadcastOperation}=useWebSocket(siteId,handleRemoteMessage);
  useEffect(()=>{
    if(!engineRef.current && initialDoc){
      console.log("Initializing CRDT Engine with server state...");
      engineRef.current=new CRDTEngine(siteId,initialDoc);
    }
  },[initialDoc,siteId]);

  const handleEditorDidMount=(editor:any,monaco:any)=>{
    monacoRef.current=editor;
    editor.getModel().setEOL(0);
  };

  const handleEditorChange=(value:string | undefined,event:any)=>{
    const engine=engineRef.current;
    if(!engine) return;
    if(isRemoteUpdate.current)return
    event.changes.forEach((change:any)=>{
      const index=change.rangeOffset;
      const text=change.text;
      const length=change.rangeLength;
      if(length>0){
        for(let i=0;i<length;i++){
          const deleteChar=engine.localDelete(index);
          if(deleteChar)broadcastOperation('delete',deleteChar);
        }
      }
      if(text.length>0){
        for(let i=0;i<text.length; i++){
          const charValue=text.charCodeAt(i);
          let newChar=engine.localInsert(index+i,charValue);
          broadcastOperation('insert',newChar)
        }
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