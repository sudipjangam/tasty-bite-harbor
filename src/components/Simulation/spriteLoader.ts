/**
 * spriteLoader.ts
 * Loads all pixel art sprite sheet images and provides them to PixiJS.
 * Uses standard HTMLImageElement loading since the generated sprites
 * are single images (not texture atlases with JSON metadata).
 *
 * For PixiJS v8 we use Assets.load() which returns Texture objects.
 */
import { Assets, Texture, Rectangle, type UnresolvedAsset } from 'pixi.js';

// ── Manifest ────────────────────────────────────────────────────

const SPRITE_BASE = '/sprites';

const manifest: Record<string, string> = {
  tileset:    `${SPRITE_BASE}/tileset.png`,
  furniture:  `${SPRITE_BASE}/furniture.png`,
  characters: `${SPRITE_BASE}/characters.png`,
  kitchen:    `${SPRITE_BASE}/kitchen.png`,
};

// ── State ───────────────────────────────────────────────────────

let loaded = false;
let loadPromise: Promise<void> | null = null;
const textures: Record<string, Texture> = {};

// ── Public API ──────────────────────────────────────────────────

/**
 * Loads all sprite textures. Safe to call multiple times — will only
 * load once and return the same promise.
 */
export async function loadAllSprites(): Promise<void> {
  if (loaded) return;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      // Register all assets
      const bundles: UnresolvedAsset[] = Object.entries(manifest).map(
        ([alias, src]) => ({ alias, src })
      );

      // Add assets to the resolver
      for (const bundle of bundles) {
        Assets.add(bundle);
      }

      // Load all at once
      const results = await Assets.load(Object.keys(manifest));

      // Store textures
      for (const [key, texture] of Object.entries(results)) {
        textures[key] = texture as Texture;
      }

      loaded = true;
    } catch (err) {
      console.warn('[SpriteLoader] Failed to load sprites, will use fallback rendering:', err);
      loaded = true; // Mark as loaded so we don't retry forever
    }
  })();

  return loadPromise;
}

/**
 * Get a loaded texture by key. Returns undefined if not loaded yet.
 */
export function getTexture(key: string): Texture | undefined {
  return textures[key];
}

/**
 * Check if sprites are loaded.
 */
export function isSpritesLoaded(): boolean {
  return loaded;
}

/**
 * Check if we actually have textures (vs fallback mode).
 */
export function hasTextures(): boolean {
  return Object.keys(textures).length > 0;
}

/**
 * Extract a sub-region from a sprite sheet texture.
 * x, y, w, h are in pixel coordinates on the source image.
 */
export function getSubTexture(
  sheetKey: string,
  x: number,
  y: number,
  w: number,
  h: number
): Texture | undefined {
  const base = textures[sheetKey];
  if (!base) return undefined;

  const frame = new Rectangle(x, y, w, h);
  return new Texture({ source: base.source, frame });
}
