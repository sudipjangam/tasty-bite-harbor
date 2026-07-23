import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useBranding } from '@/hooks/useBranding';
import {
  BrandingConfig,
  THEME_PRESETS,
  DEFAULT_BRANDING,
  deriveFullPalette,
  getContrastLevel,
  isValidHex,
  normalizeHex,
} from '@/utils/colorUtils';
import {
  Palette,
  Sparkles,
  RotateCcw,
  Save,
  Eye,
  EyeOff,
  Sun,
  Moon,
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  ShoppingCart,
  Users,
  TrendingUp,
  Settings,
  Check,
  AlertTriangle,
  Info,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Preview Component ────────────────────────────────────────────────

interface MiniPreviewProps {
  config: BrandingConfig;
  darkMode: boolean;
}

function MiniPreview({ config, darkMode }: MiniPreviewProps) {
  const palette = deriveFullPalette(config);
  const sidebarBg = `hsl(${palette.sidebarBg})`;
  const sidebarAccent = `hsl(${palette.sidebarAccent})`;
  const primaryHsl = `hsl(${palette.primary})`;
  const gradDir = config.gradient_direction;

  const cardBg = darkMode ? '#1e293b' : '#ffffff';
  const cardBorder = darkMode ? '#334155' : '#e2e8f0';
  const textColor = darkMode ? '#f1f5f9' : '#1e293b';
  const mutedText = darkMode ? '#94a3b8' : '#64748b';
  const pageBg = darkMode
    ? `linear-gradient(${gradDir}deg, ${palette.darkGradientStart} 0%, ${palette.darkGradientEnd} 100%)`
    : `linear-gradient(${gradDir}deg, ${palette.gradientStart} 0%, ${palette.gradientEnd} 100%)`;

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', active: true },
    { icon: ShoppingCart, label: 'Orders', active: false },
    { icon: Users, label: 'Staff', active: false },
    { icon: TrendingUp, label: 'Analytics', active: false },
    { icon: Settings, label: 'Settings', active: false },
  ];

  return (
    <div
      className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-2xl"
      style={{ height: '320px', display: 'flex' }}
    >
      {/* Mini Sidebar */}
      <div
        style={{
          width: '120px',
          background: sidebarBg,
          display: 'flex',
          flexDirection: 'column',
          padding: '8px',
          flexShrink: 0,
        }}
      >
        {/* Logo area */}
        <div style={{ padding: '8px 4px 12px', borderBottom: `1px solid ${sidebarAccent}`, marginBottom: '8px' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '6px',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '4px',
          }}>
            <div style={{ width: '10px', height: '10px', background: 'white', borderRadius: '2px' }} />
          </div>
          <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.9)', fontWeight: 600, lineHeight: 1.2 }}>
            My Restaurant
          </div>
          <div style={{ fontSize: '6px', color: 'rgba(255,255,255,0.5)' }}>Dashboard</div>
        </div>

        {/* Nav Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
          {navItems.map(({ icon: Icon, label, active }) => (
            <div
              key={label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 6px',
                borderRadius: '5px',
                background: active ? 'rgba(255,255,255,0.95)' : 'transparent',
                cursor: 'pointer',
              }}
            >
              <Icon style={{
                width: '8px', height: '8px',
                color: active ? primaryHsl : 'rgba(255,255,255,0.7)',
                flexShrink: 0,
              }} />
              <span style={{
                fontSize: '7px',
                color: active ? '#1e293b' : 'rgba(255,255,255,0.75)',
                fontWeight: active ? 600 : 400,
              }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main content area */}
      <div style={{ flex: 1, background: pageBg, padding: '10px', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.95)',
          marginBottom: '8px', letterSpacing: '0.3px',
        }}>
          Dashboard Overview
        </div>

        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', marginBottom: '8px' }}>
          {['₹24,580', '142', '98%'].map((val, i) => (
            <div key={i} style={{
              background: cardBg,
              border: `1px solid ${cardBorder}`,
              borderRadius: '6px',
              padding: '6px',
            }}>
              <div style={{ fontSize: '6px', color: mutedText, marginBottom: '2px' }}>
                {['Revenue', 'Orders', 'Satisfaction'][i]}
              </div>
              <div style={{ fontSize: '9px', fontWeight: 700, color: textColor }}>{val}</div>
              <div style={{ height: '2px', borderRadius: '1px', background: primaryHsl, marginTop: '3px', width: ['70%', '85%', '60%'][i] }} />
            </div>
          ))}
        </div>

        {/* Chart area */}
        <div style={{
          background: cardBg, border: `1px solid ${cardBorder}`,
          borderRadius: '6px', padding: '6px', marginBottom: '6px',
        }}>
          <div style={{ fontSize: '6px', color: mutedText, marginBottom: '4px', fontWeight: 600 }}>Revenue Trend</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '28px' }}>
            {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
              <div key={i} style={{
                flex: 1, height: `${h}%`,
                background: i === 5
                  ? primaryHsl
                  : `linear-gradient(to top, ${palette.gradientStart}40, ${palette.gradientEnd}40)`,
                borderRadius: '2px 2px 0 0',
              }} />
            ))}
          </div>
        </div>

        {/* Buttons row */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <div style={{
            flex: 1, background: primaryHsl,
            borderRadius: '4px', padding: '4px 6px',
            fontSize: '6px', color: 'white', fontWeight: 600, textAlign: 'center',
          }}>
            New Order
          </div>
          <div style={{
            flex: 1,
            background: `linear-gradient(90deg, ${palette.gradientStart}, ${palette.gradientEnd})`,
            borderRadius: '4px', padding: '4px 6px',
            fontSize: '6px', color: 'white', fontWeight: 600, textAlign: 'center',
          }}>
            View Reports
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Contrast Score Badge ─────────────────────────────────────────────

function ContrastBadge({ color1, color2, label }: { color1: string; color2: string; label: string }) {
  if (!isValidHex(color1) || !isValidHex(color2)) return null;
  const level = getContrastLevel(color1, color2);
  return (
    <span className={cn(
      'text-[10px] font-bold px-1.5 py-0.5 rounded',
      level === 'AAA' ? 'bg-green-100 text-green-700' :
      level === 'AA' ? 'bg-yellow-100 text-yellow-700' :
      'bg-red-100 text-red-700',
    )}>
      {level === 'FAIL' ? '⚠️ Low contrast' : `✓ ${level} contrast`}
    </span>
  );
}

// ─── Hex Color Input ─────────────────────────────────────────────────

interface HexInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  hint?: string;
}

function HexInput({ label, value, onChange, hint }: HexInputProps) {
  const [inputVal, setInputVal] = useState(value);
  const valid = isValidHex(normalizeHex(inputVal));

  useEffect(() => setInputVal(value), [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setInputVal(raw);
    const normalized = normalizeHex(raw);
    if (isValidHex(normalized)) onChange(normalized);
  };

  const handleNativeColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    setInputVal(hex);
    onChange(hex);
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">{label}</Label>
      <div className="flex items-center gap-2">
        {/* Native color picker circle */}
        <div className="relative w-10 h-10 rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-600 shadow-sm flex-shrink-0 cursor-pointer hover:scale-105 transition-transform">
          <input
            type="color"
            value={isValidHex(value) ? value : '#667eea'}
            onChange={handleNativeColorChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div
            className="w-full h-full"
            style={{ background: isValidHex(value) ? value : '#667eea' }}
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Palette className="h-3 w-3 text-white/80 drop-shadow" />
          </div>
        </div>

        {/* Text input */}
        <div className="flex-1">
          <input
            type="text"
            value={inputVal}
            onChange={handleChange}
            placeholder="#667eea"
            maxLength={7}
            className={cn(
              'w-full px-3 py-2 text-sm font-mono rounded-lg border-2 transition-colors',
              'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100',
              'focus:outline-none focus:ring-2 focus:ring-primary/30',
              valid
                ? 'border-gray-200 dark:border-gray-600 focus:border-primary'
                : 'border-red-300 dark:border-red-700 focus:border-red-400',
            )}
          />
        </div>
      </div>
      {hint && (
        <p className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <Info className="h-2.5 w-2.5" />
          {hint}
        </p>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────

export function BrandingSettingsTab() {
  const { toast } = useToast();
  const {
    brandingConfig,
    isLoading,
    isCustomBranded,
    saveBranding,
    resetToDefaults,
    previewBranding,
    cancelPreview,
    isPreviewing,
  } = useBranding();

  // Local editing state (does NOT affect app until preview or save)
  const [localConfig, setLocalConfig] = useState<BrandingConfig>(brandingConfig);
  const [previewDark, setPreviewDark] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync local state when DB config loads
  useEffect(() => {
    setLocalConfig(brandingConfig);
  }, [brandingConfig]);

  // Auto-preview as user changes colors (debounced)
  useEffect(() => {
    if (!isValidHex(localConfig.color1)) return;
    if (localConfig.mode === 'gradient' && localConfig.color2 && !isValidHex(localConfig.color2)) return;
    const id = setTimeout(() => previewBranding(localConfig), 150);
    return () => clearTimeout(id);
  }, [localConfig, previewBranding]);

  const updateLocal = useCallback((patch: Partial<BrandingConfig>) => {
    setLocalConfig(prev => ({ ...prev, ...patch }));
    setSaveSuccess(false);
  }, []);

  const handleSave = async () => {
    if (!isValidHex(localConfig.color1)) {
      toast({ title: 'Invalid color', description: 'Color 1 must be a valid hex color', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      await saveBranding(localConfig);
      setSaveSuccess(true);
      toast({
        title: isCustomBranded ? '🎨 Branding updated!' : '🎉 Your brand is live!',
        description: isCustomBranded
          ? 'New colors applied across the app'
          : 'Your software now looks uniquely yours!',
      });
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      toast({ title: 'Save failed', description: String(err), variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await resetToDefaults();
      setLocalConfig(DEFAULT_BRANDING);
      toast({ title: '⭐ Reset to default', description: 'Swadeshi Solutions theme restored' });
    } catch (err) {
      toast({ title: 'Reset failed', description: String(err), variant: 'destructive' });
    } finally {
      setIsResetting(false);
    }
  };

  const handlePresetSelect = useCallback((preset: typeof THEME_PRESETS[0]) => {
    // If user picks the default Swadeshi theme, trigger full reset
    if (preset.isDefault) {
      handleReset();
      return;
    }
    const newConfig: BrandingConfig = {
      ...localConfig,
      mode: preset.mode,
      color1: preset.color1,
      color2: preset.color2,
      gradient_direction: preset.direction,
    };
    setLocalConfig(newConfig);
    setSaveSuccess(false);
  }, [localConfig, handleReset]);

  const handleCancelPreview = () => {
    cancelPreview();
    setLocalConfig(brandingConfig);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isChanged = JSON.stringify(localConfig) !== JSON.stringify(brandingConfig);
  const palette = deriveFullPalette(localConfig);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border border-white/30 dark:border-gray-700/30 rounded-3xl shadow-2xl overflow-hidden">
        <div
          className="h-2 w-full"
          style={{
            background: localConfig.mode === 'gradient'
              ? `linear-gradient(90deg, ${localConfig.color1}, ${localConfig.color2 || localConfig.color1})`
              : localConfig.color1,
          }}
        />
        <CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <div className="p-3 rounded-xl shadow-lg" style={{
                  background: localConfig.mode === 'gradient'
                    ? `linear-gradient(135deg, ${localConfig.color1}, ${localConfig.color2 || localConfig.color1})`
                    : localConfig.color1,
                }}>
                  <Palette className="h-6 w-6 text-white" />
                </div>
                Brand Customization
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400 mt-2">
                White-label the app with your brand colors. Changes apply across sidebar, cards, buttons, and gradients.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {isCustomBranded && !isPreviewing && (
                <Badge className="bg-green-100 text-green-700 border-green-200 gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Custom Brand Active
                </Badge>
              )}
              {isPreviewing && (
                <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1 animate-pulse">
                  <Eye className="h-3 w-3" /> Previewing
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="grid grid-cols-1 xl:grid-cols-2 divide-y xl:divide-y-0 xl:divide-x divide-gray-100 dark:divide-gray-700">

            {/* ── LEFT: Controls ── */}
            <div className="p-6 space-y-6">

              {/* Theme Mode Toggle */}
              <div className="space-y-3">
                <Label className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Theme Mode
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {(['solid', 'gradient'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => updateLocal({ mode })}
                      className={cn(
                        'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 text-left',
                        localConfig.mode === mode
                          ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-md'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500',
                      )}
                    >
                      <div className="w-full h-6 rounded-md overflow-hidden" style={{
                        background: mode === 'solid'
                          ? (localConfig.color1 || '#667eea')
                          : `linear-gradient(90deg, ${localConfig.color1 || '#667eea'}, ${localConfig.color2 || '#764ba2'})`,
                      }} />
                      <span className={cn(
                        'text-xs font-semibold capitalize',
                        localConfig.mode === mode ? 'text-primary' : 'text-gray-600 dark:text-gray-400',
                      )}>
                        {mode === 'solid' ? '◼ Solid Color' : '🌈 Gradient (2 colors)'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Pickers */}
              <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                <HexInput
                  label={localConfig.mode === 'gradient' ? 'Color 1 (Start / Primary)' : 'Brand Color'}
                  value={localConfig.color1}
                  onChange={(v) => updateLocal({ color1: v })}
                  hint={localConfig.mode === 'solid' ? 'Sidebar and primary UI elements' : 'Start color of your gradient'}
                />

                {localConfig.mode === 'gradient' && (
                  <>
                    <HexInput
                      label="Color 2 (End)"
                      value={localConfig.color2 || ''}
                      onChange={(v) => updateLocal({ color2: v })}
                      hint="End color of the gradient"
                    />

                    {/* Gradient Direction */}
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Gradient Direction — {localConfig.gradient_direction}°
                      </Label>
                      <input
                        type="range"
                        min={0}
                        max={360}
                        step={15}
                        value={localConfig.gradient_direction}
                        onChange={(e) => updateLocal({ gradient_direction: Number(e.target.value) })}
                        className="w-full accent-primary"
                      />
                      <div className="flex justify-between text-[10px] text-gray-400">
                        <span>→ 0°</span>
                        <span>↘ 135°</span>
                        <span>↓ 180°</span>
                        <span>↗ 225°</span>
                        <span>← 270°</span>
                      </div>
                    </div>
                  </>
                )}

                {/* Contrast Score */}
                {isValidHex(localConfig.color1) && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">Sidebar text readability:</span>
                    <ContrastBadge color1={localConfig.color1} color2="#ffffff" label="White text" />
                  </div>
                )}
              </div>

              {/* Preset Themes */}
              <div className="space-y-3">
                <Label className="text-sm font-bold text-gray-800 dark:text-gray-200">
                  Preset Themes
                </Label>

                {/* Default theme — full width, prominent */}
                {(() => {
                  const defaultPreset = THEME_PRESETS.find(p => p.isDefault);
                  if (!defaultPreset) return null;
                  const isDefaultActive = !isCustomBranded || (
                    localConfig.color1 === defaultPreset.color1 &&
                    localConfig.color2 === defaultPreset.color2
                  );
                  return (
                    <button
                      onClick={() => handlePresetSelect(defaultPreset)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 text-left hover:scale-[1.01]',
                        isDefaultActive
                          ? 'border-primary shadow-md shadow-primary/20 bg-primary/5'
                          : 'border-dashed border-gray-300 dark:border-gray-600 hover:border-primary/40 bg-gray-50/50 dark:bg-gray-800/30',
                      )}
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex-shrink-0 shadow-sm border border-white/20"
                        style={{
                          background: `linear-gradient(135deg, ${defaultPreset.color1}, ${defaultPreset.color2})`,
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className={cn(
                          'text-xs font-bold truncate flex items-center gap-1.5',
                          isDefaultActive ? 'text-primary' : 'text-gray-700 dark:text-gray-300',
                        )}>
                          {defaultPreset.emoji} {defaultPreset.name}
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 uppercase tracking-wider">
                            Default
                          </span>
                        </div>
                        <div className="text-[9px] text-gray-400 truncate">{defaultPreset.description}</div>
                      </div>
                      {isDefaultActive && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                    </button>
                  );
                })()}

                {/* Other presets — 2-column grid */}
                <div className="grid grid-cols-2 gap-2">
                  {THEME_PRESETS.filter(p => !p.isDefault).map((preset) => {
                    const isActive = localConfig.color1 === preset.color1 && localConfig.color2 === preset.color2;
                    return (
                      <button
                        key={preset.id}
                        onClick={() => handlePresetSelect(preset)}
                        className={cn(
                          'flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all duration-200 text-left hover:scale-[1.02]',
                          isActive
                            ? 'border-primary shadow-md shadow-primary/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300',
                        )}
                      >
                        {/* Gradient swatch */}
                        <div
                          className="w-8 h-8 rounded-lg flex-shrink-0 shadow-sm border border-white/20"
                          style={{
                            background: `linear-gradient(135deg, ${preset.color1}, ${preset.color2})`,
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className={cn(
                            'text-[11px] font-semibold truncate',
                            isActive ? 'text-primary' : 'text-gray-700 dark:text-gray-300',
                          )}>
                            {preset.emoji} {preset.name}
                          </div>
                          <div className="text-[9px] text-gray-400 truncate">{preset.description}</div>
                        </div>
                        {isActive && <Check className="h-3 w-3 text-primary flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Advanced (collapsed) */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors text-sm font-semibold text-gray-700 dark:text-gray-300"
                >
                  <span className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Advanced Overrides
                  </span>
                  {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {showAdvanced && (
                  <div className="p-4 space-y-4 bg-white dark:bg-gray-800">
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1.5">
                      <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      Override specific auto-derived colors. Leave blank to use auto-derived values.
                    </p>
                    <HexInput
                      label="Accent Color Override"
                      value={localConfig.advanced_overrides?.accent_hex || ''}
                      onChange={(v) => updateLocal({
                        advanced_overrides: { ...localConfig.advanced_overrides, accent_hex: v }
                      })}
                      hint="Buttons, badges, highlights (auto-derived if empty)"
                    />
                    <HexInput
                      label="Secondary Color Override"
                      value={localConfig.advanced_overrides?.secondary_hex || ''}
                      onChange={(v) => updateLocal({
                        advanced_overrides: { ...localConfig.advanced_overrides, secondary_hex: v }
                      })}
                      hint="Secondary elements (auto-derived if empty)"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* ── RIGHT: Live Preview ── */}
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                  <Eye className="h-4 w-4 text-primary" />
                  Live Preview
                </Label>
                {/* Light/Dark toggle */}
                <button
                  onClick={() => setPreviewDark(!previewDark)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    previewDark
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
                  )}
                >
                  {previewDark ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
                  {previewDark ? 'Dark Mode' : 'Light Mode'}
                </button>
              </div>

              <MiniPreview config={localConfig} darkMode={previewDark} />

              {/* Derived palette summary */}
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: 'Primary', color: `hsl(${palette.primary})` },
                  { label: 'Sidebar', color: `hsl(${palette.sidebarBg})` },
                  { label: 'Accent', color: `hsl(${palette.accent})` },
                  { label: 'Secondary', color: `hsl(${palette.secondary})` },
                ].map(({ label, color }) => (
                  <div key={label} className="text-center">
                    <div className="w-full h-6 rounded-md mb-1 border border-white/20 shadow-sm" style={{ background: color }} />
                    <div className="text-[9px] text-gray-500 dark:text-gray-400">{label}</div>
                  </div>
                ))}
              </div>

              {/* Info note */}
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/30">
                <Info className="h-3.5 w-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-[10px] text-blue-700 dark:text-blue-300 leading-relaxed">
                  Preview updates as you pick colors. Click <strong>Save Brand</strong> to apply permanently. Click the preview toggle to see Dark Mode adaptation.
                </p>
              </div>

              {/* What gets themed */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">What gets themed:</div>
                <div className="flex flex-wrap gap-1">
                  {['Sidebar', 'Navigation', 'Buttons', 'Body background', 'Scrollbar', 'Cards', 'Charts', 'Badges'].map(item => (
                    <span key={item} className="text-[9px] px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>

        {/* Footer / Action Bar */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between flex-wrap gap-3 rounded-b-3xl">
          <div className="flex items-center gap-2">
            {isPreviewing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelPreview}
                className="text-xs gap-1.5 text-gray-600 hover:text-gray-900"
              >
                <EyeOff className="h-3.5 w-3.5" />
                Cancel Preview
              </Button>
            )}
            {isCustomBranded && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                disabled={isResetting}
                className="text-xs gap-1.5 text-gray-500 hover:text-red-600"
              >
                {isResetting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                Reset to Default
              </Button>
            )}
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving || !isValidHex(localConfig.color1)}
            className={cn(
              'gap-2 font-semibold px-6 rounded-xl shadow-lg transition-all duration-300',
              saveSuccess
                ? 'bg-green-500 hover:bg-green-500 text-white'
                : '',
            )}
            style={!saveSuccess ? {
              background: localConfig.mode === 'gradient'
                ? `linear-gradient(90deg, ${localConfig.color1}, ${localConfig.color2 || localConfig.color1})`
                : localConfig.color1,
            } : undefined}
          >
            {isSaving ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
            ) : saveSuccess ? (
              <><Check className="h-4 w-4" /> Saved!</>
            ) : (
              <><Save className="h-4 w-4" /> Save Brand</>
            )}
          </Button>
        </div>
      </Card>

      {/* Premium TODO note (hidden in UI, tracked for future) */}
      {/* TODO: Gate BrandingSettingsTab behind FeatureLock feature="branding.customize" when premium plans are updated */}
    </div>
  );
}
