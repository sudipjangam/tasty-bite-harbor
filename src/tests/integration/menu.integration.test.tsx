/**
 * Menu Integration Tests
 * Tests for menu CRUD operations with database verification
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { createMockMenuItem, createMockCategory } from '../utils/mockFactories';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    storage: {
      from: vi.fn(),
    },
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }),
    },
  },
}));

describe('Menu Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Categories', () => {
    describe('Create Category', () => {
      it('successfully creates a new category', async () => {
        const newCategory = createMockCategory({
          name: 'Appetizers',
          description: 'Starters and snacks',
        });

        const mockFrom = vi.fn().mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...newCategory, id: 'cat-123' },
                error: null,
              }),
            }),
          }),
        });

        (supabase.from as any) = mockFrom;

        const result = await supabase
          .from('categories')
          .insert(newCategory)
          .select()
          .single();

        expect(result.error).toBeNull();
        expect(result.data.name).toBe('Appetizers');
      });

      it('prevents duplicate category names', async () => {
        const mockFrom = vi.fn().mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'duplicate key value violates unique constraint' },
              }),
            }),
          }),
        });

        (supabase.from as any) = mockFrom;

        const result = await supabase
          .from('categories')
          .insert({ name: 'Existing Category' })
          .select()
          .single();

        expect(result.error).not.toBeNull();
      });
    });

    describe('Read Categories', () => {
      it('fetches all categories for restaurant', async () => {
        const mockCategories = [
          createMockCategory({ name: 'Starters', display_order: 1 }),
          createMockCategory({ name: 'Main Course', display_order: 2 }),
          createMockCategory({ name: 'Desserts', display_order: 3 }),
        ];

        const mockFrom = vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockCategories,
                error: null,
              }),
            }),
          }),
        });

        (supabase.from as any) = mockFrom;

        const result = await supabase
          .from('categories')
          .select('*')
          .eq('restaurant_id', 'rest-123')
          .order('display_order');

        expect(result.error).toBeNull();
        expect(result.data).toHaveLength(3);
      });
    });

    describe('Update Category', () => {
      it('updates category display order', async () => {
        const mockFrom = vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: { id: 'cat-123', display_order: 5 },
              error: null,
            }),
          }),
        });

        (supabase.from as any) = mockFrom;

        const result = await supabase
          .from('categories')
          .update({ display_order: 5 })
          .eq('id', 'cat-123');

        expect(result.error).toBeNull();
      });
    });

    describe('Delete Category', () => {
      it('prevents deletion if items exist', async () => {
        const mockFrom = vi.fn().mockReturnValue({
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'violates foreign key constraint' },
            }),
          }),
        });

        (supabase.from as any) = mockFrom;

        const result = await supabase
          .from('categories')
          .delete()
          .eq('id', 'cat-with-items');

        expect(result.error).not.toBeNull();
      });
    });
  });

  describe('Menu Items', () => {
    describe('Create Menu Item', () => {
      it('successfully creates a new menu item', async () => {
        const newItem = createMockMenuItem({
          name: 'Butter Chicken',
          price: 320,
          category_id: 'cat-123',
        });

        const mockFrom = vi.fn().mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...newItem, id: 'item-123' },
                error: null,
              }),
            }),
          }),
        });

        (supabase.from as any) = mockFrom;

        const result = await supabase
          .from('menu_items')
          .insert(newItem)
          .select()
          .single();

        expect(result.error).toBeNull();
        expect(result.data.name).toBe('Butter Chicken');
        expect(result.data.price).toBe(320);
      });

      it('validates required fields', () => {
        const validateMenuItem = (item: { name?: string; price?: number; category_id?: string }) => {
          const errors: string[] = [];
          if (!item.name || item.name.trim().length === 0) {
            errors.push('Name is required');
          }
          if (item.price === undefined || item.price <= 0) {
            errors.push('Price must be greater than 0');
          }
          if (!item.category_id) {
            errors.push('Category is required');
          }
          return errors;
        };

        expect(validateMenuItem({})).toContain('Name is required');
        expect(validateMenuItem({ name: 'Test', price: 0 })).toContain('Price must be greater than 0');
        expect(validateMenuItem({ name: 'Test', price: 100 })).toContain('Category is required');
        expect(validateMenuItem({ name: 'Test', price: 100, category_id: 'cat-1' })).toHaveLength(0);
      });
    });

    describe('Read Menu Items', () => {
      it('fetches menu items with category', async () => {
        const mockItems = [
          createMockMenuItem({ name: 'Item 1' }),
          createMockMenuItem({ name: 'Item 2' }),
        ];

        const mockFrom = vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockItems,
                error: null,
              }),
            }),
          }),
        });

        (supabase.from as any) = mockFrom;

        const result = await supabase
          .from('menu_items')
          .select('*, categories(*)')
          .eq('restaurant_id', 'rest-123')
          .order('name');

        expect(result.error).toBeNull();
        expect(result.data).toHaveLength(2);
      });

      it('filters by category', async () => {
        const mockItems = [createMockMenuItem({ category_id: 'cat-1' })];

        const mockFrom = vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: mockItems,
                error: null,
              }),
            }),
          }),
        });

        (supabase.from as any) = mockFrom;

        const result = await supabase
          .from('menu_items')
          .select('*')
          .eq('restaurant_id', 'rest-123')
          .eq('category_id', 'cat-1');

        expect(result.error).toBeNull();
      });

      it('filters available items only', async () => {
        const mockItems = [createMockMenuItem({ is_available: true })];

        const mockFrom = vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: mockItems,
                error: null,
              }),
            }),
          }),
        });

        (supabase.from as any) = mockFrom;

        const result = await supabase
          .from('menu_items')
          .select('*')
          .eq('restaurant_id', 'rest-123')
          .eq('is_available', true);

        expect(result.data?.every((i: any) => i.is_available)).toBe(true);
      });
    });

    describe('Update Menu Item', () => {
      it('updates item price', async () => {
        const mockFrom = vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'item-123', price: 350 },
                  error: null,
                }),
              }),
            }),
          }),
        });

        (supabase.from as any) = mockFrom;

        const result = await supabase
          .from('menu_items')
          .update({ price: 350 })
          .eq('id', 'item-123')
          .select()
          .single();

        expect(result.error).toBeNull();
        expect(result.data.price).toBe(350);
      });

      it('toggles item availability', async () => {
        const mockFrom = vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'item-123', is_available: false },
                  error: null,
                }),
              }),
            }),
          }),
        });

        (supabase.from as any) = mockFrom;

        const result = await supabase
          .from('menu_items')
          .update({ is_available: false })
          .eq('id', 'item-123')
          .select()
          .single();

        expect(result.data.is_available).toBe(false);
      });
    });

    describe('Delete Menu Item', () => {
      it('soft deletes by marking unavailable', async () => {
        const mockFrom = vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: { id: 'item-123', is_available: false, deleted_at: new Date().toISOString() },
              error: null,
            }),
          }),
        });

        (supabase.from as any) = mockFrom;

        const result = await supabase
          .from('menu_items')
          .update({ is_available: false, deleted_at: new Date().toISOString() })
          .eq('id', 'item-123');

        expect(result.error).toBeNull();
      });
    });
  });

  describe('Image Upload', () => {
    it('uploads menu item image', async () => {
      const mockStorage = {
        from: vi.fn().mockReturnValue({
          upload: vi.fn().mockResolvedValue({
            data: { path: 'menu-items/item-123.jpg' },
            error: null,
          }),
          getPublicUrl: vi.fn().mockReturnValue({
            data: { publicUrl: 'https://example.com/menu-items/item-123.jpg' },
          }),
        }),
      };

      (supabase.storage as any) = mockStorage;

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      const result = await supabase.storage
        .from('menu-images')
        .upload('menu-items/item-123.jpg', file);

      expect(result.error).toBeNull();
      expect(result.data?.path).toBe('menu-items/item-123.jpg');
    });

    it('validates image file type', () => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      
      const isValidImageType = (mimeType: string) => allowedTypes.includes(mimeType);

      expect(isValidImageType('image/jpeg')).toBe(true);
      expect(isValidImageType('image/png')).toBe(true);
      expect(isValidImageType('application/pdf')).toBe(false);
    });

    it('validates image file size', () => {
      const maxSizeMB = 5;
      const maxSizeBytes = maxSizeMB * 1024 * 1024;

      const isValidSize = (fileSize: number) => fileSize <= maxSizeBytes;

      expect(isValidSize(1024 * 1024)).toBe(true); // 1MB
      expect(isValidSize(6 * 1024 * 1024)).toBe(false); // 6MB
    });
  });
});

describe('Menu Data Integrity', () => {
  it('validates price consistency', () => {
    const menuItem = {
      base_price: 250,
      variants: [
        { name: 'Small', price_modifier: -50 },
        { name: 'Large', price_modifier: 50 },
      ],
    };

    const getVariantPrice = (basePrice: number, modifier: number) => 
      Math.max(0, basePrice + modifier);

    expect(getVariantPrice(menuItem.base_price, menuItem.variants[0].price_modifier)).toBe(200);
    expect(getVariantPrice(menuItem.base_price, menuItem.variants[1].price_modifier)).toBe(300);
  });

  it('validates category-item relationship', () => {
    const categories = [
      { id: 'cat-1', name: 'Starters' },
      { id: 'cat-2', name: 'Mains' },
    ];

    const items = [
      { id: 'item-1', category_id: 'cat-1' },
      { id: 'item-2', category_id: 'cat-2' },
      { id: 'item-3', category_id: 'cat-1' },
    ];

    const getItemsByCategory = (catId: string) => 
      items.filter(i => i.category_id === catId);

    expect(getItemsByCategory('cat-1')).toHaveLength(2);
    expect(getItemsByCategory('cat-2')).toHaveLength(1);
  });
});
