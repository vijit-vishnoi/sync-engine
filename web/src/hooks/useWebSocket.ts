import { useEffect, useRef, useState, useCallback } from 'react';
import type { SyncMessage, CRDTChar } from '../types/crdt';

const WS_URL = 'ws://localhost:8080/ws';

export function useWebSocket(localSiteId: string) {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  

  const [remoteOperation, setRemoteOperation] = useState<SyncMessage | null>(null);
  const [initialDoc, setInitialDoc] = useState<CRDTChar[]>([]);

  useEffect(() => {
    ws.current = new WebSocket(WS_URL);

    ws.current.onopen = () => {
      console.log('Connected to SyncEngine Hub');
      setIsConnected(true);
    };

    ws.current.onclose = () => {
      console.log('Disconnected from SyncEngine Hub');
      setIsConnected(false);
    };

    ws.current.onmessage = (event) => {
      const message: SyncMessage = JSON.parse(event.data);

      if (message.type === 'init' && message.fullDoc) {
        setInitialDoc(message.fullDoc);
        return;
      }

      if (message.char && message.char.position.length > 0) {
        const messageSiteId = message.char.position[0].siteId;
        if (messageSiteId === localSiteId) {
          return; 
        }
      }

      setRemoteOperation(message);
    };

    return () => {
      ws.current?.close();
    };
  }, [localSiteId]);

  const broadcastOperation = useCallback((type: 'insert' | 'delete', char: CRDTChar) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      const message: SyncMessage = { type, char };
      ws.current.send(JSON.stringify(message));
    }
  }, []);

  return {
    isConnected,
    initialDoc,
    remoteOperation,
    broadcastOperation,
  };
}