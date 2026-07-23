/**
 * Feature Component Mapping Utility
 * 
 * Centralizes the mapping between:
 * - `app_components` table entries (by name) → Feature Registry keys
 * - Feature Registry categories → UI category groups for role dialogs
 * 
 * This is the SINGLE SOURCE OF TRUTH for component-to-feature resolution.
 * Both EditRoleDialog and PermissionManager import from here.
 */

import { FEATURE_REGISTRY, FeatureCategory } from '@/constants/featureRegistry';
import { supabase } from '@/integrations/supabase/client';

// ─── Auto-generated map from FEATURE_REGISTRY ───────────────────────────────
// Maps app_component name (lowercase) → first feature key in that category
// e.g., 'dashboard' → 'dashboard.basic', 'pos' → 'pos.basic'

interface ComponentMapping {
  featureKey: string;
  categoryId: string;
  categoryLabel: string;
  categoryIcon: string;
  categoryColor: string;
}

/**
 * Build the mapping from app_component names to their feature keys.
 * Uses the FEATURE_REGISTRY as the single source of truth.
 * 
 * The mapping handles:
 * 1. Direct category ID match: 'dashboard' → 'dashboard.basic'
 * 2. Common name aliases: 'QSR POS' → 'qsr-pos.basic', 'Recipes' → 'recipes.view'
 * 3. Fallback: component_name → `${name}.view`
 */
const buildComponentMap = (): Record<string, ComponentMapping> => {
  const map: Record<string, ComponentMapping> = {};

  for (const category of FEATURE_REGISTRY) {
    const firstFeature = category.features[0];
    if (!firstFeature) continue;

    const mapping: ComponentMapping = {
      featureKey: firstFeature.key,
      categoryId: category.id,
      categoryLabel: category.label,
      categoryIcon: category.icon,
      categoryColor: category.color,
    };

    // Map the category ID as a component name (e.g., 'dashboard', 'pos', 'quickserve')
    map[category.id.toLowerCase()] = mapping;

    // Map the category label as well (e.g., 'Quick Serve', 'POS Systems')
    map[category.label.toLowerCase()] = mapping;
  }

  // ── Explicit aliases for app_components names that don't match category IDs ──
  // These handle names in the `app_components` DB table that differ from registry IDs
  const aliases: Record<string, string> = {
    'qsr pos': 'qsr-pos',
    'qsr-pos': 'qsr-pos',
    'quick serve': 'quickserve',
    'quickserve pos': 'quickserve',
    'nc-orders': 'orders',
    'nc orders': 'orders',
    'channel management': 'channel_mgmt',
    'housekeeping': 'housekeeping',
    'rooms': 'rooms',
    'user management': 'users_permissions',
    'role management': 'users_permissions',
    'permission management': 'users_permissions',
    'ai assistant': 'ai',
    'security': 'settings',
    'recipes': 'recipes',
    'recipes & costing': 'recipes',
    'franchise': 'franchise',
    'franchise portal': 'franchise',
    'franchise management': 'franchise',
  };

  for (const [alias, categoryId] of Object.entries(aliases)) {
    const category = FEATURE_REGISTRY.find((c) => c.id === categoryId);
    if (category && category.features.length > 0) {
      // Find a more specific feature key if possible
      let featureKey = category.features[0].key;
      const aliasNorm = alias.toLowerCase();

      // Try to find a feature whose key matches the alias more closely
      if (aliasNorm === 'housekeeping') featureKey = 'rooms.housekeeping';
      else if (aliasNorm === 'rooms') featureKey = 'rooms.management';
      else if (aliasNorm === 'channel management') featureKey = 'rooms.channel_mgmt';
      else if (aliasNorm === 'user management') featureKey = 'users_permissions.user_access';
      else if (aliasNorm === 'role management') featureKey = 'users_permissions.permission_management';
      else if (aliasNorm === 'permission management') featureKey = 'users_permissions.permission_management';
      else if (aliasNorm === 'ai assistant') featureKey = 'ai.assistant';
      else if (aliasNorm === 'security') featureKey = 'settings.security';
      else if (aliasNorm === 'nc-orders' || aliasNorm === 'nc orders') featureKey = 'orders.nc_orders';
      else if (aliasNorm === 'financial') featureKey = 'financial.dashboard';

      map[alias.toLowerCase()] = {
        featureKey,
        categoryId: category.id,
        categoryLabel: category.label,
        categoryIcon: category.icon,
        categoryColor: category.color,
      };
    }
  }

  return map;
};

const COMPONENT_MAP = buildComponentMap();

/**
 * Get the feature key for an app_component by its display name.
 * Used by EditRoleDialog and PermissionManager to filter components
 * against the subscription plan.
 */
export const getFeatureKeyForComponent = (componentName: string): string => {
  const norm = componentName.toLowerCase().trim();
  const mapping = COMPONENT_MAP[norm];
  if (mapping) return mapping.featureKey;
  // Fallback: construct a reasonable key
  return `${norm.replace(/\s+/g, '_')}.view`;
};

/**
 * Get the UI category info for an app_component by its display name.
 * Used to group components in role management dialogs.
 */
export const getCategoryForComponent = (componentName: string): {
  id: string;
  label: string;
  icon: string;
  color: string;
} => {
  const norm = componentName.toLowerCase().trim();
  const mapping = COMPONENT_MAP[norm];
  if (mapping) {
    return {
      id: mapping.categoryId,
      label: mapping.categoryLabel,
      icon: mapping.categoryIcon,
      color: mapping.categoryColor,
    };
  }
  // Fallback category
  return { id: 'other', label: 'Other', icon: 'Settings', color: 'from-slate-500 to-gray-600' };
};

/**
 * Get grouped categories from the FEATURE_REGISTRY for UI rendering.
 * Returns a map of category labels → metadata (icon, color).
 */
export const getRegistryCategories = (): Record<string, {
  icon: string;
  label: string;
  color: string;
}> => {
  const categories: Record<string, { icon: string; label: string; color: string }> = {};
  for (const cat of FEATURE_REGISTRY) {
    categories[cat.id] = {
      icon: cat.icon,
      label: cat.label,
      color: cat.color,
    };
  }
  return categories;
};

/**
 * Sync the `app_components` table with the FEATURE_REGISTRY.
 * Ensures every category in the registry has a corresponding row in `app_components`.
 * 
 * This is called when the role dialogs open, so new registry entries are
 * automatically available for component access assignment.
 * 
 * @returns The full list of app_components after sync
 */
export const syncAppComponentsWithRegistry = async (): Promise<Array<{
  id: string;
  name: string;
  description: string | null;
}>> => {
  // 1. Fetch current app_components
  const { data: existing, error: fetchError } = await supabase
    .from('app_components')
    .select('id, name, description')
    .order('name');

  if (fetchError) {
    console.error('[syncAppComponents] Error fetching:', fetchError);
    return existing || [];
  }

  const existingNames = new Set((existing || []).map((c) => c.name.toLowerCase()));

  // 2. Determine which registry categories are missing from app_components
  // Map registry category IDs → a human-readable component name
  const registryComponentNames: Record<string, { name: string; description: string }> = {};
  
  for (const cat of FEATURE_REGISTRY) {
    // Use a display-friendly name for the app_component
    const displayName = getDisplayNameForCategory(cat);
    if (!existingNames.has(displayName.toLowerCase())) {
      registryComponentNames[cat.id] = {
        name: displayName,
        description: cat.features[0]?.description || cat.label,
      };
    }
  }

  // 3. Insert missing components
  const toInsert = Object.values(registryComponentNames);
  if (toInsert.length > 0) {
    console.log('[syncAppComponents] Inserting missing components:', toInsert.map(c => c.name));
    const { error: insertError } = await supabase
      .from('app_components')
      .insert(toInsert);

    if (insertError) {
      console.error('[syncAppComponents] Error inserting:', insertError);
    }
  }

  // 4. Return the final list
  const { data: finalList, error: finalError } = await supabase
    .from('app_components')
    .select('id, name, description')
    .order('name');

  if (finalError) {
    console.error('[syncAppComponents] Error fetching final list:', finalError);
    return existing || [];
  }

  return finalList || [];
};

/**
 * Convert a FeatureCategory to a display name for app_components.
 * Uses existing well-known names from the DB where possible.
 */
const getDisplayNameForCategory = (cat: FeatureCategory): string => {
  // Map category IDs to the names already used in app_components
  const knownNames: Record<string, string> = {
    'dashboard': 'Dashboard',
    'pos': 'POS',
    'quickserve': 'QuickServe POS',
    'qsr-pos': 'QSR POS',
    'orders': 'Orders',
    'kitchen': 'Kitchen',
    'menu': 'Menu',
    'inventory': 'Inventory',
    'recipes': 'Recipes',
    'tables': 'Tables',
    'reports': 'Reports',
    'customers': 'Customers',
    'staff': 'Staff',
    'financial': 'Financial',
    'expenses': 'Expenses',
    'suppliers': 'Suppliers',
    'reservations': 'Reservations',
    'rooms': 'Rooms',
    'housekeeping': 'Housekeeping',
    'channel_mgmt': 'Channel Management',
    'gate': 'Gate Services',
    'settings': 'Settings',
    'users_permissions': 'User Management',
    'ai': 'AI Assistant',
    'marketing': 'Marketing',
    'franchise': 'Franchise Portal',
  };
  return knownNames[cat.id] || cat.label;
};
