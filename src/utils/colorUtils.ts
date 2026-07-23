// ─── Color Utility Functions for Branding System ─────────────────────
// Handles hex↔hsl conversion, palette derivation, contrast scoring,
// and all color manipulation needed for the white-label theming engine.

export interface HSL {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

export interface BrandingPalette {
  primary: string;         // HSL CSS string "247 61% 39%"
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  sidebarBg: string;
  sidebarForeground: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  sidebarBorder: string;
  sidebarPrimary: string;
  sidebarPrimaryForeground: string;
  sidebarRing: string;
  gradientStart: string;   // HEX
  gradientEnd: string;     // HEX
  darkGradientStart: string;
  darkGradientEnd: string;
  scrollbarColor: string;  // rgba string
  ring: string;
  // Dark mode overrides
  darkPrimary: string;
  darkSidebarBg: string;
  darkSidebarAccent: string;
}

export interface BrandingConfig {
  mode: 'solid' | 'gradient';
  color1: string;           // HEX
  color2: string | null;    // HEX (null if solid)
  gradient_direction: number;
  font_family: string;
  logo_url: string | null;
  advanced_overrides: {
    accent_hex: string | null;
    secondary_hex: string | null;
    sidebar_text: string | null;
  };
  created_at?: string;
  created_by?: string;
}

// ─── Default Swadeshi Theme ──────────────────────────────────────────
export const DEFAULT_BRANDING: BrandingConfig = {
  mode: 'gradient',
  color1: '#667eea',
  color2: '#764ba2',
  gradient_direction: 135,
  font_family: 'Inter',
  logo_url: null,
  advanced_overrides: {
    accent_hex: null,
    secondary_hex: null,
    sidebar_text: null,
  },
};

// ─── Preset Themes ───────────────────────────────────────────────────
export interface ThemePreset {
  id: string;
  name: string;
  emoji: string;
  description: string;
  color1: string;
  color2: string;
  mode: 'gradient' | 'solid';
  direction: number;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'royal-indigo',
    name: 'Royal Indigo',
    emoji: '🟣',
    description: 'Premium & regal — default Swadeshi theme',
    color1: '#667eea',
    color2: '#764ba2',
    mode: 'gradient',
    direction: 135,
  },
  {
    id: 'forest-emerald',
    name: 'Forest Emerald',
    emoji: '🟢',
    description: 'Fresh & organic — perfect for health food',
    color1: '#11998e',
    color2: '#38ef7d',
    mode: 'gradient',
    direction: 135,
  },
  {
    id: 'sunset-blaze',
    name: 'Sunset Blaze',
    emoji: '🔥',
    description: 'Bold & energetic — fast food & street food',
    color1: '#f12711',
    color2: '#f5af19',
    mode: 'gradient',
    direction: 135,
  },
  {
    id: 'ocean-depths',
    name: 'Ocean Depths',
    emoji: '🌊',
    description: 'Calm & sophisticated — seafood & fine dining',
    color1: '#2193b0',
    color2: '#6dd5ed',
    mode: 'gradient',
    direction: 135,
  },
  {
    id: 'rose-gold',
    name: 'Rose Gold',
    emoji: '🌹',
    description: 'Elegant & luxurious — upscale restaurants',
    color1: '#b76e79',
    color2: '#e8c8a0',
    mode: 'gradient',
    direction: 135,
  },
  {
    id: 'midnight-slate',
    name: 'Midnight Slate',
    emoji: '🌑',
    description: 'Minimal & modern — bars & lounges',
    color1: '#232526',
    color2: '#414345',
    mode: 'gradient',
    direction: 135,
  },
  {
    id: 'cherry-blossom',
    name: 'Cherry Blossom',
    emoji: '🌸',
    description: 'Vibrant & fun — dessert cafés & bakeries',
    color1: '#f953c6',
    color2: '#b91d73',
    mode: 'gradient',
    direction: 135,
  },
  {
    id: 'classic-navy',
    name: 'Classic Navy',
    emoji: '⚓',
    description: 'Traditional & formal — steakhouse & grill',
    color1: '#1a2a6c',
    color2: '#b21f1f',
    mode: 'gradient',
    direction: 135,
  },
];

// ─── Core Conversions ────────────────────────────────────────────────

/**
 * Convert HEX color string to HSL object.
 * Accepts #RGB, #RRGGBB formats.
 */
export function hexToHsl(hex: string): HSL {
  // Remove # prefix
  let h = hex.replace(/^#/, '');

  // Expand 3-char hex
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }

  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l: Math.round(l * 100) };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let hue: number;
  switch (max) {
    case r:
      hue = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      break;
    case g:
      hue = ((b - r) / d + 2) / 6;
      break;
    default:
      hue = ((r - g) / d + 4) / 6;
      break;
  }

  return {
    h: Math.round(hue * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Convert HSL object to HEX string.
 */
export function hslToHex(hsl: HSL): string {
  const { h, s, l } = hsl;
  const sNorm = s / 100;
  const lNorm = l / 100;

  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;

  let r = 0, g = 0, b = 0;

  if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
  else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
  else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
  else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
  else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Convert HSL to CSS variable string format: "247 61% 39%"
 */
export function hslToCssString(hsl: HSL): string {
  return `${hsl.h} ${hsl.s}% ${hsl.l}%`;
}

/**
 * Parse a CSS HSL string "247 61% 39%" back to HSL object
 */
export function cssStringToHsl(css: string): HSL {
  const parts = css.trim().split(/\s+/);
  return {
    h: parseInt(parts[0]),
    s: parseInt(parts[1]),
    l: parseInt(parts[2]),
  };
}

// ─── Color Manipulation ─────────────────────────────────────────────

/**
 * Darken a HEX color by a percentage (0-100).
 */
export function darken(hex: string, percent: number): string {
  const hsl = hexToHsl(hex);
  hsl.l = Math.max(0, hsl.l - percent);
  return hslToHex(hsl);
}

/**
 * Lighten a HEX color by a percentage (0-100).
 */
export function lighten(hex: string, percent: number): string {
  const hsl = hexToHsl(hex);
  hsl.l = Math.min(100, hsl.l + percent);
  return hslToHex(hsl);
}

/**
 * Saturate a HEX color by a percentage.
 */
export function saturate(hex: string, percent: number): string {
  const hsl = hexToHsl(hex);
  hsl.s = Math.min(100, hsl.s + percent);
  return hslToHex(hsl);
}

/**
 * Desaturate a HEX color by a percentage.
 */
export function desaturate(hex: string, percent: number): string {
  const hsl = hexToHsl(hex);
  hsl.s = Math.max(0, hsl.s - percent);
  return hslToHex(hsl);
}

/**
 * Get the complementary color (180° opposite on color wheel).
 */
export function getComplementary(hex: string): string {
  const hsl = hexToHsl(hex);
  hsl.h = (hsl.h + 180) % 360;
  return hslToHex(hsl);
}

/**
 * Get an analogous color (shifted by degrees on color wheel).
 */
export function getAnalogous(hex: string, degrees: number = 30): string {
  const hsl = hexToHsl(hex);
  hsl.h = (hsl.h + degrees + 360) % 360;
  return hslToHex(hsl);
}

/**
 * Get the midpoint color between two hex colors.
 */
export function getMidpoint(hex1: string, hex2: string): string {
  const hsl1 = hexToHsl(hex1);
  const hsl2 = hexToHsl(hex2);
  return hslToHex({
    h: Math.round((hsl1.h + hsl2.h) / 2),
    s: Math.round((hsl1.s + hsl2.s) / 2),
    l: Math.round((hsl1.l + hsl2.l) / 2),
  });
}

/**
 * Create an rgba string from a hex color with alpha.
 */
export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace(/^#/, '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ─── Accessibility ───────────────────────────────────────────────────

/**
 * Get relative luminance of a HEX color (WCAG 2.0 formula).
 */
export function getRelativeLuminance(hex: string): number {
  const h = hex.replace(/^#/, '');
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;

  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Get contrast ratio between two colors (WCAG 2.0).
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getRelativeLuminance(hex1);
  const l2 = getRelativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Get WCAG contrast level between two colors.
 */
export function getContrastLevel(hex1: string, hex2: string): 'AAA' | 'AA' | 'FAIL' {
  const ratio = getContrastRatio(hex1, hex2);
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  return 'FAIL';
}

/**
 * Suggest best text color (black or white) for a given background.
 */
export function suggestTextColor(bgHex: string): '#ffffff' | '#1a202c' {
  const luminance = getRelativeLuminance(bgHex);
  return luminance > 0.4 ? '#1a202c' : '#ffffff';
}

// ─── Full Palette Derivation ─────────────────────────────────────────

/**
 * THE KEY FUNCTION: Derive full branding palette from 1-2 colors.
 * This is the magic — user picks 1 or 2 colors, we generate everything.
 */
export function deriveFullPalette(config: BrandingConfig): BrandingPalette {
  const { mode, color1, color2, gradient_direction, advanced_overrides } = config;

  const c1Hsl = hexToHsl(color1);

  if (mode === 'solid' || !color2) {
    // ── Solid Mode: derive everything from one color ──
    const primaryHsl = hslToCssString(c1Hsl);
    const textColor = suggestTextColor(color1);
    const textHsl = hslToCssString(hexToHsl(textColor));

    const sidebarAccentHex = darken(color1, 12);
    const sidebarAccentHsl = hslToCssString(hexToHsl(sidebarAccentHex));

    const accentHex = advanced_overrides?.accent_hex || getAnalogous(color1, 40);
    const secondaryHex = advanced_overrides?.secondary_hex || getAnalogous(color1, -30);

    const gradientEnd = darken(color1, 20);

    // Dark mode: lighten primary slightly for contrast on dark bg
    const darkPrimaryHsl = hslToCssString({ ...c1Hsl, l: Math.min(100, c1Hsl.l + 8) });
    const darkSidebarHsl = hslToCssString({ ...c1Hsl, l: Math.max(0, c1Hsl.l - 5) });

    return {
      primary: primaryHsl,
      primaryForeground: textHsl,
      secondary: hslToCssString(hexToHsl(secondaryHex)),
      secondaryForeground: hslToCssString(hexToHsl(suggestTextColor(secondaryHex))),
      accent: hslToCssString(hexToHsl(accentHex)),
      accentForeground: hslToCssString(hexToHsl(suggestTextColor(accentHex))),
      sidebarBg: primaryHsl,
      sidebarForeground: textHsl,
      sidebarAccent: sidebarAccentHsl,
      sidebarAccentForeground: textHsl,
      sidebarBorder: sidebarAccentHsl,
      sidebarPrimary: textHsl,
      sidebarPrimaryForeground: primaryHsl,
      sidebarRing: textHsl,
      gradientStart: color1,
      gradientEnd: gradientEnd,
      darkGradientStart: darken(color1, 35),
      darkGradientEnd: darken(color1, 45),
      scrollbarColor: hexToRgba(color1, 0.6),
      ring: hslToCssString({ ...c1Hsl, l: Math.max(0, c1Hsl.l - 15) }),
      darkPrimary: darkPrimaryHsl,
      darkSidebarBg: darkSidebarHsl,
      darkSidebarAccent: hslToCssString(hexToHsl(darken(color1, 18))),
    };
  }

  // ── Gradient Mode: derive from two colors ──
  const c2Hsl = hexToHsl(color2);
  const c1Text = suggestTextColor(color1);
  const c1TextHsl = hslToCssString(hexToHsl(c1Text));

  const sidebarAccentHex = darken(color2, 10);
  const accentHex = advanced_overrides?.accent_hex || lighten(getMidpoint(color1, color2), 10);
  const secondaryHex = advanced_overrides?.secondary_hex || lighten(color2, 15);

  const darkPrimaryHsl = hslToCssString({ ...c1Hsl, l: Math.min(100, c1Hsl.l + 8) });
  const darkSidebarBgHsl = hslToCssString({ ...c1Hsl, l: Math.max(0, c1Hsl.l - 8) });

  return {
    primary: hslToCssString(c1Hsl),
    primaryForeground: c1TextHsl,
    secondary: hslToCssString(hexToHsl(secondaryHex)),
    secondaryForeground: hslToCssString(hexToHsl(suggestTextColor(secondaryHex))),
    accent: hslToCssString(hexToHsl(accentHex)),
    accentForeground: hslToCssString(hexToHsl(suggestTextColor(accentHex))),
    sidebarBg: hslToCssString(c1Hsl),
    sidebarForeground: c1TextHsl,
    sidebarAccent: hslToCssString(hexToHsl(sidebarAccentHex)),
    sidebarAccentForeground: c1TextHsl,
    sidebarBorder: hslToCssString(hexToHsl(sidebarAccentHex)),
    sidebarPrimary: c1TextHsl,
    sidebarPrimaryForeground: hslToCssString(c1Hsl),
    sidebarRing: c1TextHsl,
    gradientStart: color1,
    gradientEnd: color2,
    darkGradientStart: darken(color1, 35),
    darkGradientEnd: darken(color2, 35),
    scrollbarColor: hexToRgba(color1, 0.6),
    ring: hslToCssString({ ...c1Hsl, l: Math.max(0, c1Hsl.l - 15) }),
    darkPrimary: darkPrimaryHsl,
    darkSidebarBg: darkSidebarBgHsl,
    darkSidebarAccent: hslToCssString(hexToHsl(darken(color1, 18))),
  };
}

/**
 * Validate a hex color string.
 */
export function isValidHex(hex: string): boolean {
  return /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(hex);
}

/**
 * Ensure hex has # prefix.
 */
export function normalizeHex(hex: string): string {
  if (!hex.startsWith('#')) return `#${hex}`;
  return hex;
}
