import React, { useEffect, useState, useRef, useCallback } from "react";
import { User, Phone, Star, Gift, UserPlus, Loader2, RotateCcw, ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { sanitizeOrderItemDisplay } from "@/lib/order-utils";
import { Button } from "@/components/ui/button";

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

export interface LastOrderInfo {
  id: string;
  items: string[];
  total: number;
  created_at: string;
}

interface QSCustomerInputProps {
  customerName: string;
  customerPhone: string;
  onNameChange: (name: string) => void;
  onPhoneChange: (phone: string) => void;
  onCustomerFound?: (customer: LoyaltyCustomerInfo | null) => void;
  onReorder?: (items: { name: string; quantity: number; price: number }[]) => void;
}

// ─── In-memory LRU cache for customer lookups ───────────────────────────────
// Avoids repeated DB hits for same phone during a session (peak hour fix)
const CACHE_MAX = 200;
const CACHE_TTL = 5 * 60 * 1000; // 5 min

interface CacheEntry {
  customer: LoyaltyCustomerInfo | null;
  lastOrder: LastOrderInfo | null;
  timestamp: number;
}

const customerCache = new Map<string, CacheEntry>();

function getCached(key: string): CacheEntry | undefined {
  const entry = customerCache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    customerCache.delete(key);
    return undefined;
  }
  return entry;
}

function setCache(key: string, customer: LoyaltyCustomerInfo | null, lastOrder: LastOrderInfo | null) {
  // Evict oldest if full
  if (customerCache.size >= CACHE_MAX) {
    const firstKey = customerCache.keys().next().value;
    if (firstKey) customerCache.delete(firstKey);
  }
  customerCache.set(key, { customer, lastOrder, timestamp: Date.now() });
}

export const QSCustomerInput: React.FC<QSCustomerInputProps> = ({
  customerName,
  customerPhone,
  onNameChange,
  onPhoneChange,
  onCustomerFound,
  onReorder,
}) => {
  const { restaurantId } = useRestaurantId();
  const { symbol: currencySymbol } = useCurrencyContext();
  const [foundCustomer, setFoundCustomer] = useState<LoyaltyCustomerInfo | null>(null);
  const [lastOrder, setLastOrder] = useState<LastOrderInfo | null>(null);
  const [isLastOrderExpanded, setIsLastOrderExpanded] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [lookupDone, setLookupDone] = useState(false);

  // Stable refs to avoid stale closures in useEffect
  const onCustomerFoundRef = useRef(onCustomerFound);
  onCustomerFoundRef.current = onCustomerFound;
  const onNameChangeRef = useRef(onNameChange);
  onNameChangeRef.current = onNameChange;
  const customerNameRef = useRef(customerName);
  customerNameRef.current = customerName;

  // Abort controller for cancelling in-flight requests
  const abortRef = useRef<AbortController | null>(null);

  // Lookup customer by phone — only when 10 digits entered
  useEffect(() => {
    // Reset state when phone changes
    setIsNewCustomer(false);
    setLookupDone(false);
    setLastOrder(null);
    setIsLastOrderExpanded(false);

    // Only search at exactly 10 digits
    if (customerPhone.length !== 10 || !restaurantId) {
      if (customerPhone.length < 10) {
        setFoundCustomer(null);
        onCustomerFoundRef.current?.(null);
      }
      return;
    }

    // Cancel any in-flight request
    abortRef.current?.abort();

    const cacheKey = `${restaurantId}:${customerPhone}`;

    // Check cache first — skip DB entirely if hit
    const cachedEntry = getCached(cacheKey);
    if (cachedEntry !== undefined) {
      const cachedCustomer = cachedEntry.customer;
      setFoundCustomer(cachedCustomer);
      setLastOrder(cachedEntry.lastOrder);
      onCustomerFoundRef.current?.(cachedCustomer);
      setIsNewCustomer(cachedCustomer === null);
      setLookupDone(true);
      if (cachedCustomer && !customerNameRef.current && cachedCustomer.name) {
        onNameChangeRef.current(cachedCustomer.name);
      }
      return;
    }

    // Debounce 300ms then query
    const timer = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      setIsSearching(true);

      try {
        const { data, error } = await supabase
          .from("customers")
          .select("id, name, phone, loyalty_points, loyalty_tier_id, visit_count, total_spent, loyalty_tiers(name, color)")
          .eq("restaurant_id", restaurantId)
          .eq("phone", customerPhone)
          .maybeSingle()
          .abortSignal(controller.signal);

        // If aborted, bail
        if (controller.signal.aborted) return;

        if (error) {
          console.error("Customer lookup error:", error);
          setFoundCustomer(null);
          onCustomerFoundRef.current?.(null);
          setIsNewCustomer(false);
          setLookupDone(true);
          return;
        }

        let lastOrderData: LastOrderInfo | null = null;

        if (data) {
          // Fetch last order
          const { data: orderData, error: orderError } = await supabase
            .from("orders")
            .select("id, items, total, created_at")
            .eq("restaurant_id", restaurantId)
            .eq("customer_phone", customerPhone)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
            .abortSignal(controller.signal);

          if (!orderError && orderData) {
            lastOrderData = {
              id: orderData.id,
              items: Array.isArray(orderData.items) ? orderData.items : [],
              total: Number(orderData.total) || 0,
              created_at: orderData.created_at,
            };
          }

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
          setLastOrder(lastOrderData);
          onCustomerFoundRef.current?.(customerInfo);
          setIsNewCustomer(false);
          setCache(cacheKey, customerInfo, lastOrderData);
          // Auto-fill name if empty
          if (!customerNameRef.current && data.name) {
            onNameChangeRef.current(data.name);
          }
        } else {
          // Phone not in DB — new customer
          setFoundCustomer(null);
          onCustomerFoundRef.current?.(null);
          setIsNewCustomer(true);
          setCache(cacheKey, null, null);
        }
        setLookupDone(true);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        console.error("Customer lookup error:", err);
        setFoundCustomer(null);
        onCustomerFoundRef.current?.(null);
        setLookupDone(true);
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [customerPhone, restaurantId]);

  // Parse order items for display and reordering
  const parseOrderItems = (items: any) => {
    if (!Array.isArray(items)) return [];
    return items
      .map((itemStr: string) => {
        const match = itemStr.match(/^(\d+)x\s+(.+)\s+@(\d+(?:\.\d+)?)$/);
        if (match) {
          return {
            quantity: parseInt(match[1], 10),
            name: sanitizeOrderItemDisplay(match[2]),
            price: parseFloat(match[3]),
          };
        }
        return { quantity: 1, name: String(itemStr), price: 0 };
      })
      .filter(Boolean);
  };

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
            className={cn(
              "pl-8 bg-white/70 dark:bg-white/5 backdrop-blur-sm border-gray-200/50 dark:border-white/[0.08] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/20 h-9 rounded-xl text-xs focus:border-orange-300 dark:focus:border-orange-500/40 focus:ring-orange-400/20 transition-all",
              lookupDone && isNewCustomer && "border-amber-400/60 dark:border-amber-500/40",
              lookupDone && foundCustomer && "border-green-400/60 dark:border-green-500/40",
            )}
            type="tel"
            maxLength={10}
          />
          {/* Inline search spinner */}
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-orange-400 animate-spin" />
          )}
        </div>
      </div>

      {/* Loyalty Points Badge — existing customer */}
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

      {/* Existing customer with 0 points */}
      {foundCustomer && foundCustomer.loyalty_points === 0 && (
        <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-500/10 dark:to-emerald-500/10 rounded-xl border border-green-200/50 dark:border-green-500/20 animate-in slide-in-from-top-2 duration-300">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shrink-0">
            <User className="h-3.5 w-3.5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold text-green-700 dark:text-green-300">
              Welcome back, {foundCustomer.name || "Customer"}!
            </span>
            <p className="text-[10px] text-green-600/70 dark:text-green-400/50">
              {foundCustomer.visit_count} visits • {currencySymbol}{foundCustomer.total_spent.toFixed(0)} spent
            </p>
          </div>
        </div>
      )}

      {/* New Customer — not found in DB */}
      {isNewCustomer && !isSearching && (
        <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 rounded-xl border border-amber-200/50 dark:border-amber-500/20 animate-in slide-in-from-top-2 duration-300">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shrink-0">
            <UserPlus className="h-3.5 w-3.5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
              New Customer
            </span>
            <p className="text-[10px] text-amber-600/70 dark:text-amber-400/50">
              First visit — will be added to loyalty program on order
            </p>
          </div>
        </div>
      )}

      {/* Last Order Panel */}
      {foundCustomer && lastOrder && (
        <div className="flex flex-col gap-1.5 p-2 bg-gradient-to-r from-orange-50 to-pink-50 dark:from-orange-500/10 dark:to-pink-500/10 rounded-xl border border-orange-200/50 dark:border-orange-500/20 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between text-xs">
            <button
              onClick={() => setIsLastOrderExpanded(!isLastOrderExpanded)}
              className="flex items-center gap-1 font-bold text-orange-700 dark:text-orange-300 hover:text-orange-600 transition-colors"
            >
              {isLastOrderExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
              <span>Last Order • {currencySymbol}{lastOrder.total.toFixed(0)}</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-gray-500 dark:text-white/40">
                {formatDistanceToNow(new Date(lastOrder.created_at), { addSuffix: true })}
              </span>
              {!isLastOrderExpanded && onReorder && (
                <Button
                  onClick={() => onReorder(parseOrderItems(lastOrder.items))}
                  size="sm"
                  variant="ghost"
                  className="h-6 px-1.5 text-[10px] font-bold text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-500/20"
                >
                  Repeat
                </Button>
              )}
            </div>
          </div>

          {isLastOrderExpanded && (
            <div className="mt-1 space-y-1.5 border-t border-orange-200/30 dark:border-orange-500/10 pt-1.5 animate-in fade-in duration-200">
              <div className="text-[11px] text-gray-600 dark:text-white/70 max-h-20 overflow-y-auto space-y-0.5 pr-1">
                {parseOrderItems(lastOrder.items).map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span>{item.quantity}x {sanitizeOrderItemDisplay(item.name)}</span>
                    <span className="text-gray-400 dark:text-white/40">{currencySymbol}{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              {onReorder && (
                <Button
                  onClick={() => onReorder(parseOrderItems(lastOrder.items))}
                  size="sm"
                  variant="outline"
                  className="w-full mt-1 border-orange-300 dark:border-orange-500/30 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-500/10 h-7 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="h-3 w-3" />
                  Repeat Last Order
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {isSearching && (
        <p className="text-[10px] text-gray-400 dark:text-white/30 animate-pulse">Looking up customer...</p>
      )}
    </div>
  );
};
