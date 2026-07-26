import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "../../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "../../ui/card";
import {
  IndianRupee,
  CreditCard,
  History,
  Loader2,
  AlertCircle,
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
      <Card>
        <CardContent className="p-8 flex justify-center items-center">
          <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      {/* Balance Card */}
      <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg text-yellow-700 dark:text-yellow-400">
            <CreditCard className="w-5 h-5" />
            Marketing Wallet
          </CardTitle>
          <CardDescription>
            Available balance for sending WhatsApp messages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-1 mb-6">
            <IndianRupee className="w-6 h-6 text-yellow-600 dark:text-yellow-500" />
            <span className="text-4xl font-bold text-gray-900 dark:text-white">
              {wallet?.balance?.toFixed(2) || "0.00"}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">
                Quick Recharge (₹)
              </label>
              <select
                value={rechargeAmount}
                onChange={(e) => setRechargeAmount(e.target.value)}
                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="100">₹100</option>
                <option value="500">₹500</option>
                <option value="1000">₹1,000</option>
                <option value="2000">₹2,000</option>
                <option value="5000">₹5,000</option>
              </select>
            </div>
            <Button
              onClick={handleRecharge}
              disabled={isRecharging}
              className="mt-5 bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              {isRecharging ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Add Funds
            </Button>
          </div>
        </CardContent>
        <CardFooter className="pt-0 flex gap-4">
          <div className="text-xs text-gray-500 bg-white/50 dark:bg-gray-900/50 p-2 rounded w-full flex justify-between items-center">
            <span>Marketing Template: ₹0.93 / msg</span>
            <span>Utility Template: ₹0.20 / msg</span>
          </div>
        </CardFooter>
      </Card>

      {/* Stats & Ledger Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex justify-between items-center text-lg">
            <span className="flex items-center gap-2">
              <History className="w-5 h-5" /> Recent Activity
            </span>
            <span className="text-sm font-normal text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
              Total Sent: {totalSent}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-6 text-gray-500 flex flex-col items-center">
              <AlertCircle className="w-8 h-8 mb-2 opacity-20" />
              <p>No recent transactions</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex justify-between items-center text-sm border-b border-gray-100 dark:border-gray-800 pb-2 last:border-0"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {tx.description}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(tx.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div
                    className={`font-semibold ${tx.transaction_type === "deposit" ? "text-green-600" : "text-red-600"}`}
                  >
                    {tx.transaction_type === "deposit" ? "+" : "-"}₹
                    {Math.abs(tx.amount).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
