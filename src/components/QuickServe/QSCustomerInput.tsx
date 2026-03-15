import React, { useEffect, useState } from "react";
import { User, Phone, Star, Gift } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";

export interface LoyaltyCustomerInfo {
  id: string;
  name: string;
  phone: string;
  loyalty_points: number;
  loyalty_tier_name: string;
  loyalty_tier_color: string;
  visit_count: number;
  total_spent: number;
}

interface QSCustomerInputProps {
  customerName: string;
  customerPhone: string;
  onNameChange: (name: string) => void;
  onPhoneChange: (phone: string) => void;
  onCustomerFound?: (customer: LoyaltyCustomerInfo | null) => void;
}

export const QSCustomerInput: React.FC<QSCustomerInputProps> = ({
  customerName,
  customerPhone,
  onNameChange,
  onPhoneChange,
  onCustomerFound,
}) => {
  const { restaurantId } = useRestaurantId();
  const { symbol: currencySymbol } = useCurrencyContext();
  const [foundCustomer, setFoundCustomer] = useState<LoyaltyCustomerInfo | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Lookup customer by phone when 10 digits entered
  useEffect(() => {
    if (customerPhone.length !== 10 || !restaurantId) {
      setFoundCustomer(null);
      onCustomerFound?.(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        // Use correct columns from customers table + join loyalty_tiers for name
        const { data, error } = await supabase
          .from("customers")
          .select("id, name, phone, loyalty_points, loyalty_tier_id, visit_count, total_spent, loyalty_tiers(name, color)")
          .eq("restaurant_id", restaurantId)
          .eq("phone", customerPhone)
          .maybeSingle();

        if (error) {
          console.error("Customer lookup error:", error);
          setFoundCustomer(null);
          onCustomerFound?.(null);
          return;
        }

        if (data) {
          const tierData = data.loyalty_tiers as any;
          const customerInfo: LoyaltyCustomerInfo = {
            id: data.id,
            name: data.name || "",
            phone: data.phone || "",
            loyalty_points: data.loyalty_points || 0,
            loyalty_tier_name: tierData?.name || "",
            loyalty_tier_color: tierData?.color || "",
            visit_count: data.visit_count || 0,
            total_spent: data.total_spent || 0,
          };
          setFoundCustomer(customerInfo);
          onCustomerFound?.(customerInfo);
          // Auto-fill name if empty
          if (!customerName && data.name) {
            onNameChange(data.name);
          }
        } else {
          setFoundCustomer(null);
          onCustomerFound?.(null);
        }
      } catch (err) {
        console.error("Customer lookup error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerPhone, restaurantId]);

  return (
    <div className="px-4 py-2.5 space-y-2 border-b border-gray-200/50 dark:border-white/5">
      <p className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-white/30 font-semibold">
        Customer (optional)
      </p>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-orange-400/60 dark:text-orange-500/40" />
          <Input
            placeholder="Name"
            value={customerName}
            onChange={(e) => onNameChange(e.target.value)}
            className="pl-8 bg-white/70 dark:bg-white/5 backdrop-blur-sm border-gray-200/50 dark:border-white/[0.08] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/20 h-9 rounded-xl text-xs focus:border-orange-300 dark:focus:border-orange-500/40 focus:ring-orange-400/20 transition-all"
          />
        </div>
        <div className="relative flex-1">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-orange-400/60 dark:text-orange-500/40" />
          <Input
            placeholder="Phone"
            value={customerPhone}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "").slice(0, 10);
              onPhoneChange(val);
            }}
            className="pl-8 bg-white/70 dark:bg-white/5 backdrop-blur-sm border-gray-200/50 dark:border-white/[0.08] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/20 h-9 rounded-xl text-xs focus:border-orange-300 dark:focus:border-orange-500/40 focus:ring-orange-400/20 transition-all"
            type="tel"
            maxLength={10}
          />
        </div>
      </div>

      {/* Loyalty Points Badge */}
      {foundCustomer && foundCustomer.loyalty_points > 0 && (
        <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-500/10 dark:to-indigo-500/10 rounded-xl border border-purple-200/50 dark:border-purple-500/20 animate-in slide-in-from-top-2 duration-300">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shrink-0">
            <Gift className="h-3.5 w-3.5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-purple-700 dark:text-purple-300">
                {foundCustomer.loyalty_points.toLocaleString()} pts
              </span>
              {foundCustomer.loyalty_tier_name && (
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-md text-white"
                  style={{ backgroundColor: foundCustomer.loyalty_tier_color || '#7c3aed' }}
                >
                  {foundCustomer.loyalty_tier_name}
                </span>
              )}
            </div>
            <p className="text-[10px] text-purple-600/70 dark:text-purple-400/50">
              {foundCustomer.visit_count} visits • {currencySymbol}{foundCustomer.total_spent.toFixed(0)} spent
            </p>
          </div>
          <Star className="h-4 w-4 text-yellow-500 shrink-0" />
        </div>
      )}

      {isSearching && (
        <p className="text-[10px] text-gray-400 dark:text-white/30 animate-pulse">Looking up customer...</p>
      )}
    </div>
  );
};
