import { useState } from 'react';
import './ExcuseGenerator.css';

const ExcuseGenerator = ({ apiUrl, socket, roomId, playerName, onExcuseGenerated }) => {
  const [situation, setSituation] = useState('');
  const [absurdityLevel, setAbsurdityLevel] = useState(2);
  const [socialContext, setSocialContext] = useState('');
  const [excuse, setExcuse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const absurdityLabels = {
    '-1': 'Ultra Creíble',
    '0': 'Creíble',
    '1': 'Improbable',
    '2': 'Absurdo',
    '3': 'Muy Absurdo',
    '4': 'Ciencia Ficción',
    '5': 'Cósmico'
  };

  const handleGenerate = async () => {
    if (!situation.trim()) {
      setError('Por favor, describe una situación');
      return;
    }

    setLoading(true);
    setError(null);
    setExcuse(null);

    try {
      const response = await fetch(`${apiUrl}/api/generate-excuse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          situation,
          absurdityLevel,
          socialContext,
          roomId,
          playerName
        })
      });

      const data = await response.json();

      if (data.success) {
        setExcuse(data);
        if (onExcuseGenerated && data.metadata?.id) {
          onExcuseGenerated(data.metadata.id);
        }
      } else {
        setError(data.error || 'Error al generar la excusa');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!excuse?.metadata?.id) return;

    try {
      const response = await fetch(`${apiUrl}/api/export/${excuse.metadata.id}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `excusa_${excuse.metadata.id}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error exportando:', err);
      alert('Error al exportar la excusa');
    }
  };

  return (
    <div className="excuse-generator">
      <div className="generator-card">
        <h2>Generar Nueva Excusa</h2>
        
        <div className="form-group">
          <label>Situación:</label>
          <textarea
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            placeholder="Ej: Llegué tarde al trabajo..."
            rows="3"
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>Nivel de Absurdidad: {absurdityLabels[absurdityLevel]}</label>
          <input
            type="range"
            min="-1"
            max="5"
            value={absurdityLevel}
            onChange={(e) => setAbsurdityLevel(parseInt(e.target.value))}
            className="slider"
            disabled={loading}
          />
          <div className="slider-labels">
            <span>Creíble</span>
            <span>Cósmico</span>
          </div>
        </div>

        <div className="form-group">
          <label>Contexto Social (opcional):</label>
          <input
            type="text"
            value={socialContext}
            onChange={(e) => setSocialContext(e.target.value)}
            placeholder="Ej: reunión familiar, jefe, amigos..."
            disabled={loading}
          />
        </div>

        <button 
          className="generate-btn"
          onClick={handleGenerate}
          disabled={loading || !situation.trim()}
        >
          {loading ? 'Generando...' : 'Generar Excusa'}
        </button>

        {error && <div className="error-message">{error}</div>}
      </div>

      {excuse && (
        <div className="excuse-result">
          <h3>Tu Excusa:</h3>
          <div className="excuse-text">{excuse.excuse}</div>
          
          {excuse.imageUrl && (
            <div className="excuse-image-container">
              <img 
                src={excuse.imageUrl} 
                alt="Ilustración de la excusa" 
                className="excuse-generated-image"
              />
            </div>
          )}
          
          <div className="excuse-metadata">
            <p><strong>Nivel:</strong> {absurdityLabels[excuse.metadata.absurdityLevel]}</p>
            <p><strong>Temperatura IA:</strong> {excuse.metadata.temperature}</p>
            <p><strong>Fecha:</strong> {new Date(excuse.metadata.timestamp).toLocaleString('es-ES')}</p>
          </div>

          <button className="export-btn" onClick={handleExport}>
            Exportar a .txt
          </button>
        </div>
      )}
    </div>
  );
};

export default ExcuseGenerator;
