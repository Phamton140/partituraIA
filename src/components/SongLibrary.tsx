import React from 'react';
import { BookOpen, Music, ChevronRight, Star } from 'lucide-react';
import type { Song } from '../types/music';
import { DEMO_SONGS } from '../data/demoSongs';

interface SongLibraryProps {
  currentSong: Song | null;
  onSelect: (song: Song) => void;
}

const difficultyLabel = (id: string) => {
  if (id === 'twinkle') return { label: 'Beginner', stars: 1 };
  if (id === 'fuer-elise') return { label: 'Intermediate', stars: 3 };
  return { label: 'Advanced', stars: 5 };
};

const SongLibrary: React.FC<SongLibraryProps> = ({ currentSong, onSelect }) => {
  return (
    <div className="song-library">
      <div className="library-header">
        <BookOpen size={16} />
        <span>Biblioteca de Demos</span>
      </div>

      <div className="library-list">
        {DEMO_SONGS.map((song) => {
          const diff = difficultyLabel(song.id);
          const isActive = currentSong?.id === song.id;
          return (
            <button
              key={song.id}
              className={`library-item ${isActive ? 'active' : ''}`}
              onClick={() => onSelect(song)}
            >
              <div className="song-icon">
                <Music size={16} />
              </div>
              <div className="song-info">
                <p className="song-title">{song.title}</p>
                <p className="song-composer">{song.composer}</p>
                <div className="song-meta-row">
                  <span className="song-tempo">{song.tempo} BPM</span>
                  <span className="song-difficulty">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        size={9}
                        fill={i < diff.stars ? 'currentColor' : 'none'}
                      />
                    ))}
                    {diff.label}
                  </span>
                </div>
              </div>
              {isActive && <ChevronRight size={14} className="active-arrow" />}
            </button>
          );
        })}
      </div>

      <div className="library-footer">
        <p>Import your own songs using the ↑ panel above</p>
      </div>
    </div>
  );
};

export default SongLibrary;
