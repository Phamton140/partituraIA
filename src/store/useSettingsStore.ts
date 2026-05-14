import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface VisualSettings {
  noteColorRight: string;
  noteColorLeft: string;
  fallingSpeed: number; // Pixels per second or multiplier
  showFingerHints: boolean;
  showNoteNames: boolean;
  keyboardSize: number; // height in px
  glowIntensity: number; // 0-1
  isWaitMode: boolean; // Pause song until correct keys are pressed
}

interface SettingsStore {
  visuals: VisualSettings;
  setVisuals: (visuals: Partial<VisualSettings>) => void;
  resetSettings: () => void;
}

const defaultVisuals: VisualSettings = {
  noteColorRight: '#6366f1',
  noteColorLeft: '#ec4899',
  fallingSpeed: 1.0,
  showFingerHints: true,
  showNoteNames: true,
  keyboardSize: 130,
  glowIntensity: 0.8,
  isWaitMode: false,
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      visuals: defaultVisuals,
      setVisuals: (newVisuals) => set((state) => ({ 
        visuals: { ...state.visuals, ...newVisuals } 
      })),
      resetSettings: () => set({ visuals: defaultVisuals }),
    }),
    {
      name: 'partitura-ai-settings',
    }
  )
);
