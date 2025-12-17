// Shared types for PaymentDialog components
import type { OrderItem } from "@/types/orders";

export type PaymentStep = 'confirm' | 'method' | 'qr' | 'success' | 'edit';

export interface Promotion {
  id: string;
  name: string;
  promotion_code: string;
  discount_percentage?: number;
  discount_amount?: number;
  code?: string; // Applied promotion uses this
}

export interface ReservationInfo {
  reservation_id: string;
  room_id: string;
  roomName: string;
  customerName: string;
}

export interface RestaurantInfo {
  id?: string;
  restaurantId?: string;
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  logo_url?: string;
}

export interface PaymentSettings {
  id: string;
  upi_id?: string;
  is_active: boolean;
  restaurant_id: string;
}

// Props for OrderConfirmation component
export interface OrderConfirmationProps {
  orderItems: OrderItem[];
  subtotal: number;
  total: number;
  appliedPromotion: Promotion | null;
  promotionDiscountAmount: number;
  manualDiscountPercent: number;
  manualDiscountAmount: number;
  totalDiscountAmount: number;
  promotionCode: string;
  activePromotions: Promotion[];
  tableNumber?: string;
  isSaving: boolean;
  sendBillToEmail: boolean;
  customerName: string;
  customerMobile: string;
  customerEmail: string;
  detectedReservation: ReservationInfo | null;
  onApplyPromotion: (code?: string) => void;
  onRemovePromotion: () => void;
  onManualDiscountChange: (percent: number) => void;
  onPromotionCodeChange: (code: string) => void;
  onContinue: () => Promise<void>;
  onEditOrder: () => void;
  onPrintBill: () => void;
  onDeleteOrder: () => void;
  onSendBillToEmailChange: (send: boolean) => void;
  onCustomerNameChange: (name: string) => void;
  onCustomerMobileChange: (mobile: string) => void;
  onCustomerEmailChange: (email: string) => void;
  onCheckReservation: () => void;
}

// Props for PaymentMethodSelector component
export interface PaymentMethodSelectorProps {
  total: number;
  detectedReservation: ReservationInfo | null;
  isProcessing: boolean;
  onMethodSelect: (method: string) => void;
  onBack: () => void;
}

// Props for QRPaymentStep component
export interface QRPaymentStepProps {
  total: number;
  qrCodeUrl: string;
  isProcessing: boolean;
  onMarkAsPaid: () => void;
  onBack: () => void;
}

// Props for PaymentSuccessStep component
export interface PaymentSuccessStepProps {
  tableNumber?: string;
  onClose: () => void;
}

// Props for OrderEditor component
export interface OrderEditorProps {
  orderItems: OrderItem[];
  menuItems: any[];
  newItemsBuffer: OrderItem[];
  menuSearchQuery: string;
  filteredMenuItems: any[];
  onAddItem: (item: any) => void;
  onRemoveExistingItem: (index: number) => void;
  onRemoveNewItem: (id: string) => void;
  onUpdateQuantity: (id: string, qty: number) => void;
  onSearchChange: (query: string) => void;
  onSave: () => void;
  onCancel: () => void;
  tableNumber?: string;
}
