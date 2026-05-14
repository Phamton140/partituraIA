import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Music, Upload, CheckCircle, AlertCircle, Loader2, Wand2 } from 'lucide-react';
import { useMusicStore } from '../store/useMusicStore';
import type { AnalysisResult } from '../types/music';

const AudioImportPanel: React.FC = () => {
  const { setSong } = useMusicStore();
  const [result, setResult] = useState<AnalysisResult>({ status: 'idle', progress: 0, stage: '' });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setResult({ status: 'processing', progress: 10, stage: 'Subiendo audio...' });

    const formData = new FormData();
    formData.append('file', file);

    try {
      setResult(prev => ({ ...prev, progress: 30, stage: 'IA Transcribiendo notas (Basic Pitch)...' }));
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

      const response = await fetch('http://localhost:8000/api/audio/transcribe', {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Fallo en la transcripción de IA');
      }

      const songData = await response.json();
      setResult({ status: 'success', progress: 100, stage: 'Transcripción completada' });
      setSong(songData);

      // Reset after success
      setTimeout(() => setResult({ status: 'idle', progress: 0, stage: '' }), 3000);
    } catch (err) {
      const message = (err as any).name === 'AbortError' 
        ? 'La transcripción tardó demasiado (Tiempo agotado)' 
        : (err as Error).message;
      setResult({ status: 'error', progress: 0, stage: '', error: message });
    }
  }, [setSong]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'audio/*': ['.mp3', '.wav', '.flac', '.m4a'] },
    multiple: false,
    disabled: result.status === 'processing'
  });

  return (
    <div className="import-panel">
      <div 
        {...getRootProps()} 
        className={`drop-zone ${isDragActive ? 'drag-over' : ''} ${result.status === 'processing' ? 'processing' : ''}`}
      >
        <input {...getInputProps()} />
        
        {result.status === 'idle' && (
          <>
            <div className="drop-icon">
              <div className="icon-stack">
                <Music className="icon-main" size={42} />
                <Wand2 className="icon-overlay" size={20} />
              </div>
            </div>
            <h3 className="drop-title">Subir Audio (MP3/WAV)</h3>
            <p className="drop-subtitle">La IA transcribirá las notas automáticamente</p>
            <div className="format-badges">
              <span className="badge">AI Powered</span>
              <span className="badge">Piano Only</span>
            </div>
          </>
        )}

        {result.status === 'processing' && (
          <div className="analysis-progress">
            <div className="stage-label">{result.stage}</div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${result.progress}%` }} />
            </div>
            <Loader2 className="spin" size={24} />
          </div>
        )}

        {result.status === 'success' && (
          <div className="success-message">
            <CheckCircle color="#34d399" size={40} />
            <div className="success-title">¡Música Generada!</div>
          </div>
        )}

        {result.status === 'error' && (
          <div className="error-message">
            <AlertCircle color="#f87171" size={40} />
            <div className="error-title">Error de IA</div>
            <div className="error-detail">{result.error}</div>
            <button className="btn-secondary" onClick={(e) => { e.stopPropagation(); setResult({ status: 'idle', progress: 0, stage: '' }); }}>
              Reintentar
            </button>
          </div>
        )}
      </div>
      
      <div className="omr-notice">
        <Wand2 size={12} />
        <span>Usa modelos de Spotify Basic Pitch para detectar polifonía de piano.</span>
      </div>
    </div>
  );
};

export default AudioImportPanel;
