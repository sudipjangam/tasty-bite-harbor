
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Banknote, CreditCard, QrCode, Wallet, Check } from 'lucide-react';
import { cn } from "@/lib/utils";

interface PaymentMethodSelectorProps {
  selectedMethod: string;
  onMethodChange: (method: string) => void;
  onQRPayment?: () => void;
}

const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({ 
  selectedMethod, 
  onMethodChange,
  onQRPayment
}) => {
  const handleQRPayment = () => {
    onMethodChange('qr');
    if (onQRPayment) {
      onQRPayment();
    }
  };

  const paymentMethods = [
    {
      id: 'cash',
      name: 'Cash',
      description: 'Pay with cash',
      icon: Banknote,
      gradient: 'from-emerald-500 to-teal-600',
      onClick: () => onMethodChange('cash'),
    },
    {
      id: 'card',
      name: 'Card',
      description: 'Credit/Debit',
      icon: CreditCard,
      gradient: 'from-blue-500 to-indigo-600',
      onClick: () => onMethodChange('card'),
    },
    {
      id: 'qr',
      name: 'UPI/QR',
      description: 'Scan to pay',
      icon: QrCode,
      gradient: 'from-purple-500 to-pink-600',
      onClick: handleQRPayment,
      badges: ['GPay', 'PhonePe', 'Paytm'],
    },
    {
      id: 'online',
      name: 'Online',
      description: 'Net banking',
      icon: Wallet,
      gradient: 'from-orange-500 to-amber-600',
      onClick: () => onMethodChange('online'),
    },
  ];

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg">
          <CreditCard className="h-4 w-4 text-white" />
        </div>
        <h3 className="text-lg font-bold text-indigo-700 dark:text-indigo-300">
          Payment Method
        </h3>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        {paymentMethods.map((method) => {
          const isSelected = selectedMethod === method.id;
          const Icon = method.icon;
          
          return (
            <button
              key={method.id}
              type="button"
              onClick={method.onClick}
              className={cn(
                "group relative p-3 rounded-xl border-2 transition-all duration-200 text-left",
                "hover:shadow-md",
                isSelected
                  ? "bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 border-indigo-400 dark:border-indigo-500"
                  : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300"
              )}
            >
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 shadow">
                  <Check className="h-2.5 w-2.5 text-white" />
                </div>
              )}
              
              <div className="flex items-center gap-2">
                {/* Icon */}
                <div className={cn(
                  "p-2 rounded-lg transition-all",
                  isSelected 
                    ? `bg-gradient-to-br ${method.gradient} shadow` 
                    : "bg-gray-100 dark:bg-gray-700"
                )}>
                  <Icon className={cn(
                    "h-4 w-4",
                    isSelected ? "text-white" : "text-gray-500 dark:text-gray-400"
                  )} />
                </div>
                
                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className={cn(
                    "font-semibold text-sm leading-tight",
                    isSelected ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"
                  )}>
                    {method.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
                    {method.description}
                  </div>
                </div>
              </div>
              
              {/* UPI Badges - compact */}
              {method.badges && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {method.badges.map((badge) => (
                    <Badge 
                      key={badge}
                      variant="secondary" 
                      className="text-[10px] px-1.5 py-0 h-4"
                    >
                      {badge}
                    </Badge>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PaymentMethodSelector;
