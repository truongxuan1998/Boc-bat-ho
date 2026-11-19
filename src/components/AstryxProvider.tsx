'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Theme } from '@astryxdesign/core/theme';
import { InternationalizationProvider } from '@astryxdesign/core/i18n';
import viVN from '@astryxdesign/core/locales/vi-VN.generated.js';
import { themes, defaultThemeSlug } from '../astryx-themes';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeModeContext = createContext<ThemeContextType>({
  mode: 'light',
  setMode: () => {},
  toggleTheme: () => {},
});

export const useThemeMode = () => useContext(ThemeModeContext);

const THEME_STORAGE_KEY = 'BOC_BAT_HO_THEME_MODE';

export function AstryxProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    if (saved && ['light', 'dark', 'system'].includes(saved)) {
      setModeState(saved);
    } else if (typeof window !== 'undefined') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setModeState(prefersDark ? 'dark' : 'light');
    }
  }, []);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, newMode);
    }
  };

  const toggleTheme = () => {
    const nextMode = mode === 'dark' ? 'light' : 'dark';
    setMode(nextMode);
  };

  return (
    <ThemeModeContext.Provider value={{ mode, setMode, toggleTheme }}>
      <InternationalizationProvider
        locale="vi-VN"
        messages={{ 'vi-VN': viVN }}
      >
        <Theme theme={themes[defaultThemeSlug]} mode={mounted ? mode : 'light'}>
          {children}
        </Theme>
      </InternationalizationProvider>
    </ThemeModeContext.Provider>
  );
}
