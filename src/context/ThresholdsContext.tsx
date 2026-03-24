import { createContext, useContext, useState, ReactNode, useCallback } from "react";

export interface Thresholds {
  // FT targets
  weeklyFTTarget: number;
  cwTarget: number;          // CW deals target (daily input)

  // NDG %
  ndgTarget: number;

  // Daily metric inputs — user enters daily, we calc weekly & monthly
  dailyDials: number;
  dailyTalkTimeMins: number;
  dailyEmails: number;
  dailyTouchpoints: number;
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  weeklyFTTarget: 3,
  cwTarget: 4,
  ndgTarget: 6,
  dailyDials: 50,
  dailyTalkTimeMins: 60,
  dailyEmails: 20,
  dailyTouchpoints: 70,
};

const STORAGE_KEY = 'dashboard-thresholds';

function loadThresholds(): Thresholds {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...DEFAULT_THRESHOLDS, ...JSON.parse(saved) };
  } catch {}
  return { ...DEFAULT_THRESHOLDS };
}

interface ThresholdsContextValue {
  thresholds: Thresholds;
  updateThresholds: (updates: Partial<Thresholds>) => void;
  resetThresholds: () => void;
}

const ThresholdsContext = createContext<ThresholdsContextValue>({
  thresholds: DEFAULT_THRESHOLDS,
  updateThresholds: () => {},
  resetThresholds: () => {},
});

export function ThresholdsProvider({ children }: { children: ReactNode }) {
  const [thresholds, setThresholds] = useState<Thresholds>(loadThresholds);

  const updateThresholds = useCallback((updates: Partial<Thresholds>) => {
    setThresholds(prev => {
      const next = { ...prev, ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetThresholds = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setThresholds({ ...DEFAULT_THRESHOLDS });
  }, []);

  return (
    <ThresholdsContext.Provider value={{ thresholds, updateThresholds, resetThresholds }}>
      {children}
    </ThresholdsContext.Provider>
  );
}

export function useThresholds() {
  return useContext(ThresholdsContext);
}
