import { create } from 'zustand';
import type { Song, PlaybackState, Hand } from '../types/music';

interface MusicStore {
  song: Song | null;
  playback: PlaybackState;
  audioReady: boolean;
  audioLoading: boolean;
  sidebarOpen: boolean;

  // Actions
  setSong: (song: Song | null) => void;
  setPlayback: (playback: Partial<PlaybackState> | ((state: PlaybackState) => PlaybackState)) => void;
  setAudioReady: (ready: boolean) => void;
  setAudioLoading: (loading: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleHand: (hand: Hand) => void;
  seek: (time: number) => void;
}

export const useMusicStore = create<MusicStore>((set) => ({
  song: null,
  playback: {
    isPlaying: false,
    currentTime: 0,
    speed: 1,
    isLooping: false,
    activeHands: new Set(['left', 'right'] as Hand[]),
    userPressedKeys: new Set<number>(),
  },
  audioReady: false,
  audioLoading: false,
  sidebarOpen: true,

  setSong: (song) => set({ song, playback: { 
    isPlaying: false, 
    currentTime: 0, 
    speed: 1, 
    isLooping: false, 
    activeHands: new Set(['left', 'right'] as Hand[]),
    userPressedKeys: new Set<number>(),
  } }),
  
  setPlayback: (updater) => set((state) => ({
    playback: typeof updater === 'function' ? updater(state.playback) : { ...state.playback, ...updater }
  })),

  setAudioReady: (audioReady) => set({ audioReady }),
  setAudioLoading: (audioLoading) => set({ audioLoading }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),

  toggleHand: (hand) => set((state) => {
    const newHands = new Set(state.playback.activeHands);
    if (newHands.has(hand)) {
      if (newHands.size > 1) newHands.delete(hand);
    } else {
      newHands.add(hand);
    }
    return { playback: { ...state.playback, activeHands: newHands } };
  }),

  seek: (time) => set((state) => ({
    playback: { ...state.playback, currentTime: Math.max(0, Math.min(time, state.song?.totalDuration || 0)) }
  })),
}));
