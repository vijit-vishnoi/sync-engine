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
          
        />
      </div>

    </div>
  );
}

export default App;