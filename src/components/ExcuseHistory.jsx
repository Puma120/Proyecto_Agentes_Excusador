import { useState, useEffect } from 'react';
import './ExcuseHistory.css';

const ExcuseHistory = ({ apiUrl }) => {
  const [excuses, setExcuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/excuses?limit=20`);
      const data = await response.json();
      
      if (data.success) {
        setExcuses(data.excuses);
      }
    } catch (err) {
      console.error('Error cargando historial:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showHistory) {
      loadHistory();
    }
  }, [showHistory]);

  const absurdityLabels = {
    '-1': 'Ultra Creíble',
    '0': 'Creíble',
    '1': 'Improbable',
    '2': 'Absurdo',
    '3': 'Muy Absurdo',
    '4': 'Ciencia Ficción',
    '5': 'Cósmico'
  };

  const handleExport = async (excuseId) => {
    try {
      const response = await fetch(`${apiUrl}/api/export/${excuseId}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `excusa_${excuseId}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error exportando:', err);
    }
  };

  return (
    <div className="excuse-history">
      <button 
        className="toggle-history-btn"
        onClick={() => setShowHistory(!showHistory)}
      >
        {showHistory ? 'Ocultar Historial' : 'Ver Historial'}
      </button>

      {showHistory && (
        <div className="history-content">
          <div className="history-header">
            <h3>Historial de Excusas</h3>
            <button className="refresh-btn" onClick={loadHistory} disabled={loading}>
              {loading ? 'Cargando...' : 'Actualizar'}
            </button>
          </div>

          {loading && excuses.length === 0 ? (
            <div className="loading">Cargando...</div>
          ) : excuses.length === 0 ? (
            <div className="empty-history">
              <p>No hay excusas guardadas aún</p>
              <p>¡Genera tu primera excusa absurda!</p>
            </div>
          ) : (
            <div className="history-list">
              {excuses.map((excuse) => (
                <div key={excuse._id} className="history-item">
                  <div className="history-item-header">
                    <span className="absurdity-badge">
                      {absurdityLabels[excuse.absurdityLevel]} Nivel {excuse.absurdityLevel}
                    </span>
                    <span className="history-date">
                      {new Date(excuse.timestamp).toLocaleDateString('es-ES')}
                    </span>
                  </div>

                  <div className="history-situation">
                    <strong>Situación:</strong> {excuse.situation}
                  </div>

                  <div className="history-excuse">
                    {excuse.excuse}
                  </div>

                  {excuse.socialContext && (
                    <div className="history-context">
                      <strong>Contexto:</strong> {excuse.socialContext}
                    </div>
                  )}

                  {excuse.playerName && excuse.playerName !== 'Anónimo' && (
                    <div className="history-player">
                      {excuse.playerName}
                    </div>
                  )}

                  <button 
                    className="history-export-btn"
                    onClick={() => handleExport(excuse._id)}
                  >
                    Exportar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExcuseHistory;
