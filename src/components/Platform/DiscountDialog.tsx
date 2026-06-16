import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Tag, MessageSquare, Smartphone, Check, Copy } from "lucide-react";

interface DiscountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string;
  restaurantName: string;
  ownerPhone: string;
}

export function DiscountDialog({ isOpen, onClose, restaurantId, restaurantName, ownerPhone }: DiscountDialogProps) {
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [discountType, setDiscountType] = useState<"fixed_price" | "cash" | "percentage">("fixed_price");
  const [discountValue, setDiscountValue] = useState("");
  const [expiryDays, setExpiryDays] = useState("3");
  const [notes, setNotes] = useState("");
  const [discountSaved, setDiscountSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savedDiscountId, setSavedDiscountId] = useState<string | null>(null);
  
  // Calculate expiry date
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + parseInt(expiryDays));

  // The offer page URL — dynamic per discount
  const offerUrl = savedDiscountId
    ? `${window.location.origin}/offer/${savedDiscountId}`
    : `${window.location.origin}/subscription`;

  // Reset state when opened for a new restaurant
  useEffect(() => {
    if (isOpen) {
      setSelectedPlanId("");
      setDiscountType("fixed_price");
      setDiscountValue("");
      setExpiryDays("3");
      setNotes("");
      setDiscountSaved(false);
      setCopied(false);
      setSavedDiscountId(null);
    }
  }, [isOpen, restaurantId]);

  // Fetch plans
  const { data: plans = [], isLoading: isLoadingPlans } = useQuery({
    queryKey: ["subscription-plans-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("price");
      if (error) throw error;
      return data;
    },
    enabled: isOpen,
  });

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  // Live Preview Calculation
  let originalPrice = selectedPlan?.price || 0;
  let discountedPrice = originalPrice;
  let savings = 0;
  let discountPercentage = 0;

  const val = parseFloat(discountValue) || 0;
  
  if (selectedPlan) {
    if (discountType === "fixed_price") {
      discountedPrice = Math.max(0, val);
      savings = originalPrice - discountedPrice;
      discountPercentage = (savings / originalPrice) * 100;
    } else if (discountType === "cash") {
      savings = val;
      discountedPrice = Math.max(0, originalPrice - savings);
      discountPercentage = (savings / originalPrice) * 100;
    } else if (discountType === "percentage") {
      discountPercentage = val;
      savings = (originalPrice * discountPercentage) / 100;
      discountedPrice = Math.max(0, originalPrice - savings);
    }
  }

  // Save discount directly to DB — no Razorpay Payment Link needed
  const saveDiscountMutation = useMutation({
    mutationFn: async () => {
      // First, cancel any existing active discounts for this restaurant+plan
      await supabase
        .from("subscription_discounts")
        .update({ status: "cancelled" } as any)
        .eq("restaurant_id", restaurantId)
        .eq("plan_id", selectedPlanId)
        .eq("status", "active");

      // Insert new discount record
      const { data, error } = await supabase
        .from("subscription_discounts")
        .insert({
          restaurant_id: restaurantId,
          restaurant_name: restaurantName,
          plan_id: selectedPlanId,
          discount_type: discountType,
          discount_value: val,
          original_price: originalPrice,
          discounted_price: discountedPrice,
          discount_amount: savings,
          discount_percentage: discountPercentage,
          expires_at: expiresAt.toISOString(),
          notes: notes || null,
          status: "active",
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast.success("Discount applied successfully!");
      setDiscountSaved(true);
      setSavedDiscountId(data?.id || null);
    },
    onError: (error: any) => {
      toast.error(`Failed to save discount: ${error.message}`);
    }
  });

  const sendWhatsAppMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPlan) throw new Error("Plan not found");
      
      const { data, error } = await supabase.functions.invoke("send-whatsapp-unified", {
        body: {
          phoneNumber: ownerPhone,
          restaurantId,
          templateName: "subscription_special_offer",
          variables: {
            restaurant_name: restaurantName,
            plan_name: selectedPlan.name,
            original_price: originalPrice.toString(),
            discounted_price: discountedPrice.toString(),
            savings: savings.toString(),
            expiry_date: expiresAt.toLocaleDateString('en-IN'),
          },
          billUrl: savedDiscountId
        }
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => toast.success("WhatsApp message sent!"),
    onError: (error: any) => toast.error(`WhatsApp failed: ${error.message}`)
  });

  const handleShareText = async () => {
    if (!selectedPlan) return;

    const shareText = `🎉 Special Offer for ${restaurantName}!\n\n` +
      `We have a special offer on your Swadeshi Solutions subscription!\n\n` +
      `🏷️ Plan: ${selectedPlan.name}\n` +
      `❌ Original Price: ₹${originalPrice}\n` +
      `✅ Special Price: ₹${discountedPrice}\n` +
      `💰 You Save: ₹${savings}\n\n` +
      `This offer is valid until ${expiresAt.toLocaleDateString('en-IN')}.\n\n` +
      `Click below to claim your offer:\n${offerUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Special Subscription Offer',
          text: shareText,
        });
        toast.success("Shared successfully");
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error("Share failed", err);
          fallbackCopyTextToClipboard(shareText);
        }
      }
    } else {
      fallbackCopyTextToClipboard(shareText);
    }
  };

  const fallbackCopyTextToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Offer text copied to clipboard");
    }).catch(err => {
      console.error('Could not copy text: ', err);
      toast.error("Failed to copy offer text");
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(offerUrl);
    setCopied(true);
    toast.success("Subscription link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Apply Subscription Discount</DialogTitle>
          <DialogDescription>
            Apply a special discount for <strong>{restaurantName}</strong>. They will see the discounted price when they login and visit the subscription page.
          </DialogDescription>
        </DialogHeader>

        {!discountSaved ? (
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Select Subscription Plan</Label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingPlans ? "Loading plans..." : "Choose a plan"} />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} (₹{plan.price}/{plan.interval})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPlan && (
              <>
                <div className="space-y-3">
                  <Label>Discount Type</Label>
                  <RadioGroup
                    value={discountType}
                    onValueChange={(val: any) => setDiscountType(val)}
                    className="flex flex-col space-y-1"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="fixed_price" id="r1" />
                      <Label htmlFor="r1">Fixed Final Price</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="cash" id="r2" />
                      <Label htmlFor="r2">Cash Discount (₹ off)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="percentage" id="r3" />
                      <Label htmlFor="r3">Percentage Discount (% off)</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label>
                    {discountType === "fixed_price" && "Final Price (₹)"}
                    {discountType === "cash" && "Discount Amount (₹)"}
                    {discountType === "percentage" && "Discount Percentage (%)"}
                  </Label>
                  <Input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder="Enter value..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Offer Expiry</Label>
                  <Select value={expiryDays} onValueChange={setExpiryDays}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select expiry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Day</SelectItem>
                      <SelectItem value="3">3 Days</SelectItem>
                      <SelectItem value="7">7 Days</SelectItem>
                      <SelectItem value="14">14 Days</SelectItem>
                      <SelectItem value="30">30 Days</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Valid until {expiresAt.toLocaleDateString()}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Internal Notes (Optional)</Label>
                  <Textarea
                    placeholder="e.g. Approved by management for onboarding..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                {val > 0 && (
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl space-y-2 border border-slate-100 dark:border-slate-800">
                    <p className="text-sm text-slate-500">Live Preview</p>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400">Original Price:</span>
                      <span className="line-through text-slate-400">₹{originalPrice.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between items-center font-bold text-lg text-emerald-600 dark:text-emerald-400">
                      <span>Discounted Price:</span>
                      <span>₹{discountedPrice.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-emerald-600/80 dark:text-emerald-400/80">
                      <span>Total Savings:</span>
                      <span>₹{savings.toLocaleString('en-IN')} ({discountPercentage.toFixed(1)}% off)</span>
                    </div>
                  </div>
                )}
                
                <Button 
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={() => saveDiscountMutation.mutate()}
                  disabled={saveDiscountMutation.isPending || !val || discountedPrice < 0}
                >
                  {saveDiscountMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving Discount...</>
                  ) : (
                    <><Tag className="h-4 w-4 mr-2" /> Apply Discount & Share</>
                  )}
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-6 py-6 text-center">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-xl font-semibold">Discount Applied!</h3>
            <p className="text-slate-500 text-sm">
              The discount for <strong>{selectedPlan?.name}</strong> has been saved. When <strong>{restaurantName}</strong> logs in and visits the subscription page, they'll see the discounted price and can pay securely via Razorpay.
            </p>
            
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-between gap-2 break-all text-left">
              <span className="text-sm font-mono truncate text-slate-700 dark:text-slate-300">
              {offerUrl}
              </span>
              <Button size="icon" variant="ghost" onClick={handleCopyLink} className="shrink-0">
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>

            <p className="text-xs text-slate-400">
              Share this link with the restaurant owner. They'll see the discounted offer directly — no need to hunt for plans.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
              <Button 
                onClick={() => sendWhatsAppMutation.mutate()}
                disabled={sendWhatsAppMutation.isPending}
                className="bg-[#25D366] hover:bg-[#128C7E] text-white"
              >
                {sendWhatsAppMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <MessageSquare className="h-4 w-4 mr-2" />
                )}
                WhatsApp (Auto)
              </Button>
              
              <Button variant="outline" onClick={handleShareText}>
                <Smartphone className="h-4 w-4 mr-2" />
                Share Text (Free)
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
