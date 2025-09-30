export interface QSRMenuItem {
  id: string;
  name: string;
  price: number;
  emoji: string;
  category: string;
}

export interface QSRCategory {
  id: string;
  name: string;
  emoji: string;
}

export interface QSROrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface QSROrder {
  id?: string;
  items: QSROrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'paid' | 'pending_kot' | 'cancelled';
  created_at?: string;
  restaurant_id?: string;
  customer_name?: string;
}

// Mock menu data
export const QSR_CATEGORIES: QSRCategory[] = [
  { id: 'breakfast', name: 'Breakfast', emoji: '🌅' },
  { id: 'lunch', name: 'Lunch Combos', emoji: '🍛' },
  { id: 'snacks', name: 'Snacks', emoji: '🍿' },
  { id: 'beverages', name: 'Beverages', emoji: '☕' },
];

export const QSR_MENU_ITEMS: QSRMenuItem[] = [
  // Breakfast
  { id: 'pancakes', name: 'Pancakes Stack', price: 6.99, emoji: '🥞', category: 'breakfast' },
  { id: 'aloo-paratha', name: 'Aloo Paratha', price: 4.50, emoji: '🫓', category: 'breakfast' },
  { id: 'masala-dosa', name: 'Masala Dosa', price: 5.25, emoji: '🌯', category: 'breakfast' },
  { id: 'poha', name: 'Poha', price: 3.99, emoji: '🍚', category: 'breakfast' },
  { id: 'idli-sambar', name: 'Idli Sambar', price: 4.25, emoji: '⚪', category: 'breakfast' },
  { id: 'upma', name: 'Upma', price: 3.75, emoji: '🥣', category: 'breakfast' },
  
  // Lunch Combos
  { id: 'thali', name: 'Veg Thali', price: 12.99, emoji: '🍽️', category: 'lunch' },
  { id: 'biryani', name: 'Veg Biryani', price: 10.50, emoji: '🍛', category: 'lunch' },
  { id: 'chole-bhature', name: 'Chole Bhature', price: 8.99, emoji: '🫓', category: 'lunch' },
  { id: 'rajma-rice', name: 'Rajma Rice', price: 9.25, emoji: '🍚', category: 'lunch' },
  { id: 'paneer-tikka', name: 'Paneer Tikka', price: 11.50, emoji: '🧆', category: 'lunch' },
  { id: 'dal-makhani', name: 'Dal Makhani', price: 8.75, emoji: '🥘', category: 'lunch' },
  
  // Snacks
  { id: 'vada-pav', name: 'Vada Pav', price: 3.50, emoji: '🍔', category: 'snacks' },
  { id: 'samosa', name: 'Samosa', price: 2.99, emoji: '🥟', category: 'snacks' },
  { id: 'pav-bhaji', name: 'Pav Bhaji', price: 7.50, emoji: '🍲', category: 'snacks' },
  { id: 'pakora', name: 'Pakora', price: 4.25, emoji: '🥙', category: 'snacks' },
  { id: 'chaat', name: 'Chaat', price: 5.99, emoji: '🥗', category: 'snacks' },
  { id: 'sandwich', name: 'Sandwich', price: 4.50, emoji: '🥪', category: 'snacks' },
  
  // Beverages
  { id: 'coffee', name: 'Coffee', price: 2.99, emoji: '☕', category: 'beverages' },
  { id: 'tea', name: 'Masala Tea', price: 2.50, emoji: '🍵', category: 'beverages' },
  { id: 'lassi', name: 'Lassi', price: 3.99, emoji: '🥤', category: 'beverages' },
  { id: 'nimbu-pani', name: 'Nimbu Pani', price: 2.25, emoji: '🍋', category: 'beverages' },
  { id: 'milkshake', name: 'Milkshake', price: 4.50, emoji: '🥛', category: 'beverages' },
  { id: 'fresh-juice', name: 'Fresh Juice', price: 3.75, emoji: '🧃', category: 'beverages' },
];
