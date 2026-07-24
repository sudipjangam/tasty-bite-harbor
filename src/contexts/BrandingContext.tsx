import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  BrandingConfig,
  BrandingPalette,
  DEFAULT_BRANDING,
  deriveFullPalette,
  isValidHex,
} from '@/utils/colorUtils';

// ─── Context Types ────────────────────────────────────────────────────
interface BrandingContextValue {
  /** Current saved branding config from DB */
  brandingConfig: BrandingConfig;
  /** Current derived palette (CSS HSL values) */
  palette: BrandingPalette;
  /** Whether a custom branding has been saved (not using defaults) */
  isCustomBranded: boolean;
  /** Whether branding is currently loading from DB */
  isLoading: boolean;
  /** Save branding config to DB and apply to app */
  saveBranding: (config: BrandingConfig) => Promise<void>;
  /** Reset to Swadeshi default theme */
  resetToDefaults: () => Promise<void>;
  /** Apply a preview config visually WITHOUT saving to DB */
  previewBranding: (config: BrandingConfig) => void;
  /** Cancel preview, revert to saved config */
  cancelPreview: () => void;
  /** Whether preview mode is active */
  isPreviewing: boolean;
  /** Reload branding from DB */
  reloadBranding: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextValue | null>(null);

// ─── CSS Variable Injection ───────────────────────────────────────────

/**
 * Inject a full BrandingPalette into :root CSS custom properties.
 * This is what actually re-skins the entire app.
 */
function injectCSSVars(palette: BrandingPalette, config: BrandingConfig) {
  const root = document.documentElement;

  // Core Tailwind shadcn tokens
  root.style.setProperty('--primary', palette.primary);
  root.style.setProperty('--primary-foreground', palette.primaryForeground);
  root.style.setProperty('--secondary', palette.secondary);
  root.style.setProperty('--secondary-foreground', palette.secondaryForeground);
  root.style.setProperty('--accent', palette.accent);
  root.style.setProperty('--accent-foreground', palette.accentForeground);
  root.style.setProperty('--ring', palette.ring);

  // Sidebar tokens
  root.style.setProperty('--sidebar-background', palette.sidebarBg);
  root.style.setProperty('--sidebar-foreground', palette.sidebarForeground);
  root.style.setProperty('--sidebar-primary', palette.sidebarPrimary);
  root.style.setProperty('--sidebar-primary-foreground', palette.sidebarPrimaryForeground);
  root.style.setProperty('--sidebar-accent', palette.sidebarAccent);
  root.style.setProperty('--sidebar-accent-foreground', palette.sidebarAccentForeground);
  root.style.setProperty('--sidebar-border', palette.sidebarBorder);
  root.style.setProperty('--sidebar-ring', palette.sidebarRing);

  // Branding-specific custom vars (used in hardcoded gradients we can't fully remove)
  root.style.setProperty('--brand-gradient-start', palette.gradientStart);
  root.style.setProperty('--brand-gradient-end', palette.gradientEnd);
  root.style.setProperty('--brand-gradient-dir', `${config.gradient_direction}deg`);
  root.style.setProperty('--brand-dark-gradient-start', palette.darkGradientStart);
  root.style.setProperty('--brand-dark-gradient-end', palette.darkGradientEnd);
  root.style.setProperty('--brand-scrollbar-color', palette.scrollbarColor);

  // Body background gradient injection via CSS var
  // The body gradient is set in index.css using linear-gradient —
  // we override it via a data attribute that CSS can hook into
  root.setAttribute('data-brand-color1', palette.gradientStart);
  root.setAttribute('data-brand-color2', palette.gradientEnd);

  // Inject inline style for body gradient (overrides index.css)
  injectBodyGradientStyle(palette, config);
}

/**
 * Inject a <style> tag to override body gradient with brand colors.
 * Uses ID to replace cleanly on re-inject.
 */
function injectBodyGradientStyle(palette: BrandingPalette, config: BrandingConfig) {
  const id = 'brand-body-gradient';
  let tag = document.getElementById(id) as HTMLStyleElement | null;

  if (!tag) {
    tag = document.createElement('style');
    tag.id = id;
    document.head.appendChild(tag);
  }

  const isDefaultTheme =
    config.color1?.toLowerCase() === '#20317e' ||
    (config.color1?.toLowerCase() === '#667eea' && config.color2?.toLowerCase() === '#764ba2');

  const dir = config.gradient_direction;

  if (isDefaultTheme) {
    tag.textContent = `
      body {
        background: #ffffff !important;
        background-attachment: fixed !important;
        transition: background 300ms ease !important;
      }
      .dark body {
        background: #0f172a !important;
        background-attachment: fixed !important;
      }
      *::-webkit-scrollbar-thumb {
        background: linear-gradient(135deg, ${palette.scrollbarColor}, ${palette.scrollbarColor.replace('0.6', '0.8')}) !important;
      }
      *::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(135deg, ${palette.scrollbarColor.replace('0.6', '0.9')}, ${palette.scrollbarColor.replace('0.6', '1')}) !important;
      }
    `;
  } else {
    tag.textContent = `
      body {
        background: linear-gradient(${dir}deg, ${palette.gradientStart} 0%, ${palette.gradientEnd} 100%) !important;
        background-attachment: fixed !important;
        transition: background 300ms ease !important;
      }
      .dark body {
        background: linear-gradient(${dir}deg, ${palette.darkGradientStart} 0%, ${palette.darkGradientEnd} 100%) !important;
        background-attachment: fixed !important;
      }
      *::-webkit-scrollbar-thumb {
        background: linear-gradient(135deg, ${palette.scrollbarColor}, ${palette.scrollbarColor.replace('0.6', '0.8')}) !important;
      }
      *::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(135deg, ${palette.scrollbarColor.replace('0.6', '0.9')}, ${palette.scrollbarColor.replace('0.6', '1')}) !important;
      }
    `;
  }

  injectBrandOverrideLayer(palette, config);
}

/**
 * Inject a global CSS override that maps hardcoded Tailwind purple/violet/indigo
 * utility classes → brand CSS variables.
 *
 * WHY: Components like QSR POS, Kitchen, POS screens use classes like
 * `bg-purple-600`, `from-indigo-500` — static hardcoded values. CSS var
 * changes cannot affect them directly. This layer intercepts at the selector level.
 *
 * SCOPE: Only purple/violet/indigo (the brand color family from default theme).
 * Status colors (orange, red, green, blue) are intentionally NOT touched —
 * they are semantic status indicators, not brand identity colors.
 */
function injectBrandOverrideLayer(palette: BrandingPalette, config: BrandingConfig) {
  const id = 'brand-component-override';
  let tag = document.getElementById(id) as HTMLStyleElement | null;
  if (!tag) {
    tag = document.createElement('style');
    tag.id = id;
    document.head.appendChild(tag);
  }

  const primary = `hsl(var(--primary))`;
  const sidebarAccent = `hsl(var(--sidebar-accent))`;
  const gradStart = palette.gradientStart;
  const gradEnd = palette.gradientEnd || palette.gradientStart;

  tag.textContent = `
    /* ── Brand Override Layer ───────────────────────────────────────────────
       Maps Tailwind hardcoded purple/violet/indigo classes → brand CSS vars.
       QSR POS, Kitchen Display, POS screens, headers — all re-skin automatically.
       Status colors (orange=warning, green=success, red=error) are untouched.
    ─────────────────────────────────────────────────────────────────────── */

    /* Smooth transitions on branded elements */
    [class*="bg-purple"], [class*="bg-violet"], [class*="bg-indigo"],
    [class*="from-purple"], [class*="from-violet"], [class*="from-indigo"],
    [class*="to-purple"], [class*="to-violet"], [class*="to-indigo"],
    [class*="text-purple"], [class*="text-violet"], [class*="text-indigo"],
    [class*="border-purple"], [class*="border-violet"], [class*="border-indigo"] {
      transition: background-color 300ms ease, background 300ms ease, border-color 300ms ease, color 300ms ease !important;
    }

    /* ── Solid Backgrounds (dark/medium shades = primary brand color) ── */
    .bg-purple-950, .bg-purple-900, .bg-purple-800, .bg-purple-700, .bg-purple-600,
    .bg-violet-950, .bg-violet-900, .bg-violet-800, .bg-violet-700, .bg-violet-600,
    .bg-indigo-950, .bg-indigo-900, .bg-indigo-800, .bg-indigo-700, .bg-indigo-600 {
      background-color: ${primary} !important;
    }
    .bg-purple-500, .bg-purple-400,
    .bg-violet-500, .bg-violet-400,
    .bg-indigo-500, .bg-indigo-400 {
      background-color: ${primary} !important;
      filter: brightness(1.08);
    }
    /* Light tints = transparent version of primary */
    .bg-purple-300, .bg-purple-200, .bg-purple-100, .bg-purple-50,
    .bg-violet-300, .bg-violet-200, .bg-violet-100, .bg-violet-50,
    .bg-indigo-300, .bg-indigo-200, .bg-indigo-100, .bg-indigo-50 {
      background-color: hsl(var(--primary) / 0.12) !important;
    }

    /* ── Hover States ──────────────────────────────────────────────── */
    .hover\\:bg-purple-700:hover, .hover\\:bg-purple-800:hover, .hover\\:bg-purple-900:hover,
    .hover\\:bg-violet-700:hover, .hover\\:bg-violet-800:hover, .hover\\:bg-violet-900:hover,
    .hover\\:bg-indigo-700:hover, .hover\\:bg-indigo-800:hover, .hover\\:bg-indigo-900:hover {
      background-color: ${sidebarAccent} !important;
    }
    .hover\\:bg-purple-600:hover, .hover\\:bg-violet-600:hover, .hover\\:bg-indigo-600:hover {
      background-color: ${primary} !important;
      filter: brightness(0.9) !important;
    }
    .hover\\:bg-purple-100:hover, .hover\\:bg-violet-100:hover, .hover\\:bg-indigo-100:hover,
    .hover\\:bg-purple-50:hover, .hover\\:bg-violet-50:hover, .hover\\:bg-indigo-50:hover {
      background-color: hsl(var(--primary) / 0.15) !important;
    }

    /* ── Text Colors ───────────────────────────────────────────────── */
    .text-purple-950, .text-purple-900, .text-purple-800, .text-purple-700, .text-purple-600,
    .text-violet-950, .text-violet-900, .text-violet-800, .text-violet-700, .text-violet-600,
    .text-indigo-950, .text-indigo-900, .text-indigo-800, .text-indigo-700, .text-indigo-600 {
      color: ${primary} !important;
    }
    .text-purple-500, .text-purple-400,
    .text-violet-500, .text-violet-400,
    .text-indigo-500, .text-indigo-400 {
      color: ${primary} !important;
      opacity: 0.85;
    }
    .text-purple-300, .text-purple-200, .text-purple-100,
    .text-violet-300, .text-violet-200, .text-violet-100,
    .text-indigo-300, .text-indigo-200, .text-indigo-100 {
      color: hsl(var(--primary) / 0.6) !important;
    }
    .hover\\:text-purple-700:hover, .hover\\:text-violet-700:hover, .hover\\:text-indigo-700:hover,
    .hover\\:text-purple-600:hover, .hover\\:text-violet-600:hover, .hover\\:text-indigo-600:hover {
      color: ${primary} !important;
    }

    /* ── Border Colors ─────────────────────────────────────────────── */
    .border-purple-700, .border-purple-600, .border-purple-500,
    .border-violet-700, .border-violet-600, .border-violet-500,
    .border-indigo-700, .border-indigo-600, .border-indigo-500 {
      border-color: ${primary} !important;
    }
    .border-purple-300, .border-purple-200, .border-purple-100,
    .border-violet-300, .border-violet-200, .border-violet-100,
    .border-indigo-300, .border-indigo-200, .border-indigo-100 {
      border-color: hsl(var(--primary) / 0.3) !important;
    }

    /* ── Gradient from-* to-* (e.g. from-purple-600 to-indigo-600) ── */
    .from-purple-950, .from-purple-900, .from-purple-800, .from-purple-700, .from-purple-600, .from-purple-500,
    .from-violet-950, .from-violet-900, .from-violet-800, .from-violet-700, .from-violet-600, .from-violet-500,
    .from-indigo-950, .from-indigo-900, .from-indigo-800, .from-indigo-700, .from-indigo-600, .from-indigo-500 {
      --tw-gradient-from: ${gradStart} !important;
      --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, transparent) !important;
    }
    .to-purple-950, .to-purple-900, .to-purple-800, .to-purple-700, .to-purple-600, .to-purple-500,
    .to-violet-950, .to-violet-900, .to-violet-800, .to-violet-700, .to-violet-600, .to-violet-500,
    .to-indigo-950, .to-indigo-900, .to-indigo-800, .to-indigo-700, .to-indigo-600, .to-indigo-500 {
      --tw-gradient-to: ${gradEnd} !important;
    }
    .via-purple-700, .via-purple-600, .via-violet-700, .via-violet-600,
    .via-indigo-700, .via-indigo-600 {
      --tw-gradient-stops: var(--tw-gradient-from), ${primary}, var(--tw-gradient-to) !important;
    }

    /* Light gradient tints */
    .from-purple-100, .from-purple-50, .from-violet-100, .from-violet-50,
    .from-indigo-100, .from-indigo-50 {
      --tw-gradient-from: hsl(var(--primary) / 0.08) !important;
      --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, transparent) !important;
    }
    .to-purple-100, .to-purple-50, .to-violet-100, .to-violet-50,
    .to-indigo-100, .to-indigo-50 {
      --tw-gradient-to: hsl(var(--primary) / 0.04) !important;
    }

    /* ── Ring / Focus ──────────────────────────────────────────────── */
    .ring-purple-600, .ring-purple-500, .ring-violet-600, .ring-violet-500,
    .ring-indigo-600, .ring-indigo-500 {
      --tw-ring-color: hsl(var(--ring)) !important;
    }
    .focus\\:ring-purple-500:focus, .focus\\:ring-violet-500:focus, .focus\\:ring-indigo-500:focus,
    .focus-visible\\:ring-purple-500:focus-visible {
      --tw-ring-color: hsl(var(--ring)) !important;
    }

    /* ── SVG Fill ──────────────────────────────────────────────────── */
    .fill-purple-600, .fill-violet-600, .fill-indigo-600,
    .fill-purple-500, .fill-violet-500, .fill-indigo-500 {
      fill: ${primary} !important;
    }

    /* ── Divide colors ─────────────────────────────────────────────── */
    .divide-purple-200 > *, .divide-violet-200 > *, .divide-indigo-200 > * {
      border-color: hsl(var(--primary) / 0.2) !important;
    }

    /* ── Global Page Background Transparency & Glassmorphism ─────────
       Strips opaque page wrapper backgrounds so the brand gradient on <body>
       shows through cleanly across all 54+ pages instantly.
    ─────────────────────────────────────────────────────────────────── */
    main,
    .min-h-screen,
    [class*="min-h-screen"] {
      background-color: transparent !important;
    }

    /* Make common page container backgrounds semi-transparent or transparent */
    .bg-gray-50, .bg-gray-100, .bg-slate-50, .bg-slate-100,
    .dark .bg-gray-900, .dark .bg-slate-900, .dark .bg-gray-950, .dark .bg-slate-950 {
      background-color: transparent !important;
    }

    /* Elevated cards get crisp glassmorphism over the gradient */
    .bg-white\/90, .bg-white\/80, .bg-white\/95,
    .dark .bg-gray-800\/90, .dark .bg-gray-800\/80 {
      backdrop-filter: blur(12px) !important;
      -webkit-backdrop-filter: blur(12px) !important;
    }
  `;
}


/**
 * Remove all injected brand CSS vars (revert to index.css defaults).
 */
function removeCSSVars() {
  const root = document.documentElement;
  const vars = [
    '--primary', '--primary-foreground', '--secondary', '--secondary-foreground',
    '--accent', '--accent-foreground', '--ring',
    '--sidebar-background', '--sidebar-foreground', '--sidebar-primary',
    '--sidebar-primary-foreground', '--sidebar-accent', '--sidebar-accent-foreground',
    '--sidebar-border', '--sidebar-ring',
    '--brand-gradient-start', '--brand-gradient-end', '--brand-gradient-dir',
    '--brand-dark-gradient-start', '--brand-dark-gradient-end', '--brand-scrollbar-color',
  ];
  vars.forEach(v => root.style.removeProperty(v));
  root.removeAttribute('data-brand-color1');
  root.removeAttribute('data-brand-color2');

  // Remove injected style tag
  document.getElementById('brand-body-gradient')?.remove();
}

// ─── Provider ────────────────────────────────────────────────────────

interface BrandingProviderProps {
  children: React.ReactNode;
}

export function BrandingProvider({ children }: BrandingProviderProps) {
  const [brandingConfig, setBrandingConfig] = useState<BrandingConfig>(DEFAULT_BRANDING);
  const [palette, setPalette] = useState<BrandingPalette>(() => deriveFullPalette(DEFAULT_BRANDING));
  const [isLoading, setIsLoading] = useState(true);
  const [isCustomBranded, setIsCustomBranded] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const savedConfigRef = useRef<BrandingConfig>(DEFAULT_BRANDING);

  // Load branding from Supabase on mount
  const loadBranding = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Get restaurant ID for this user
      const { data: profile } = await supabase
        .from('profiles')
        .select('restaurant_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.restaurant_id) {
        setIsLoading(false);
        return;
      }

      const { data: settings, error: settingsError } = await supabase
        .from('restaurant_settings')
        .select('branding_config')
        .eq('restaurant_id', profile.restaurant_id)
        .maybeSingle();

      // If column doesn't exist yet (migration pending), gracefully fall back to defaults
      if (settingsError?.code === '42703' || settingsError?.message?.includes('branding_config')) {
        console.info('[BrandingProvider] branding_config column not yet migrated — using defaults');
        setIsLoading(false);
        return;
      }

      const raw = settings?.branding_config as BrandingConfig | null;

      if (raw && isValidHex(raw.color1 || '')) {
        // Validate and apply saved branding
        const config: BrandingConfig = {
          mode: raw.mode || 'gradient',
          color1: raw.color1 || DEFAULT_BRANDING.color1,
          color2: raw.color2 || DEFAULT_BRANDING.color2,
          gradient_direction: raw.gradient_direction ?? 135,
          font_family: raw.font_family || 'Inter',
          logo_url: raw.logo_url || null,
          advanced_overrides: raw.advanced_overrides || {
            accent_hex: null, secondary_hex: null, sidebar_text: null,
          },
        };
        savedConfigRef.current = config;
        setBrandingConfig(config);
        const derived = deriveFullPalette(config);
        setPalette(derived);
        injectCSSVars(derived, config);
        setIsCustomBranded(true);
      } else {
        // No custom branding, use defaults but still inject to ensure clean state
        savedConfigRef.current = DEFAULT_BRANDING;
        const derived = deriveFullPalette(DEFAULT_BRANDING);
        setPalette(derived);
        injectCSSVars(derived, DEFAULT_BRANDING);
        setIsCustomBranded(false);
      }
    } catch (err) {
      console.warn('[BrandingProvider] Failed to load branding:', err);
      // Silently fall back to defaults
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBranding();
  }, [loadBranding]);

  const saveBranding = useCallback(async (config: BrandingConfig) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: profile } = await supabase
      .from('profiles')
      .select('restaurant_id')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.restaurant_id) throw new Error('No restaurant found');

    // Upsert into restaurant_settings
    const { error } = await supabase
      .from('restaurant_settings')
      .upsert({
        restaurant_id: profile.restaurant_id,
        branding_config: config as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'restaurant_id' });

    if (error) throw error;

    // Apply immediately
    savedConfigRef.current = config;
    setBrandingConfig(config);
    setIsCustomBranded(true);
    setIsPreviewing(false);
    const derived = deriveFullPalette(config);
    setPalette(derived);
    injectCSSVars(derived, config);
  }, []);

  const resetToDefaults = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('restaurant_id')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.restaurant_id) {
      await supabase
        .from('restaurant_settings')
        .update({ branding_config: null, updated_at: new Date().toISOString() })
        .eq('restaurant_id', profile.restaurant_id);
    }

    savedConfigRef.current = DEFAULT_BRANDING;
    setBrandingConfig(DEFAULT_BRANDING);
    setIsCustomBranded(false);
    setIsPreviewing(false);
    removeCSSVars();
    // Re-inject defaults to ensure clean state
    const derived = deriveFullPalette(DEFAULT_BRANDING);
    setPalette(derived);
    injectCSSVars(derived, DEFAULT_BRANDING);
  }, []);

  const previewBranding = useCallback((config: BrandingConfig) => {
    setIsPreviewing(true);
    const derived = deriveFullPalette(config);
    setPalette(derived);
    injectCSSVars(derived, config);
  }, []);

  const cancelPreview = useCallback(() => {
    setIsPreviewing(false);
    const derived = deriveFullPalette(savedConfigRef.current);
    setPalette(derived);
    injectCSSVars(derived, savedConfigRef.current);
    setBrandingConfig(savedConfigRef.current);
  }, []);

  const value: BrandingContextValue = {
    brandingConfig,
    palette,
    isCustomBranded,
    isLoading,
    saveBranding,
    resetToDefaults,
    previewBranding,
    cancelPreview,
    isPreviewing,
    reloadBranding: loadBranding,
  };

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────

export function useBrandingContext(): BrandingContextValue {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error('useBrandingContext must be inside BrandingProvider');
  return ctx;
}
