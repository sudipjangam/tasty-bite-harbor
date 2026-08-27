export type TableShape = "square" | "circle" | "rectangle" | "booth";

export type TableOccupancyStatus =
  | "available"   // Green - Ready to seat
  | "seated"      // Blue - Guests seated, ordering
  | "served"      // Orange - Food served, dining in progress
  | "billed"      // Purple - Bill presented, awaiting payment
  | "reserved"    // Yellow - Reserved for upcoming booking
  | "dirty";      // Gray - Needs bussing & sanitizing

export interface FloorSection {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
}

export interface TableOrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  course?: "starter" | "main" | "dessert" | "beverage";
  status?: "ordered" | "preparing" | "ready" | "served";
  notes?: string;
}

export interface TableActiveOrder {
  orderId: string;
  orderNumber?: string;
  customerName?: string;
  customerPhone?: string;
  waiterName?: string;
  guestCount: number;
  seatedAt: string;
  items: TableOrderItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  status: string;
  isBillPrinted: boolean;
  currentCourse?: "starter" | "main" | "dessert";
}

export interface FloorTable {
  id: string;
  restaurant_id: string;
  name: string;
  capacity: number;
  status: TableOccupancyStatus;
  section: string;
  x_pos: number;
  y_pos: number;
  width: number;
  height: number;
  shape: TableShape;
  rotation?: number;
  activeOrder?: TableActiveOrder;
  mergedWithTableId?: string;
  occupiedMinutes?: number;
  created_at?: string;
  updated_at?: string;
}

export interface SplitCheckItem {
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface SplitCheck {
  id: string;
  checkNumber: number;
  guestName: string;
  items: SplitCheckItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: "cash" | "upi" | "card" | "wallet";
  isPaid: boolean;
  paidAt?: string;
}

export interface SplitBillSession {
  tableId: string;
  tableName: string;
  orderId: string;
  totalAmount: number;
  splitMode: "equal" | "itemized" | "custom";
  checks: SplitCheck[];
}

export type ArchitecturalElementType =
  | "wall"
  | "door"
  | "pillar"
  | "bar_counter"
  | "kitchen_window"
  | "restroom"
  | "plant"
  | "cashier_desk"
  | "stairs";

export interface ArchitecturalElement {
  id: string;
  restaurant_id: string;
  section: string;
  type: ArchitecturalElementType;
  label?: string;
  x_pos: number;
  y_pos: number;
  width: number;
  height: number;
  rotation?: number; // 0, 90, 180, 270 degrees
  color?: string;
}

