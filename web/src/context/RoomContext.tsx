import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface RoomContextType {
  displayName: string;
  setDisplayName: (name: string) => void;
  roomId: string | null;
  joinRoom: (id: string) => void;
  leaveRoom: () => void;
}

const RoomContext = createContext<RoomContextType | null>(null);

export const RoomProvider = ({ children }: { children: ReactNode }) => {
  const [displayName, setDisplayNameState] = useState(localStorage.getItem('syncengine_name') || '');
  
  const [roomId, setRoomId] = useState<string | null>(window.location.pathname.slice(1) || null);

  const setDisplayName = (name: string) => {
    localStorage.setItem('syncengine_name', name);
    setDisplayNameState(name);
  };

  const joinRoom = (id: string) => {
    window.history.pushState({}, '', '/' + id); 
    setRoomId(id);
  };

  const leaveRoom = () => {
    window.history.pushState({}, '', '/');
    setRoomId(null);
  };

  useEffect(() => {
    const handlePopState = () => setRoomId(window.location.pathname.slice(1) || null);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <RoomContext.Provider value={{ displayName, setDisplayName, roomId, joinRoom, leaveRoom }}>
      {children}
    </RoomContext.Provider>
  );
};

export const useRoom = () => {
  const context = useContext(RoomContext);
  if (!context) throw new Error("useRoom must be used within a RoomProvider");
  return context;
};