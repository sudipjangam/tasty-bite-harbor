import type { OrderItem } from "@/types/orders";

// Payment flow steps
export type PaymentStep = "confirm" | "method" | "qr" | "success" | "edit";

// Payment dialog props
export interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orderItems: OrderItem[];
  onSuccess: () => void;
  tableNumber?: string;
  onEditOrder?: () => void;
  orderId?: string;
  itemCompletionStatus?: boolean[];
  onOrderUpdated?: () => void;
  isNonChargeable?: boolean; // NC orders - no charge required
}

// Applied promotion state
export interface AppliedPromotion {
  id: string;
  promotion_code: string;
  discount_percentage?: number;
  discount_amount?: number;
  name?: string;
}

// Detected reservation for room charge
export interface DetectedReservation {
  reservation_id: string;
  room_id: string;
  roomName: string;
  customerName: string;
}

// Restaurant info from query
export interface RestaurantInfo {
  id: string;
  restaurantId?: string;
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  logo_url?: string;
}

// Payment settings from query
export interface PaymentSettings {
  id: string;
  upi_id?: string;
  merchant_name?: string;
  is_active: boolean;
}

// Menu item for edit mode
export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category?: string;
  is_available: boolean;
}

// Shared props for step components
export interface StepProps {
  onBack?: () => void;
  onNext?: () => void;
}

// Confirm step specific props
export interface ConfirmStepProps extends StepProps {
  orderItems: OrderItem[];
  subtotal: number;
  totalDiscountAmount: number;
  total: number;
  promotionDiscountAmount: number;
  manualDiscountAmount: number;
  currencySymbol: string;
  //tableNumber: string;
  tableNumber: string;
  orderId?: string;
  itemCompletionStatus?: boolean[];
  
  // Customer details
  customerName: string;
  setCustomerName: (name: string) => void;
  customerMobile: string;
  setCustomerMobile: (mobile: string) => void;
  customerEmail: string;
  setCustomerEmail: (email: string) => void;
  sendBillToEmail: boolean;
  setSendBillToEmail: (value: boolean) => void;
  
  // Discount/promotion
  promotionCode: string;
  setPromotionCode: (code: string) => void;
  appliedPromotion: AppliedPromotion | null;
  manualDiscountPercent: number;
  setManualDiscountPercent: (percent: number) => void;
  activePromotions: any[];
  
  // Actions
  onApplyPromotion: (code?: string) => void;
  onRemovePromotion: () => void;
  onEditOrder: () => void;
  onPrintBill: () => void;
  onDeleteOrder: () => void;
  onContinueToPayment: () => void;
  
  // State
  isSaving: boolean;
  detectedReservation: DetectedReservation | null;
  restaurantInfo: RestaurantInfo | null;
}

// Payment method step props
export interface PaymentMethodStepProps extends StepProps {
  total: number;
  currencySymbol: string;
  detectedReservation: DetectedReservation | null;
  onSelectMethod: (method: string) => void;
  onChargeToRoom: () => void;
  isProcessingPayment: boolean;
}

// QR payment step props
export interface QRPaymentStepProps extends StepProps {
  qrCodeUrl: string;
  total: number;
  currencySymbol: string;
  onMarkAsPaid: () => void;
  isProcessingPayment: boolean;
}

// Success step props
export interface SuccessStepProps {
  onClose: () => void;
  onNewOrder: () => void;
}

// Edit order step props
export interface EditOrderStepProps extends StepProps {
  orderItems: OrderItem[];
  newItemsBuffer: OrderItem[];
  menuItems: MenuItem[];
  menuSearchQuery: string;
  setMenuSearchQuery: (query: string) => void;
  currencySymbol: string;
  
  onAddMenuItem: (item: MenuItem) => void;
  onRemoveNewItem: (itemId: string) => void;
  onRemoveExistingItem: (index: number) => void;
  onUpdateNewItemQuantity: (itemId: string, quantity: number) => void;
  onUpdateExistingItemQuantity: (index: number, quantity: number) => void;
  onSaveNewItems: () => void;
  onOpenCustomItemDialog: () => void;
}
