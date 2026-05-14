import React, { useEffect, useRef, useCallback } from 'react';
import { useMusicStore } from './store/useMusicStore';
import PianoKeyboard from './components/PianoKeyboard';
import SynthesiaRoll from './components/SynthesiaRoll';
import TransportBar from './components/TransportBar';
import ImportPanel from './components/ImportPanel';
import SongLibrary from './components/SongLibrary';
import { useSettingsStore } from './store/useSettingsStore';
import { initAudio, stopAll, isAudioReady, scheduleSong } from './engine/audioEngine';
import { initMidi } from './engine/midiEngine';
import SettingsModal from './components/SettingsModal';
import SheetMusicView from './components/SheetMusicView';
import ErrorBoundary from './components/ErrorBoundary';
import type { Song } from './types/music';
import { Piano, Sparkles, Menu, X, Settings as SettingsIcon } from 'lucide-react';
import * as Tone from 'tone';

const TICK_INTERVAL = 16; // ms

function App() {
  const {
    song,
    playback,
    audioReady,
    audioLoading,
    sidebarOpen,
    setSong,
    setPlayback,
    setAudioReady,
    setAudioLoading,
    setSidebarOpen,
    toggleHand,
    seek
  } = useMusicStore();

  const { visuals } = useSettingsStore();
  const [showSettings, setShowSettings] = React.useState(false);

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startWallRef = useRef<number>(0);
  const startSongRef = useRef<number>(0);
  const tonePartRef = useRef<Tone.Part | null>(null);

  // ── Audio init ────────────────────────────────────────────────────────────
  const ensureAudio = useCallback(async () => {
    if (audioReady) return true;
    setAudioLoading(true);
    try {
      await initAudio();
      setAudioReady(isAudioReady());
    } finally {
      setAudioLoading(false);
    }
    return isAudioReady();
  }, [audioReady, setAudioLoading, setAudioReady]);

  // ── Playback tick ─────────────────────────────────────────────────────────
  const startTick = useCallback((fromTime: number) => {
    startWallRef.current = performance.now();
    startSongRef.current = fromTime;

    if (tickRef.current) clearInterval(tickRef.current);
    
    tickRef.current = setInterval(() => {
      const now = performance.now();
      const elapsed = (now - startWallRef.current) / 1000;
      let newTime = startSongRef.current + elapsed * playback.speed;

      if (!song) return;

      // --- Wait Mode Logic ---
      if (visuals.isWaitMode) {
        // Find notes that should be starting or playing right now
        // A simple "wait" logic: find any note starting within a small window
        const upcomingNotes = song.tracks
          .filter(t => playback.activeHands.has(t.hand as any))
          .flatMap(t => t.notes)
          .filter(n => n.startTime > playback.currentTime - 0.1 && n.startTime <= playback.currentTime + 0.1);

        if (upcomingNotes.length > 0) {
          const allPressed = upcomingNotes.every(n => playback.userPressedKeys.has(n.midi));
          if (!allPressed) {
            // "Freeze" the wall clock so elapsed doesn't increase
            startWallRef.current = now; 
            return; 
          }
        }
      }
      // -----------------------
      
      if (newTime >= song.totalDuration) {
        if (playback.isLooping) {
          startSongRef.current = 0;
          startWallRef.current = performance.now();
          setPlayback({ currentTime: 0 });
        } else {
          stopTick();
          stopAll();
          setPlayback({ isPlaying: false, currentTime: song.totalDuration });
        }
        return;
      }
      
      setPlayback({ currentTime: newTime });
    }, TICK_INTERVAL);
  }, [playback.speed, playback.isLooping, song, setPlayback]);

  const stopTick = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
  };

  // ── Controls ──────────────────────────────────────────────────────────────
  const handlePlay = useCallback(async () => {
    const ok = await ensureAudio();
    if (!ok || !song) return;

    setPlayback({ isPlaying: true });

    stopAll();
    if (tonePartRef.current) {
      tonePartRef.current.dispose();
      tonePartRef.current = null;
    }
    Tone.getTransport().stop();
    Tone.getTransport().cancel();

    const part = scheduleSong(song, playback.currentTime, playback.speed, playback.activeHands);
    tonePartRef.current = part;

    startTick(playback.currentTime);
  }, [ensureAudio, song, playback.currentTime, playback.speed, playback.activeHands, setPlayback, startTick]);

  const handlePause = useCallback(() => {
    stopTick();
    stopAll();
    setPlayback({ isPlaying: false });
  }, [setPlayback]);

  const handleStop = useCallback(() => {
    stopTick();
    stopAll();
    setPlayback({ isPlaying: false, currentTime: 0 });
  }, [setPlayback]);

  const handleSeek = useCallback((t: number) => {
    const wasPlaying = playback.isPlaying;
    if (wasPlaying) {
      stopTick();
      stopAll();
    }
    seek(t);
    if (wasPlaying) {
      setTimeout(() => {
        startSongRef.current = t;
        startWallRef.current = performance.now();
        startTick(t);
        if (song) {
          const part = scheduleSong(song, t, playback.speed, playback.activeHands);
          tonePartRef.current = part;
        }
      }, 50);
    }
  }, [playback.isPlaying, playback.speed, playback.activeHands, song, seek, startTick]);

  const handleSpeedChange = useCallback((speed: number) => {
    const wasPlaying = playback.isPlaying;
    if (wasPlaying) { stopTick(); stopAll(); }
    setPlayback({ speed });
    if (wasPlaying) {
      setTimeout(() => startTick(playback.currentTime), 50);
    }
  }, [playback.isPlaying, playback.currentTime, setPlayback, startTick]);

  const handleLoopToggle = useCallback(() => {
    setPlayback({ isLooping: !playback.isLooping });
  }, [playback.isLooping, setPlayback]);

  const handleSkipBack = useCallback(() => handleSeek(Math.max(0, playback.currentTime - 5)), [handleSeek, playback.currentTime]);
  const handleSkipForward = useCallback(() => handleSeek(Math.min(song?.totalDuration ?? 0, playback.currentTime + 5)), [handleSeek, playback.currentTime, song]);

  useEffect(() => {
    initMidi();
    return () => { stopTick(); stopAll(); };
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <button className="menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="logo">
            <Piano size={24} className="logo-icon" />
            <span className="logo-text">Parti<span className="logo-accent">tura</span><sup>AI</sup></span>
          </div>
        </div>
        <div className="header-center">
          <span className="header-tagline"><Sparkles size={13} /> Inteligencia Artificial para Aprendizaje de Piano</span>
        </div>
        <div className="header-right">
          {audioLoading && <span className="audio-status loading">Loading samples…</span>}
          {audioReady && (
            <span className="audio-status ready">🎵 Audio ready</span>
          )}
          {!audioReady && !audioLoading && (
            <span className="audio-status idle">Click ▶ to load audio</span>
          )}
          <button 
            className="menu-btn" 
            onClick={() => setShowSettings(true)}
            style={{ marginLeft: '12px' }}
          >
            <SettingsIcon size={20} />
          </button>
        </div>
      </header>

      <div className="app-body">
        <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <ImportPanel onSongLoaded={handleSongLoad} />
          <SongLibrary currentSong={song} onSelect={handleSongLoad} />
        </aside>

        <main className="main-content">
          {song && (
            <div className="sheet-music-wrapper">
              <ErrorBoundary>
                <SheetMusicView song={song} playback={playback} />
              </ErrorBoundary>
            </div>
          )}
          
          <div className="roll-container">
            {!song && (
              <div className="empty-roll">
                <Piano size={48} className="empty-icon" />
                <h2>Select or import a song to begin</h2>
                <p>Choose a demo from the library or upload a MIDI / sheet image</p>
              </div>
            )}
            <SynthesiaRoll song={song} playback={playback} onSeek={handleSeek} />
          </div>

          <div className="keyboard-container">
            <div className="hand-legend">
              <span className="legend-left">■ Left hand</span>
              <span className="legend-right">■ Right hand</span>
            </div>
            <PianoKeyboard song={song} playback={playback} />
          </div>

          <TransportBar
            song={song}
            playback={playback}
            onPlay={handlePlay}
            onPause={handlePause}
            onStop={handleStop}
            onSeek={handleSeek}
            onSpeedChange={handleSpeedChange}
            onHandToggle={toggleHand}
            onLoopToggle={handleLoopToggle}
            onSkipBack={handleSkipBack}
            onSkipForward={handleSkipForward}
          />
        </main>
      </div>

      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
      />
    </div>
  );

  function handleSongLoad(newSong: Song) {
    stopTick();
    stopAll();
    setSong(newSong);
  }
}

export default App;
