import React, { useState, useRef } from 'react';
import { Upload, Music, Image, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import type { Song } from '../types/music';
import type { AnalysisResult } from '../types/music';
import { parseMidiFile } from '../engine/omrEngine';
import { analyzeSheetImage } from '../engine/omrEngine';

interface ImageImportPanelProps {
  onSongLoaded: (song: Song) => void;
}

const ImageImportPanel: React.FC<ImageImportPanelProps> = ({ onSongLoaded }) => {
  const [dragOver, setDragOver] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult>({
    status: 'idle',
    progress: 0,
    stage: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();

    setAnalysis({ status: 'processing', progress: 5, stage: 'Reading file…' });

    try {
      if (ext === 'mid' || ext === 'midi') {
        setAnalysis({ status: 'processing', progress: 40, stage: 'Parsing MIDI…' });
        const buffer = await file.arrayBuffer();
        setAnalysis({ status: 'processing', progress: 80, stage: 'Building song model…' });
        const song = await parseMidiFile(buffer, file.name);
        setAnalysis({ status: 'success', progress: 100, stage: 'Done!' });
        onSongLoaded(song);
      } else if (['jpg', 'jpeg', 'png', 'pdf', 'webp'].includes(ext ?? '')) {
        const song = await analyzeSheetImage(file, (pct, stage) => {
          setAnalysis({ status: 'processing', progress: pct, stage });
        });
        setAnalysis({ status: 'success', progress: 100, stage: 'Done!' });
        onSongLoaded(song);
      } else {
        throw new Error(`Unsupported file type: .${ext}`);
      }
    } catch (err) {
      setAnalysis({
        status: 'error',
        progress: 0,
        stage: '',
        error: (err as Error).message,
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const isProcessing = analysis.status === 'processing';

  return (
    <div className="import-panel">
      <div
        className={`drop-zone ${dragOver ? 'drag-over' : ''} ${isProcessing ? 'processing' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".mid,.midi,.jpg,.jpeg,.png,.pdf,.webp"
          style={{ display: 'none' }}
          onChange={handleChange}
        />

        <div className="drop-icon">
          {isProcessing ? (
            <Loader2 size={40} className="spin" />
          ) : analysis.status === 'success' ? (
            <CheckCircle2 size={40} />
          ) : analysis.status === 'error' ? (
            <AlertCircle size={40} />
          ) : (
            <Upload size={40} />
          )}
        </div>

        {isProcessing ? (
          <div className="analysis-progress">
            <p className="stage-label">{analysis.stage}</p>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${analysis.progress}%` }}
              />
            </div>
            <p className="progress-pct">{analysis.progress}%</p>
            <p className="processing-hint">This may take a few seconds...</p>
          </div>
        ) : analysis.status === 'error' ? (
          <div className="error-message">
            <p className="error-title">Analysis Failed</p>
            <p className="error-detail">{analysis.error}</p>
            <p className="error-hint">Make sure the Python backend is running on port 8000.</p>
            <button
              className="btn-secondary"
              onClick={(e) => { e.stopPropagation(); setAnalysis({ status: 'idle', progress: 0, stage: '' }); }}
            >
              Try again
            </button>
          </div>
        ) : analysis.status === 'success' ? (
          <div className="success-message">
            <p>Song loaded successfully!</p>
            <button
              className="btn-secondary"
              onClick={(e) => { e.stopPropagation(); setAnalysis({ status: 'idle', progress: 0, stage: '' }); }}
            >
              Load another
            </button>
          </div>
        ) : (
          <>
            <p className="drop-title">Drop your sheet music or MIDI here</p>
            <p className="drop-subtitle">Supports JPG · PNG · PDF · MIDI</p>

            <div className="format-badges">
              <span className="badge"><Image size={12} /> Image</span>
              <span className="badge"><Music size={12} /> MIDI</span>
              <span className="badge pdf">PDF</span>
            </div>

            <div className="omr-notice">
              <AlertCircle size={13} />
              <span>Image OMR requires the Python backend. MIDI works offline.</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ImageImportPanel;
