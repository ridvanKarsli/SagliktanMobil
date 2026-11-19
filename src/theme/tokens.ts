// Web projesindeki (SagliktanWeb/src/design/tokens.js) paletle birebir aynı:
// "sabah bahçesi" - nane zemin, çam yeşili mürekkep, şifa yeşili ana renk.

export type Palette = {
  mode: 'light' | 'dark';
  background: string;
  surface: string;
  surfaceAlt: string;
  ink: string;
  inkSoft: string;
  inkMuted: string;
  primary: string;
  primaryBright: string;
  primaryDeep: string;
  primarySoft: string;
  onPrimary: string;
  apricot: string;
  apricotInk: string;
  apricotSoft: string;
  sky: string;
  skySoft: string;
  lilac: string;
  lilacSoft: string;
  rose: string;
  roseSoft: string;
  border: string;
  borderStrong: string;
};

const light: Palette = {
  mode: 'light',
  background: '#F2F7F4',
  surface: '#FFFFFF',
  surfaceAlt: '#E6F1EC',
  ink: '#173530',
  inkSoft: '#4A635D',
  inkMuted: '#6E837D',
  primary: '#157461',
  primaryBright: '#4CB89F',
  primaryDeep: '#0E5244',
  primarySoft: 'rgba(76, 184, 159, 0.14)',
  onPrimary: '#FFFFFF',
  apricot: '#F2A33A',
  apricotInk: '#8A5300',
  apricotSoft: 'rgba(242, 163, 58, 0.16)',
  sky: '#2A6FA6',
  skySoft: 'rgba(42, 111, 166, 0.10)',
  lilac: '#6A52C8',
  lilacSoft: 'rgba(106, 82, 200, 0.10)',
  rose: '#C2385A',
  roseSoft: 'rgba(194, 56, 90, 0.10)',
  border: 'rgba(23, 53, 48, 0.10)',
  borderStrong: 'rgba(23, 53, 48, 0.20)',
};

const dark: Palette = {
  mode: 'dark',
  background: '#0F1F1C',
  surface: '#162A26',
  surfaceAlt: '#1D3530',
  ink: '#E6F2EE',
  inkSoft: '#A3BDB6',
  inkMuted: '#7F9993',
  primary: '#5CC7AD',
  primaryBright: '#7AD8C0',
  primaryDeep: '#3FA88F',
  primarySoft: 'rgba(92, 199, 173, 0.16)',
  onPrimary: '#0F1F1C',
  apricot: '#F5B65A',
  apricotInk: '#F5B65A',
  apricotSoft: 'rgba(245, 182, 90, 0.16)',
  sky: '#6FB3E3',
  skySoft: 'rgba(111, 179, 227, 0.14)',
  lilac: '#A895F0',
  lilacSoft: 'rgba(168, 149, 240, 0.14)',
  rose: '#F07D96',
  roseSoft: 'rgba(240, 125, 150, 0.14)',
  border: 'rgba(230, 242, 238, 0.10)',
  borderStrong: 'rgba(230, 242, 238, 0.20)',
};

export const palettes = { light, dark };

export const radius = { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 } as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

// Dokunma hedefi alt sınırı (WCAG 2.2 / platform yönergeleri).
export const MIN_TOUCH = 44;
