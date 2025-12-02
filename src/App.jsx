import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import ExcuseGenerator from './components/ExcuseGenerator';
import CollaborativeMode from './components/CollaborativeMode';
import ExcuseHistory from './components/ExcuseHistory';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function App() {
  const [socket, setSocket] = useState(null);
  const [mode, setMode] = useState('solo'); // 'solo' or 'collaborative'
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');

  useEffect(() => {
    const newSocket = io(API_URL);
    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Generador de Excusas Absurdas</h1>
        <p className="subtitle">Creadas con IA - De lo creíble a lo cósmico</p>
      </header>

      <div className="mode-selector">
        <button 
          className={`mode-btn ${mode === 'solo' ? 'active' : ''}`}
          onClick={() => setMode('solo')}
        >
          Modo Individual
        </button>
        <button 
          className={`mode-btn ${mode === 'collaborative' ? 'active' : ''}`}
          onClick={() => setMode('collaborative')}
        >
          Modo Colaborativo
        </button>
      </div>

      <main className="main-content">
        {mode === 'solo' ? (
          <>
            <ExcuseGenerator 
              apiUrl={API_URL}
              socket={socket}
              roomId={null}
              playerName={null}
            />
            <ExcuseHistory apiUrl={API_URL} />
          </>
        ) : (
          <CollaborativeMode 
            apiUrl={API_URL}
            socket={socket}
            roomId={roomId}
            setRoomId={setRoomId}
            playerName={playerName}
            setPlayerName={setPlayerName}
          />
        )}
      </main>

      <footer className="app-footer">
        <p>Powered by Google Gemini 2.0 Flash</p>
      </footer>
    </div>
  );
}

export default App;
