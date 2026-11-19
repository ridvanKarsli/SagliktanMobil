import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { palettes, type Palette } from './tokens';

const ThemeContext = createContext<Palette>(palettes.light);

// Sistem temasını (açık/koyu) izler.
export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const palette = useMemo(() => (scheme === 'dark' ? palettes.dark : palettes.light), [scheme]);
  return <ThemeContext.Provider value={palette}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Palette {
  return useContext(ThemeContext);
}
