import { useState, useEffect } from 'react';
import ExcuseGenerator from './ExcuseGenerator';
import './CollaborativeMode.css';

const CollaborativeMode = ({ apiUrl, socket, roomId, setRoomId, playerName, setPlayerName }) => {
  const [isInRoom, setIsInRoom] = useState(false);
  const [messages, setMessages] = useState([]);
  const [roomExcuses, setRoomExcuses] = useState([]);
  const [players, setPlayers] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [challengeLevel, setChallengeLevel] = useState(3);
  const [activeBattle, setActiveBattle] = useState(null);
  const [battleResult, setBattleResult] = useState(null);
  const [myLastExcuseId, setMyLastExcuseId] = useState(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('player-joined', (data) => {
      setMessages(prev => [...prev, { type: 'info', text: data.message }]);
      if (!players.includes(data.playerName)) {
        setPlayers(prev => [...prev, data.playerName]);
      }
    });

    socket.on('player-left', (data) => {
      setMessages(prev => [...prev, { type: 'info', text: data.message }]);
      setPlayers(prev => prev.filter(p => p !== data.playerName));
    });

    socket.on('new-excuse', (data) => {
      setRoomExcuses(prev => [data, ...prev]);
      setMessages(prev => [...prev, { 
        type: 'excuse', 
        text: `${data.playerName} generó una excusa de nivel ${data.absurdityLevel}`,
        excuse: data.excuse
      }]);
    });

    socket.on('challenge-received', (data) => {
      setMessages(prev => [...prev, {
        type: 'challenge',
        text: data.message
      }]);
    });

    socket.on('vote-update', (data) => {
      setRoomExcuses(prev => prev.map(excuse => 
        excuse._id === data.excuseId.toString() || excuse.id === data.excuseId.toString()
          ? { ...excuse, votes: data.votes }
          : excuse
      ));
      setMessages(prev => [...prev, {
        type: 'vote',
        text: `${data.playerName} votó por la excusa de ${data.excuseOwner}`
      }]);
    });

    socket.on('battle-started', (data) => {
      setMessages(prev => [...prev, {
        type: 'battle',
        text: data.message
      }]);
    });

    socket.on('battle-created', (data) => {
      setActiveBattle({
        id: data.battleId,
        challenger: data.challenger,
        challenged: data.challenged,
        level: data.level,
        theme: data.theme,
        challengerSubmitted: false,
        challengedSubmitted: false
      });
      setMessages(prev => [...prev, {
        type: 'battle',
        text: data.message
      }]);
    });

    socket.on('battle-excuse-received', (data) => {
      setActiveBattle(prev => {
        if (!prev || prev.id !== data.battleId) return prev;
        return {
          ...prev,
          challengerSubmitted: data.submittedBy === prev.challenger,
          challengedSubmitted: data.submittedBy === prev.challenged
        };
      });
      setMessages(prev => [...prev, {
        type: 'info',
        text: `${data.submittedBy} envió su excusa. Esperando a ${data.waitingFor}...`
      }]);
    });

    socket.on('battle-judged', (data) => {
      console.log('Battle judged data received:', data);
      console.log('Challenger situation:', data.challengerSituation);
      console.log('Challenged situation:', data.challengedSituation);
      
      setBattleResult({
        winner: data.winner,
        analysis: data.analysis,
        challengerExcuse: data.challengerExcuse,
        challengedExcuse: data.challengedExcuse,
        challengerSituation: data.challengerSituation,
        challengedSituation: data.challengedSituation
      });
      setActiveBattle(null);
      setMessages(prev => [...prev, {
        type: 'battle-result',
        text: `¡${data.winner} ganó la batalla! ${data.analysis.reason}`
      }]);
    });

    return () => {
      socket.off('player-joined');
      socket.off('player-left');
      socket.off('new-excuse');
      socket.off('challenge-received');
      socket.off('vote-update');
      socket.off('battle-started');
      socket.off('battle-created');
      socket.off('battle-excuse-received');
      socket.off('battle-judged');
    };
  }, [socket, players]);

  const handleJoinRoom = () => {
    if (!roomId.trim() || !playerName.trim()) {
      alert('Por favor ingresa un nombre de sala y tu nombre');
      return;
    }

    socket.emit('join-room', { roomId: roomId.trim(), playerName: playerName.trim() });
    setIsInRoom(true);
    setMessages([{ type: 'success', text: `¡Bienvenido a la sala "${roomId}"!` }]);

    // Load room history
    fetch(`${apiUrl}/api/excuses?roomId=${roomId}&limit=10`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setRoomExcuses(data.excuses.reverse());
        }
      })
      .catch(err => console.error('Error cargando historial:', err));
  };

  const handleLeaveRoom = () => {
    socket.emit('leave-room');
    setIsInRoom(false);
    setMessages([]);
    setRoomExcuses([]);
    setPlayers([]);
    setLeaderboard([]);
    setRoomId('');
  };

  const generateRoomId = () => {
    const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomId(randomId);
  };

  const handleVote = async (excuseId) => {
    try {
      const response = await fetch(`${apiUrl}/api/vote/${excuseId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName, roomId })
      });
      const data = await response.json();
      if (!data.success) {
        setMessages(prev => [...prev, { type: 'error', text: data.message }]);
      }
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const handleChallenge = (targetPlayer) => {
    socket.emit('start-battle', {
      roomId,
      challenger: playerName,
      challenged: targetPlayer,
      level: challengeLevel
    });
  };

  const handleSubmitBattleExcuse = () => {
    if (!activeBattle || !myLastExcuseId) return;
    
    socket.emit('submit-battle-excuse', {
      battleId: activeBattle.id,
      playerName,
      excuseId: myLastExcuseId
    });
  };

  const loadLeaderboard = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/leaderboard/${roomId}`);
      const data = await response.json();
      if (data.success) {
        setLeaderboard(data.leaderboard);
        setShowLeaderboard(true);
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    }
  };

  if (!isInRoom) {
    return (
      <div className="collaborative-setup">
        <div className="setup-card">
          <h2>Modo Colaborativo</h2>
          <p className="setup-description">
            Juega con otra persona para crear excusas cada vez más absurdas.
            ¡Compitan por ver quién crea la excusa más ridícula!
          </p>

          <div className="form-group">
            <label>Tu nombre:</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Ej: Pablo"
              maxLength="20"
            />
          </div>

          <div className="form-group">
            <label>Nombre de la sala:</label>
            <div className="room-input-group">
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                placeholder="Ej: SALA123"
                maxLength="10"
              />
              <button onClick={generateRoomId} className="generate-room-btn">
                Generar
              </button>
            </div>
          </div>

          <button 
            className="join-btn"
            onClick={handleJoinRoom}
            disabled={!roomId.trim() || !playerName.trim()}
          >
            Unirse a la Sala
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="collaborative-room">
      <div className="room-header">
        <div className="room-info">
          <h2>Sala: {roomId}</h2>
          <p>{playerName}</p>
          <div className="players-count">{players.length} jugadores conectados</div>
        </div>
        <div className="room-actions">
          <button className="leaderboard-btn" onClick={loadLeaderboard}>
            Ver Ranking
          </button>
          <button className="leave-btn" onClick={handleLeaveRoom}>
            Salir
          </button>
        </div>
      </div>

      {showLeaderboard && (
        <div className="leaderboard-modal">
          <div className="leaderboard-content">
            <div className="leaderboard-header">
              <h3>Ranking de la Sala</h3>
              <button onClick={() => setShowLeaderboard(false)}>✕</button>
            </div>
            <div className="leaderboard-list">
              {leaderboard.map((entry, idx) => (
                <div key={idx} className="leaderboard-entry">
                  <span className="rank">#{idx + 1}</span>
                  <span className="player-name">{entry._id}</span>
                  <span className="votes">{entry.totalVotes} votos</span>
                  <span className="excuses">{entry.excuseCount} excusas</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {battleResult && (
        <div className="battle-result-modal">
          <div className="battle-result-content">
            <div className="battle-result-header">
              <h3>🏆 Resultado de la Batalla</h3>
              <button onClick={() => setBattleResult(null)}>✕</button>
            </div>
            <div className="winner-announcement">
              <h2>¡{battleResult.winner} GANÓ!</h2>
            </div>
            <div className="battle-excuses">
              <div className="battle-excuse-card">
                <h4>Jugador 1:</h4>
                <p className="situation-text">Situación: "{battleResult.challengerSituation}"</p>
                <p className="excuse-text">Excusa: "{battleResult.challengerExcuse}"</p>
                {battleResult.analysis.scores && (
                  <div className="scores">
                    <span>Tema: {battleResult.analysis.scores[Object.keys(battleResult.analysis.scores)[0]]?.themeRelevance}/10</span>
                    <span>Absurdidad: {battleResult.analysis.scores[Object.keys(battleResult.analysis.scores)[0]]?.absurdity}/10</span>
                    <span>Creatividad: {battleResult.analysis.scores[Object.keys(battleResult.analysis.scores)[0]]?.creativity}/10</span>
                    <span>Coherencia: {battleResult.analysis.scores[Object.keys(battleResult.analysis.scores)[0]]?.coherence}/10</span>
                  </div>
                )}
              </div>
              <div className="battle-excuse-card">
                <h4>Jugador 2:</h4>
                <p className="situation-text">Situación: "{battleResult.challengedSituation}"</p>
                <p className="excuse-text">Excusa: "{battleResult.challengedExcuse}"</p>
                {battleResult.analysis.scores && (
                  <div className="scores">
                    <span>Tema: {battleResult.analysis.scores[Object.keys(battleResult.analysis.scores)[1]]?.themeRelevance}/10</span>
                    <span>Absurdidad: {battleResult.analysis.scores[Object.keys(battleResult.analysis.scores)[1]]?.absurdity}/10</span>
                    <span>Creatividad: {battleResult.analysis.scores[Object.keys(battleResult.analysis.scores)[1]]?.creativity}/10</span>
                    <span>Coherencia: {battleResult.analysis.scores[Object.keys(battleResult.analysis.scores)[1]]?.coherence}/10</span>
                  </div>
                )}
              </div>
            </div>
            <div className="judge-reason">
              <h4>Análisis del Juez:</h4>
              <p>{battleResult.analysis.reason}</p>
            </div>
          </div>
        </div>
      )}

      <div className="room-content">
        <div className="room-main">
          <ExcuseGenerator 
            apiUrl={apiUrl}
            socket={socket}
            roomId={roomId}
            playerName={playerName}
            onExcuseGenerated={(excuseId) => setMyLastExcuseId(excuseId)}
          />
          
          {activeBattle && (
            <div className="active-battle-panel">
              <h3>⚔️ Batalla en Curso</h3>
              <div className="battle-info">
                <p><strong>{activeBattle.challenger}</strong> VS <strong>{activeBattle.challenged}</strong></p>
                <p>Nivel: {activeBattle.level}</p>
                <div className="battle-theme">
                  <strong>Tema:</strong> "{activeBattle.theme}"
                </div>
                <p className="battle-instruction">Escribe una situación relacionada con el tema y genera tu excusa</p>
              </div>
              <div className="battle-status">
                <div className={`player-status ${activeBattle.challengerSubmitted ? 'submitted' : ''}`}>
                  {activeBattle.challenger} {activeBattle.challengerSubmitted ? '✓' : '⏳'}
                </div>
                <div className={`player-status ${activeBattle.challengedSubmitted ? 'submitted' : ''}`}>
                  {activeBattle.challenged} {activeBattle.challengedSubmitted ? '✓' : '⏳'}
                </div>
              </div>
              {(playerName === activeBattle.challenger || playerName === activeBattle.challenged) && (
                <button 
                  className="submit-battle-btn"
                  onClick={handleSubmitBattleExcuse}
                  disabled={
                    !myLastExcuseId || 
                    (playerName === activeBattle.challenger && activeBattle.challengerSubmitted) ||
                    (playerName === activeBattle.challenged && activeBattle.challengedSubmitted)
                  }
                >
                  {(playerName === activeBattle.challenger && activeBattle.challengerSubmitted) ||
                   (playerName === activeBattle.challenged && activeBattle.challengedSubmitted)
                    ? 'Excusa Enviada ✓'
                    : 'Enviar Mi Última Excusa'}
                </button>
              )}
            </div>
          )}
          
          {!activeBattle && (
            <div className="challenge-panel">
              <h3>Desafiar Jugador</h3>
              <div className="challenge-controls">
                <select 
                  className="challenge-select"
                  onChange={(e) => e.target.value && handleChallenge(e.target.value)}
                  defaultValue=""
                >
                  <option value="" disabled>Selecciona un jugador</option>
                  {players.filter(p => p !== playerName).map((player, idx) => (
                    <option key={idx} value={player}>{player}</option>
                  ))}
                </select>
                <div className="challenge-level">
                  <label>Nivel de desafío:</label>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    value={challengeLevel}
                    onChange={(e) => setChallengeLevel(parseInt(e.target.value))}
                  />
                  <span>{challengeLevel}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="room-sidebar">
          <div className="messages-panel">
            <h3>Actividad</h3>
            <div className="messages-list">
              {messages.map((msg, idx) => (
                <div key={idx} className={`message ${msg.type}`}>
                  <p className="message-text">{msg.text}</p>
                  {msg.excuse && (
                    <p className="message-excuse">"{msg.excuse}"</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="room-excuses-panel">
            <h3>Excusas de la Sala</h3>
            <div className="room-excuses-list">
              {roomExcuses.map((excuse, idx) => (
                <div key={excuse._id || excuse.id || idx} className="room-excuse-item">
                  <div className="excuse-header">
                    <span className="player-badge">{excuse.playerName}</span>
                    <span className="level-badge">Nivel {excuse.absurdityLevel}</span>
                    <span className="votes-badge">{excuse.votes || 0} ⭐</span>
                  </div>
                  <p className="excuse-text">{excuse.excuse}</p>
                  {excuse.imageUrl && (
                    <img 
                      src={excuse.imageUrl} 
                      alt="Excuse illustration" 
                      className="excuse-image"
                    />
                  )}
                  <button 
                    className="vote-btn"
                    onClick={() => handleVote(excuse._id || excuse.id)}
                    disabled={excuse.playerName === playerName}
                  >
                    Votar
                  </button>
                </div>
              ))}  
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollaborativeMode;
