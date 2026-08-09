import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, RotateCcw, CheckCircle } from 'lucide-react';
import { defaultSpriteConfigs, drawCharacterFallback } from './spriteDefinitions';
import type { CharacterRole } from './spriteDefinitions';

interface SpriteSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  restaurantId: string | null;
  onSpritesChanged: (sprites: Partial<Record<CharacterRole, string>>) => void;
}

const ROLES: { role: CharacterRole; label: string; emoji: string }[] = [
  { role: 'waiter', label: 'Waiter', emoji: '🧑‍💼' },
  { role: 'chef', label: 'Chef', emoji: '👨‍🍳' },
  { role: 'customer', label: 'Customer', emoji: '👤' },
];

const STORAGE_BUCKET = 'simulation-sprites';

export const SpriteSettingsDialog: React.FC<SpriteSettingsDialogProps> = ({
  open,
  onClose,
  restaurantId,
  onSpritesChanged,
}) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState<CharacterRole | null>(null);
  const [customUrls, setCustomUrls] = useState<Partial<Record<CharacterRole, string>>>({});
  const previewRefs = useRef<Partial<Record<CharacterRole, HTMLCanvasElement>>>({});

  // Load existing custom sprites on open
  useEffect(() => {
    if (!open || !restaurantId) return;
    loadExistingSprites();
  }, [open, restaurantId]);

  const loadExistingSprites = async () => {
    if (!restaurantId) return;
    const urls: Partial<Record<CharacterRole, string>> = {};
    await Promise.all(
      ROLES.map(async ({ role }) => {
        const path = `${restaurantId}/${role}.png`;
        const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
        // Verify the file actually exists
        const res = await fetch(data.publicUrl, { method: 'HEAD' }).catch(() => null);
        if (res?.ok) {
          urls[role] = data.publicUrl + `?t=${Date.now()}`;
        }
      })
    );
    setCustomUrls(urls);
  };

  // Draw procedural preview on canvas
  useEffect(() => {
    ROLES.forEach(({ role }) => {
      const canvas = previewRefs.current[role];
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, 60, 80);
      drawCharacterFallback(ctx, 30, 65, defaultSpriteConfigs[role], 'idle', 0);
    });
  }, [open]);

  const handleUpload = async (role: CharacterRole, file: File) => {
    if (!restaurantId) {
      toast({ title: 'Demo Mode', description: 'Login to upload custom sprites', variant: 'destructive' });
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid File', description: 'Please upload a PNG or JPG image', variant: 'destructive' });
      return;
    }

    setUploading(role);
    try {
      const path = `${restaurantId}/${role}.png`;
      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type });

      if (error) throw error;

      const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      const url = data.publicUrl + `?t=${Date.now()}`;
      const updated = { ...customUrls, [role]: url };
      setCustomUrls(updated);
      onSpritesChanged(updated);

      toast({ title: 'Sprite Uploaded!', description: `Custom ${role} sprite saved` });
    } catch (err: any) {
      toast({ title: 'Upload Failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(null);
    }
  };

  const handleReset = async (role: CharacterRole) => {
    if (!restaurantId) return;
    try {
      await supabase.storage.from(STORAGE_BUCKET).remove([`${restaurantId}/${role}.png`]);
      const updated = { ...customUrls };
      delete updated[role];
      setCustomUrls(updated);
      onSpritesChanged(updated);
      toast({ title: 'Reset', description: `${role} sprite reset to default` });
    } catch (err: any) {
      toast({ title: 'Reset Failed', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🎨 Customize Character Sprites
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Upload custom PNG images (recommended: 48×64px transparent background) to replace the default character appearances.
        </p>

        <div className="space-y-4 mt-2">
          {ROLES.map(({ role, label, emoji }) => (
            <div key={role} className="flex items-center gap-4 p-3 rounded-lg border border-border bg-muted/30">
              {/* Preview */}
              <div className="relative w-16 h-20 shrink-0">
                {customUrls[role] ? (
                  <img
                    src={customUrls[role]}
                    alt={`Custom ${role}`}
                    className="w-full h-full object-contain rounded"
                  />
                ) : (
                  <canvas
                    ref={el => { if (el) previewRefs.current[role] = el; }}
                    width={60}
                    height={80}
                    className="w-full h-full"
                  />
                )}
                {customUrls[role] && (
                  <div className="absolute top-0 right-0 bg-green-500 rounded-full p-0.5">
                    <CheckCircle className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>

              {/* Info + buttons */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{emoji} {label}</p>
                <p className="text-xs text-muted-foreground mb-2">
                  {customUrls[role] ? 'Custom sprite active' : 'Using default procedural'}
                </p>
                <div className="flex gap-2">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(role, file);
                        e.target.value = '';
                      }}
                    />
                    <Button size="sm" variant="outline" disabled={uploading === role} asChild>
                      <span>
                        <Upload className="w-3 h-3 mr-1" />
                        {uploading === role ? 'Uploading…' : 'Upload'}
                      </span>
                    </Button>
                  </label>
                  {customUrls[role] && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleReset(role)}
                      className="text-destructive hover:text-destructive"
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Reset
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-2">
          💡 Sprites are stored per-restaurant and appear for all staff viewing the simulation.
        </p>
      </DialogContent>
    </Dialog>
  );
};
