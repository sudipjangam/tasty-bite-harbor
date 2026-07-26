import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "../../ui/button";
import {
  IndianRupee,
  CreditCard,
  History,
  Loader2,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Wallet {
  balance: number;
  restaurant_id: string;
}

interface WalletTransaction {
  id: string;
  amount: number;
  transaction_type: "deposit" | "deduction" | "refund";
  description: string;
  created_at: string;
}

interface MarketingWalletProps {
  restaurantId: string;
  onBalanceChange?: (newBalance: number) => void;
}

export function MarketingWallet({
  restaurantId,
  onBalanceChange,
}: MarketingWalletProps) {
  const { toast } = useToast();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [rechargeAmount, setRechargeAmount] = useState<string>("500");
  const [isRecharging, setIsRecharging] = useState(false);
  const [totalSent, setTotalSent] = useState(0);
  const [showTransactions, setShowTransactions] = useState(false);

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      // Fetch wallet
      const { data: walletData, error: walletError } = await supabase
        .from("restaurant_wallets")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .single();

      if (walletError && walletError.code !== "PGRST116") throw walletError;

      if (walletData) {
        setWallet(walletData);
        if (onBalanceChange) onBalanceChange(walletData.balance);
      }

      // Fetch transactions
      const { data: txData, error: txError } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (txError) throw txError;
      setTransactions(txData || []);

      // Fetch total sent from whatsapp_campaign_sends
      const { count, error: countError } = await supabase
        .from("whatsapp_campaign_sends")
        .select("*", { count: "exact", head: true })
        .eq("restaurant_id", restaurantId)
        .eq("status", "sent");

      if (!countError && count !== null) {
        setTotalSent(count);
      }
    } catch (error: any) {
      console.error("Error fetching wallet data:", error);
      toast({
        title: "Error",
        description: "Failed to load wallet information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (restaurantId) {
      fetchWalletData();

      // Subscribe to wallet changes
      const subscription = supabase
        .channel("wallet_changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "restaurant_wallets",
            filter: `restaurant_id=eq.${restaurantId}`,
          },
          (payload) => {
            const newWallet = payload.new as Wallet;
            setWallet(newWallet);
            if (onBalanceChange) onBalanceChange(newWallet.balance);
          },
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "wallet_transactions",
            filter: `restaurant_id=eq.${restaurantId}`,
          },
          () => {
            // Refetch to get the latest 5 transactions
            fetchWalletData();
          },
        )
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [restaurantId]);

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleRecharge = async () => {
    const amount = parseInt(rechargeAmount);
    if (isNaN(amount) || amount < 100) {
      toast({
        title: "Invalid Amount",
        description: "Minimum recharge amount is ₹100",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsRecharging(true);
      const res = await loadRazorpay();
      if (!res) {
        toast({
          title: "Error",
          description: "Failed to load Razorpay SDK",
          variant: "destructive",
        });
        return;
      }

      // Create order
      const { data, error } = await supabase.functions.invoke(
        "create-wallet-recharge-order",
        {
          body: { restaurantId, amount },
        },
      );

      if (error || !data?.success) {
        throw new Error(
          data?.error || error?.message || "Failed to create order",
        );
      }

      const options = {
        key: data.key_id,
        amount: data.order.amount,
        currency: data.order.currency,
        name: "Swadeshi Solutions",
        description: "Wallet Recharge",
        order_id: data.order.id,
        prefill: {
          name: data.prefill.name,
          email: data.prefill.email,
          contact: data.prefill.contact,
        },
        theme: {
          color: "#eab308",
        },
        handler: async function (response: any) {
          toast({
            title: "Verifying",
            description: "Please wait while we verify your payment...",
          });
          try {
            const { data: verifyData, error: verifyError } =
              await supabase.functions.invoke("verify-wallet-recharge", {
                body: {
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                  restaurant_id: restaurantId,
                },
              });

            if (verifyError || !verifyData?.success) {
              throw new Error(
                verifyData?.error ||
                  verifyError?.message ||
                  "Verification failed",
              );
            }

            toast({
              title: "Success",
              description: "Wallet recharged successfully!",
            });
            fetchWalletData(); // Refresh UI
          } catch (err: any) {
            console.error("Payment verification error:", err);
            toast({
              title: "Payment verification failed",
              description: err.message || "Something went wrong",
              variant: "destructive",
            });
          }
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        toast({
          title: "Payment failed",
          description: response.error.description,
          variant: "destructive",
        });
      });
      rzp.open();
    } catch (error: any) {
      console.error("Recharge error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to initiate recharge",
        variant: "destructive",
      });
    } finally {
      setIsRecharging(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-white/60 dark:bg-white/[0.03] backdrop-blur-sm text-xs text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-yellow-500" />
        Loading wallet...
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-2xl border border-yellow-500/20 overflow-hidden">
      {/* ── Compact Banner ── */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-gradient-to-r from-yellow-500/8 to-amber-500/5 dark:from-yellow-500/10 dark:to-amber-500/5">
        {/* Balance */}
        <div className="flex items-center gap-2 mr-2">
          <div className="w-8 h-8 rounded-xl bg-yellow-500/15 dark:bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
            <CreditCard className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-yellow-700/70 dark:text-yellow-400/70 uppercase tracking-wider leading-none mb-0.5">
              Wallet Balance
            </p>
            <div className="flex items-baseline gap-0.5">
              <IndianRupee className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />
              <span className="text-xl font-black text-yellow-700 dark:text-yellow-300 leading-none">
                {wallet?.balance?.toFixed(2) ?? "0.00"}
              </span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px h-8 bg-yellow-500/20" />

        {/* Rate tags */}
        <div className="hidden md:flex items-center gap-2">
          <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 bg-black/[0.04] dark:bg-white/[0.06] px-2 py-1 rounded-lg">
            Marketing ₹0.93/msg
          </span>
          <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 bg-black/[0.04] dark:bg-white/[0.06] px-2 py-1 rounded-lg">
            Utility ₹0.20/msg
          </span>
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px h-8 bg-yellow-500/20" />

        {/* Total sent */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-500 dark:text-gray-400">Sent:</span>
          <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300">{totalSent}</span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* History toggle */}
        <button
          onClick={() => setShowTransactions(v => !v)}
          className="hidden lg:flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors"
        >
          <History className="w-3.5 h-3.5" />
          {transactions.length > 0 ? (
            <span>
              Last:{" "}
              <span className={`font-bold ${transactions[0].transaction_type === "deposit" ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
                {transactions[0].transaction_type === "deposit" ? "+" : "-"}₹{Math.abs(transactions[0].amount).toFixed(2)}
              </span>
              {" · "}{new Date(transactions[0].created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
            </span>
          ) : "No transactions"}
          <ChevronDown
            className={`w-3 h-3 transition-transform duration-200 ${showTransactions ? "rotate-180" : ""}`}
          />
        </button>

        {/* Divider */}
        <div className="hidden lg:block w-px h-8 bg-yellow-500/20" />

        {/* Recharge controls */}
        <div className="flex items-center gap-2">
          <select
            value={rechargeAmount}
            onChange={(e) => setRechargeAmount(e.target.value)}
            className="h-8 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 focus:outline-none focus:ring-1 focus:ring-yellow-500 cursor-pointer"
          >
            <option value="100">₹100</option>
            <option value="500">₹500</option>
            <option value="1000">₹1,000</option>
            <option value="2000">₹2,000</option>
            <option value="5000">₹5,000</option>
          </select>
          <Button
            onClick={handleRecharge}
            disabled={isRecharging}
            size="sm"
            className="h-8 text-xs bg-yellow-600 hover:bg-yellow-700 text-white px-3 rounded-lg shadow-sm shadow-yellow-500/20 gap-1.5"
          >
            {isRecharging ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <CreditCard className="w-3 h-3" />
            )}
            Add Funds
          </Button>
        </div>
      </div>

      {/* ── Collapsible Transactions Panel ── */}
      {showTransactions && (
        <div className="border-t border-yellow-500/15 bg-white/60 dark:bg-white/[0.02] px-4 py-3">
          {transactions.length === 0 ? (
            <div className="flex items-center gap-2 py-2 text-xs text-gray-400">
              <AlertCircle className="w-3.5 h-3.5 opacity-50" />
              No recent transactions
            </div>
          ) : (
            <div className="space-y-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Recent Transactions</p>
              {transactions.map((tx, i) => (
                <div
                  key={tx.id}
                  className={`flex items-center justify-between py-1.5 text-xs ${
                    i < transactions.length - 1 ? "border-b border-black/[0.04] dark:border-white/[0.04]" : ""
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      tx.transaction_type === "deposit" ? "bg-green-500" : "bg-red-400"
                    }`} />
                    <span className="text-gray-600 dark:text-gray-400 truncate max-w-[280px]">{tx.description}</span>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">
                      {new Date(tx.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <span className={`font-bold flex-shrink-0 ml-4 ${
                    tx.transaction_type === "deposit" ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"
                  }`}>
                    {tx.transaction_type === "deposit" ? "+" : "-"}₹{Math.abs(tx.amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
