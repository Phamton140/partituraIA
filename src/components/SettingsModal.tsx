import React from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import { X, Sliders, Palette, Zap, Type } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { visuals, setVisuals, resetSettings } = useSettingsStore();

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Sliders size={18} />
            <h2>Settings</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Visuals Section */}
          <section className="settings-section">
            <div className="section-header">
              <Palette size={16} />
              <h3>Appearance</h3>
            </div>
            
            <div className="setting-item">
              <label>Right Hand Color</label>
              <input 
                type="color" 
                value={visuals.noteColorRight} 
                onChange={(e) => setVisuals({ noteColorRight: e.target.value })} 
              />
            </div>

            <div className="setting-item">
              <label>Left Hand Color</label>
              <input 
                type="color" 
                value={visuals.noteColorLeft} 
                onChange={(e) => setVisuals({ noteColorLeft: e.target.value })} 
              />
            </div>
          </section>

          {/* Animation Section */}
          <section className="settings-section">
            <div className="section-header">
              <Zap size={16} />
              <h3>Performance & Animation</h3>
            </div>
            
            <div className="setting-item">
              <label>Glow Intensity</label>
              <input 
                type="range" min="0" max="1" step="0.1" 
                value={visuals.glowIntensity} 
                onChange={(e) => setVisuals({ glowIntensity: parseFloat(e.target.value) })} 
              />
            </div>
          </section>

          {/* Learning Section */}
          <section className="settings-section">
            <div className="section-header">
              <Type size={16} />
              <h3>Learning Aids</h3>
            </div>
            
            <div className="setting-item checkbox">
              <label>Show Finger Hints</label>
              <input 
                type="checkbox" 
                checked={visuals.showFingerHints} 
                onChange={(e) => setVisuals({ showFingerHints: e.target.checked })} 
              />
            </div>

            <div className="setting-item checkbox">
              <label>Show Note Names</label>
              <input 
                type="checkbox" 
                checked={visuals.showNoteNames} 
                onChange={(e) => setVisuals({ showNoteNames: e.target.checked })} 
              />
            </div>
          </section>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={resetSettings}>
            Reset Defaults
          </button>
          <button className="btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
