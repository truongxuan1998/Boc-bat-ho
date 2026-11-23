'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Theme } from '@astryxdesign/core/theme';
import { LayerProvider } from '@astryxdesign/core/Layer';
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
    let initialMode: ThemeMode = 'light';
    if (saved && ['light', 'dark', 'system'].includes(saved)) {
      initialMode = saved;
    } else if (typeof window !== 'undefined') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      initialMode = prefersDark ? 'dark' : 'light';
    }
    setModeState(initialMode);
    document.documentElement.setAttribute('data-theme', initialMode);
    document.documentElement.style.backgroundColor = initialMode === 'dark' ? '#0f141c' : '#f3f5f9';
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', initialMode === 'dark' ? '#0f141c' : '#f3f5f9');
    }
  }, []);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, newMode);
      document.documentElement.setAttribute('data-theme', newMode);
      document.documentElement.style.backgroundColor = newMode === 'dark' ? '#0f141c' : '#f3f5f9';
      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) {
        metaTheme.setAttribute('content', newMode === 'dark' ? '#0f141c' : '#f3f5f9');
      }
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
