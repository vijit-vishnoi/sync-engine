import { useState } from 'react';
import { RoomProvider, useRoom } from './context/RoomContext';
import { EditorArea } from './EditorArea'; 
import './App.css';

const generateId = () => Math.random().toString(36).substring(2, 9);

function Lobby() {
  const { joinRoom } = useRoom();
  const [joinInput, setJoinInput] = useState('');

  return (
    <div className="lobby-container">
      <div className="hero">
        <h1 className="title">Sync<span className="accent">Engine</span></h1>
        <p className="subtitle">A real-time, distributed collaborative code editor.</p>
      </div>

      <div className="card-container">
        <div className="card">
          <h3>Create a Workspace</h3>
          <p>Start a fresh, isolated coding session.</p>
          <button onClick={() => joinRoom(generateId())} className="primary-btn">
            + New Room
          </button>
        </div>

        <div className="card">
          <h3>Join Existing</h3>
          <p>Have a room code? Enter it below.</p>
          <div className="input-group">
            <input 
              type="text" 
              placeholder="e.g., abc-123" 
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value)}
            />
            <button onClick={() => joinInput && joinRoom(joinInput)} className="secondary-btn">
              Join
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Gateway() {
  const { setDisplayName } = useRoom();
  const [nameInput, setNameInput] = useState('');

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Who is typing?</h2>
        <p>Enter your display name to enter the workspace.</p>
        <input 
          type="text" 
          placeholder="Your Name" 
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          autoFocus
        />
        <button onClick={() => nameInput && setDisplayName(nameInput)} className="primary-btn full-width">
          Enter Workspace
        </button>
      </div>
    </div>
  );
}

function AppContent() {
  const { roomId, displayName } = useRoom();

  if (!roomId) return <Lobby />;

  if (roomId && !displayName) return <Gateway />;

  return <EditorArea />;
}

export default function App() {
  return (
    <RoomProvider>
      <AppContent />
    </RoomProvider>
  );
}