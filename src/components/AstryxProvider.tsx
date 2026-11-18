'use client';

import React from 'react';
import { Theme } from '@astryxdesign/core/theme';
import { themes, defaultThemeSlug } from '../astryx-themes';

export function AstryxProvider({ children }: { children: React.ReactNode }) {
  return <Theme theme={themes[defaultThemeSlug]}>{children}</Theme>;
}
