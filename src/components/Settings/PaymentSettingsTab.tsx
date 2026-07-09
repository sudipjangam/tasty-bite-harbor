import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import {
  Loader2,
  CreditCard,
  Smartphone,
  Save,
  Check,
  Shield,
  Zap,
  Eye,
  EyeOff,
} from "lucide-react";

const PaymentSettingsTab = () => {
  const { toast } = useToast();
  const { restaurantId } = useRestaurantId();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [showMerchantKey, setShowMerchantKey] = useState(false);
  const [showCashfreeSecret, setShowCashfreeSecret] = useState(false);
  const [formData, setFormData] = useState({
    upiId: "",
    upiName: "",
    isActive: true,
    // Paytm fields
    gatewayType: "upi" as "upi" | "paytm" | "cashfree",
    paytmMid: "",
    paytmMerchantKey: "",
    paytmWebsite: "DEFAULT",
    paytmTestMode: true,
    soundboxEnabled: false,
    voiceAnnouncementLanguage: "en" as "en" | "hi",
    voiceAnnouncementTemplate: "detailed" as "simple" | "detailed",
    // Cashfree fields
    cashfreeAppId: "",
    cashfreeSecretKey: "",
    cashfreeSubMerchantId: "",
    cashfreeTestMode: true,
    cashfreeWebhookSecret: "",
  });

  // Fetch payment settings
  const { data: paymentSettings, isLoading } = useQuery({
    queryKey: ["payment-settings", restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_settings")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  React.useEffect(() => {
    if (paymentSettings) {
      setFormData({
        upiId: paymentSettings.upi_id || "",
        upiName: paymentSettings.upi_name || "",
        isActive: paymentSettings.is_active ?? true,
        gatewayType: (paymentSettings as any).gateway_type || "upi",
        paytmMid: (paymentSettings as any).paytm_mid || "",
        paytmMerchantKey: (paymentSettings as any).paytm_merchant_key || "",
        paytmWebsite: (paymentSettings as any).paytm_website || "DEFAULT",
        paytmTestMode: (paymentSettings as any).paytm_test_mode ?? true,
        soundboxEnabled: (paymentSettings as any).soundbox_enabled ?? false,
        voiceAnnouncementLanguage:
          (paymentSettings as any).voice_announcement_language || "en",
        voiceAnnouncementTemplate:
          (paymentSettings as any).voice_announcement_template || "detailed",
        cashfreeAppId: (paymentSettings as any).cashfree_app_id || "",
        cashfreeSecretKey: (paymentSettings as any).cashfree_secret_key || "",
        cashfreeSubMerchantId: (paymentSettings as any).cashfree_sub_merchant_id || "",
        cashfreeTestMode: (paymentSettings as any).cashfree_test_mode ?? true,
        cashfreeWebhookSecret: (paymentSettings as any).cashfree_webhook_secret || "",
      });
    }
  }, [paymentSettings]);

  const handleSave = async () => {
    if (!restaurantId) {
      toast({
        title: "Error",
        description: "Restaurant ID not found",
        variant: "destructive",
      });
      return;
    }

    // Validate based on gateway type
    if (formData.gatewayType === "paytm") {
      if (!formData.paytmMid.trim() || !formData.paytmMerchantKey.trim()) {
        toast({
          title: "Error",
          description: "Paytm Merchant ID and Merchant Key are required",
          variant: "destructive",
        });
        return;
      }
    } else if (formData.gatewayType === "cashfree") {
      // If client is not using platform-wide partner onboarding, they need to supply their own keys
      if (!formData.cashfreeSubMerchantId.trim() && (!formData.cashfreeAppId.trim() || !formData.cashfreeSecretKey.trim())) {
        toast({
          title: "Error",
          description: "Either Cashfree App ID & Secret Key OR Sub-Merchant ID is required",
          variant: "destructive",
        });
        return;
      }
    } else {
      if (!formData.upiId.trim()) {
        toast({
          title: "Error",
          description: "UPI ID is required",
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);
    try {
      const upsertData: Record<string, unknown> = {
        ...(paymentSettings?.id ? { id: paymentSettings.id } : {}),
        restaurant_id: restaurantId,
        upi_id: formData.upiId.trim() || null,
        upi_name: formData.upiName.trim() || null,
        is_active: formData.isActive,
        gateway_type: formData.gatewayType,
        paytm_mid: formData.paytmMid.trim() || null,
        paytm_merchant_key: formData.paytmMerchantKey.trim() || null,
        paytm_website: formData.paytmWebsite.trim() || "DEFAULT",
        paytm_test_mode: formData.paytmTestMode,
        soundbox_enabled: formData.soundboxEnabled,
        voice_announcement_language: formData.voiceAnnouncementLanguage,
        voice_announcement_template: formData.voiceAnnouncementTemplate,
        // Cashfree fields
        cashfree_app_id: formData.cashfreeAppId.trim() || null,
        cashfree_secret_key: formData.cashfreeSecretKey.trim() || null,
        cashfree_sub_merchant_id: formData.cashfreeSubMerchantId.trim() || null,
        cashfree_test_mode: formData.cashfreeTestMode,
        cashfree_webhook_secret: formData.cashfreeWebhookSecret.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { error: upsertError } = await supabase
        .from("payment_settings")
        .upsert(upsertData as any, {
          onConflict: "restaurant_id",
          ignoreDuplicates: false,
        });

      if (upsertError) throw upsertError;

      // Also update restaurant table for backward compatibility
      const { error: restaurantError } = await supabase
        .from("restaurants")
        .update({
          upi_id: formData.upiId.trim() || null,
          payment_gateway_enabled: formData.isActive,
        })
        .eq("id", restaurantId);

      if (restaurantError) {
        console.warn("Restaurant table update failed:", restaurantError);
      }

      await queryClient.invalidateQueries({ queryKey: ["payment-settings"] });

      toast({
        title: "✅ Settings Saved",
        description: `${
          formData.gatewayType === "paytm" 
            ? "Paytm" 
            : formData.gatewayType === "cashfree" 
              ? "Cashfree" 
              : "UPI"
        } payment settings saved successfully`,
      });
    } catch (error: any) {
      console.error("Error saving payment settings:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save payment settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Gateway Type Selector */}
      <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border border-white/30 dark:border-gray-700/30 rounded-3xl shadow-2xl">
        <CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-700">
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-lg">
              <CreditCard className="h-6 w-6 text-white" />
            </div>
            Payment Gateway
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
            Choose your payment gateway and configure credentials
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8 space-y-6">
          {/* Gateway Type Toggle */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() =>
                setFormData((prev) => ({ ...prev, gatewayType: "upi" }))
              }
              className={`p-6 rounded-2xl border-2 transition-all duration-300 ${
                formData.gatewayType === "upi"
                  ? "border-green-500 bg-green-50 dark:bg-green-900/30 shadow-lg shadow-green-200/50"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
              }`}
            >
              <Smartphone
                className={`h-8 w-8 mx-auto mb-2 ${formData.gatewayType === "upi" ? "text-green-600" : "text-gray-400"}`}
              />
              <p
                className={`font-bold text-lg ${formData.gatewayType === "upi" ? "text-green-700 dark:text-green-300" : "text-gray-600 dark:text-gray-400"}`}
              >
                Static UPI
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Basic QR code with your UPI ID
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                setFormData((prev) => ({ ...prev, gatewayType: "paytm" }))
              }
              className={`p-6 rounded-2xl border-2 transition-all duration-300 ${
                formData.gatewayType === "paytm"
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-lg shadow-blue-200/50"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
              }`}
            >
              <Zap className={`h-8 w-8 mx-auto mb-2 ${formData.gatewayType === "paytm" ? "text-blue-600" : "text-gray-400"}`} />
              <p className={`font-bold text-lg ${formData.gatewayType === "paytm" ? "text-blue-700 dark:text-blue-300" : "text-gray-600 dark:text-gray-400"}`}>
                Paytm Gateway
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Dynamic Paytm QR & UPI callbacks
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                setFormData((prev) => ({ ...prev, gatewayType: "cashfree" }))
              }
              className={`p-6 rounded-2xl border-2 transition-all duration-300 ${
                formData.gatewayType === "cashfree"
                  ? "border-purple-500 bg-purple-50 dark:bg-purple-900/30 shadow-lg shadow-purple-200/50"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
              }`}
            >
              <CreditCard className={`h-8 w-8 mx-auto mb-2 ${formData.gatewayType === "cashfree" ? "text-purple-600" : "text-gray-400"}`} />
              <p className={`font-bold text-lg ${formData.gatewayType === "cashfree" ? "text-purple-700 dark:text-purple-300" : "text-gray-600 dark:text-gray-400"}`}>
                Cashfree Gateway
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Cards, Netbanking & Partner splits
              </p>
            </button>
          </div>

          <Separator />

          {/* UPI Settings */}
          {formData.gatewayType === "upi" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label
                    htmlFor="upiId"
                    className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2"
                  >
                    <Smartphone className="h-4 w-4" />
                    UPI ID *
                  </Label>
                  <Input
                    id="upiId"
                    type="text"
                    placeholder="your-business@upi"
                    value={formData.upiId}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        upiId: e.target.value,
                      }))
                    }
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    This will be used to generate QR codes for customer payments
                  </p>
                </div>

                <div>
                  <Label
                    htmlFor="upiName"
                    className="text-sm font-semibold text-gray-700 dark:text-gray-300"
                  >
                    Business Name (Optional)
                  </Label>
                  <Input
                    id="upiName"
                    type="text"
                    placeholder="Your Business Name"
                    value={formData.upiName}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        upiName: e.target.value,
                      }))
                    }
                    className="mt-2"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl border border-blue-100 dark:border-blue-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label
                        htmlFor="isActive"
                        className="text-sm font-semibold text-blue-600"
                      >
                        Enable UPI Payments
                      </Label>
                      <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
                        Allow customers to pay via UPI QR codes
                      </p>
                    </div>
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({ ...prev, isActive: checked }))
                      }
                    />
                  </div>
                </div>

                {formData.isActive && formData.upiId && (
                  <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-2xl border border-green-100 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-3">
                      <Check className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-semibold text-green-600">
                        Ready for Payments
                      </span>
                    </div>
                    <p className="text-xs text-green-500 dark:text-green-400">
                      QR codes will be generated with UPI ID:{" "}
                      <code className="bg-white dark:bg-gray-700 px-1 rounded">
                        {formData.upiId}
                      </code>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Paytm Settings */}
          {formData.gatewayType === "paytm" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label
                      htmlFor="paytmMid"
                      className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2"
                    >
                      <Shield className="h-4 w-4" />
                      Merchant ID (MID) *
                    </Label>
                    <Input
                      id="paytmMid"
                      type="text"
                      placeholder="Enter your Paytm Merchant ID"
                      value={formData.paytmMid}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          paytmMid: e.target.value,
                        }))
                      }
                      className="mt-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Found in your Paytm for Business dashboard
                    </p>
                  </div>

                  <div>
                    <Label
                      htmlFor="paytmKey"
                      className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2"
                    >
                      <Shield className="h-4 w-4" />
                      Merchant Key *
                    </Label>
                    <div className="relative mt-2">
                      <Input
                        id="paytmKey"
                        type={showMerchantKey ? "text" : "password"}
                        placeholder="Enter your Paytm Merchant Key"
                        value={formData.paytmMerchantKey}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            paytmMerchantKey: e.target.value,
                          }))
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setShowMerchantKey(!showMerchantKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showMerchantKey ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Keep this secret — used for checksum verification
                    </p>
                  </div>

                  <div>
                    <Label
                      htmlFor="paytmWebsite"
                      className="text-sm font-semibold text-gray-700 dark:text-gray-300"
                    >
                      Website Name
                    </Label>
                    <Input
                      id="paytmWebsite"
                      type="text"
                      placeholder="DEFAULT"
                      value={formData.paytmWebsite}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          paytmWebsite: e.target.value,
                        }))
                      }
                      className="mt-2"
                    />
                  </div>

                  {/* UPI ID for fallback */}
                  <div>
                    <Label
                      htmlFor="upiIdFallback"
                      className="text-sm font-semibold text-gray-700 dark:text-gray-300"
                    >
                      UPI ID (Fallback)
                    </Label>
                    <Input
                      id="upiIdFallback"
                      type="text"
                      placeholder="your-business@upi (optional)"
                      value={formData.upiId}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          upiId: e.target.value,
                        }))
                      }
                      className="mt-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Used as fallback if Paytm API is unavailable
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Test Mode Toggle */}
                  <div className="p-6 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/30 rounded-2xl border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label
                          htmlFor="testMode"
                          className="text-sm font-semibold text-amber-700 dark:text-amber-300"
                        >
                          🧪 Test Mode
                        </Label>
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                          Uses Paytm staging environment — no real transactions
                        </p>
                      </div>
                      <Switch
                        id="testMode"
                        checked={formData.paytmTestMode}
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({
                            ...prev,
                            paytmTestMode: checked,
                          }))
                        }
                      />
                    </div>
                    {!formData.paytmTestMode && (
                      <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-700">
                        <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                          ⚠️ Production mode — real money will be charged
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Soundbox Toggle */}
                  <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-2xl border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label
                          htmlFor="soundbox"
                          className="text-sm font-semibold text-purple-700 dark:text-purple-300"
                        >
                          🔊 POS Voice Announcement
                        </Label>
                        <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                          Speak payment amount aloud when payment is detected
                        </p>
                      </div>
                      <Switch
                        id="soundbox"
                        checked={formData.soundboxEnabled}
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({
                            ...prev,
                            soundboxEnabled: checked,
                          }))
                        }
                      />
                    </div>

                    {formData.soundboxEnabled && (
                      <div className="mt-4 space-y-3">
                        <div>
                          <Label className="text-xs text-purple-600">
                            Language
                          </Label>
                          <div className="flex gap-2 mt-1">
                            <button
                              type="button"
                              onClick={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  voiceAnnouncementLanguage: "en",
                                }))
                              }
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                formData.voiceAnnouncementLanguage === "en"
                                  ? "bg-purple-500 text-white"
                                  : "bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600"
                              }`}
                            >
                              English
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  voiceAnnouncementLanguage: "hi",
                                }))
                              }
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                formData.voiceAnnouncementLanguage === "hi"
                                  ? "bg-purple-500 text-white"
                                  : "bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600"
                              }`}
                            >
                              हिन्दी
                            </button>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-purple-600">
                            Template
                          </Label>
                          <div className="flex gap-2 mt-1">
                            <button
                              type="button"
                              onClick={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  voiceAnnouncementTemplate: "simple",
                                }))
                              }
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                formData.voiceAnnouncementTemplate === "simple"
                                  ? "bg-purple-500 text-white"
                                  : "bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600"
                              }`}
                            >
                              Simple
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  voiceAnnouncementTemplate: "detailed",
                                }))
                              }
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                formData.voiceAnnouncementTemplate ===
                                "detailed"
                                  ? "bg-purple-500 text-white"
                                  : "bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600"
                              }`}
                            >
                              Detailed (with table)
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Active Toggle */}
                  <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl border border-blue-100 dark:border-blue-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label
                          htmlFor="isActivePaytm"
                          className="text-sm font-semibold text-blue-600"
                        >
                          Enable Payments
                        </Label>
                        <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
                          Allow customers to pay via Paytm
                        </p>
                      </div>
                      <Switch
                        id="isActivePaytm"
                        checked={formData.isActive}
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({
                            ...prev,
                            isActive: checked,
                          }))
                        }
                      />
                    </div>
                  </div>

                  {/* Ready Badge */}
                  {formData.isActive &&
                    formData.paytmMid &&
                    formData.paytmMerchantKey && (
                      <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-2xl border border-green-100 dark:border-green-800">
                        <div className="flex items-center gap-2 mb-2">
                          <Check className="h-5 w-5 text-green-600" />
                          <span className="text-sm font-semibold text-green-600">
                            Paytm Gateway Ready
                          </span>
                        </div>
                        <p className="text-xs text-green-500 dark:text-green-400">
                          MID:{" "}
                          <code className="bg-white dark:bg-gray-700 px-1 rounded">
                            {formData.paytmMid}
                          </code>
                          {formData.paytmTestMode && (
                            <Badge
                              variant="outline"
                              className="ml-2 text-amber-600 border-amber-300 text-[10px]"
                            >
                              TEST
                            </Badge>
                          )}
                        </p>
                      </div>
                    )}
                </div>
              </div>
            </div>
          {/* Cashfree Settings */}
          {formData.gatewayType === "cashfree" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {/* Option 1: Direct Integration (Merchant Keys) */}
                  <div className="p-5 border border-dashed border-purple-200 dark:border-purple-800 rounded-2xl bg-purple-50/10 dark:bg-purple-950/10 space-y-4">
                    <h3 className="font-bold text-sm text-purple-800 dark:text-purple-400 flex items-center gap-2">
                      <Shield className="h-4 w-4" /> Option A: Direct Credentials
                    </h3>
                    <p className="text-xs text-gray-500">
                      Use this if you have your own standalone Cashfree Merchant Account.
                    </p>

                    <div>
                      <Label htmlFor="cashfreeAppId" className="text-xs font-semibold">
                        App ID / Client ID
                      </Label>
                      <Input
                        id="cashfreeAppId"
                        type="text"
                        placeholder="Enter your Cashfree App ID"
                        value={formData.cashfreeAppId}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            cashfreeAppId: e.target.value,
                          }))
                        }
                        className="mt-1 text-xs"
                      />
                    </div>

                    <div>
                      <Label htmlFor="cashfreeSecretKey" className="text-xs font-semibold">
                        Secret Key
                      </Label>
                      <div className="relative mt-1">
                        <Input
                          id="cashfreeSecretKey"
                          type={showCashfreeSecret ? "text" : "password"}
                          placeholder="Enter your Cashfree Secret Key"
                          value={formData.cashfreeSecretKey}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              cashfreeSecretKey: e.target.value,
                            }))
                          }
                          className="text-xs pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCashfreeSecret(!showCashfreeSecret)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showCashfreeSecret ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Option 2: Platform Partner Integration (Sub-merchant ID) */}
                  <div className="p-5 border border-dashed border-indigo-200 dark:border-indigo-800 rounded-2xl bg-indigo-50/10 dark:bg-indigo-950/10 space-y-4">
                    <h3 className="font-bold text-sm text-indigo-800 dark:text-indigo-400 flex items-center gap-2">
                      <Shield className="h-4 w-4" /> Option B: Platform Sub-Merchant ID
                    </h3>
                    <p className="text-xs text-gray-500">
                      Use this if you are onboarded under the Swadeshi Solutions Partner account (no API keys required).
                    </p>

                    <div>
                      <Label htmlFor="cashfreeSubMerchantId" className="text-xs font-semibold">
                        Sub-Merchant ID
                      </Label>
                      <Input
                        id="cashfreeSubMerchantId"
                        type="text"
                        placeholder="e.g. sub_merchant_12345"
                        value={formData.cashfreeSubMerchantId}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            cashfreeSubMerchantId: e.target.value,
                          }))
                        }
                        className="mt-1 text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Test Mode Toggle */}
                  <div className="p-6 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/30 rounded-2xl border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label
                          htmlFor="cashfreeTestMode"
                          className="text-sm font-semibold text-amber-700 dark:text-amber-300"
                        >
                          🧪 Sandbox / Test Mode
                        </Label>
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                          Simulate payments using test cards — no real money charged
                        </p>
                      </div>
                      <Switch
                        id="cashfreeTestMode"
                        checked={formData.cashfreeTestMode}
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({
                            ...prev,
                            cashfreeTestMode: checked,
                          }))
                        }
                      />
                    </div>
                    {!formData.cashfreeTestMode && (
                      <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-700">
                        <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                          ⚠️ Live Mode Active — real payments will be processed
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Webhook Secret Key */}
                  <div className="p-6 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-2xl border border-purple-100 dark:border-indigo-800/40">
                    <Label htmlFor="cashfreeWebhookSecret" className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                      Webhook Signature Secret (Optional)
                    </Label>
                    <Input
                      id="cashfreeWebhookSecret"
                      type="password"
                      placeholder="Enter Cashfree Webhook Signature Secret"
                      value={formData.cashfreeWebhookSecret}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          cashfreeWebhookSecret: e.target.value,
                        }))
                      }
                      className="mt-2 text-xs"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Configure your Cashfree Webhook callback endpoint to:
                      <code className="block bg-white dark:bg-gray-700 p-1.5 rounded mt-1 font-mono text-[10px] select-all">
                        https://clmsoetktmvhazctlans.supabase.co/functions/v1/cashfree-webhook
                      </code>
                    </p>
                  </div>

                  {/* Active Toggle */}
                  <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl border border-blue-100 dark:border-blue-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label
                          htmlFor="isActiveCF"
                          className="text-sm font-semibold text-blue-600"
                        >
                          Enable Cashfree Gateway
                        </Label>
                        <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
                          Enable Cashfree checkout on storefront/POS
                        </p>
                      </div>
                      <Switch
                        id="isActiveCF"
                        checked={formData.isActive}
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({
                            ...prev,
                            isActive: checked,
                          }))
                        }
                      />
                    </div>
                  </div>

                  {/* Ready Badge */}
                  {formData.isActive &&
                    (formData.cashfreeSubMerchantId || (formData.cashfreeAppId && formData.cashfreeSecretKey)) && (
                      <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-2xl border border-green-100 dark:border-green-800">
                        <div className="flex items-center gap-2 mb-2">
                          <Check className="h-5 w-5 text-green-600" />
                          <span className="text-sm font-semibold text-green-600">
                            Cashfree Gateway Ready
                          </span>
                        </div>
                        <p className="text-xs text-green-500 dark:text-green-400">
                          {formData.cashfreeSubMerchantId ? (
                            <>Sub-Merchant ID: <code className="bg-white dark:bg-gray-700 px-1 rounded">{formData.cashfreeSubMerchantId}</code></>
                          ) : (
                            <>App ID: <code className="bg-white dark:bg-gray-700 px-1 rounded">{formData.cashfreeAppId}</code></>
                          )}
                          {formData.cashfreeTestMode && (
                            <Badge
                              variant="outline"
                              className="ml-2 text-amber-600 border-amber-300 text-[10px]"
                            >
                              SANDBOX
                            </Badge>
                          )}
                        </p>
                      </div>
                    )}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSave}
              disabled={
                loading ||
                (formData.gatewayType === "upi"
                  ? !formData.upiId
                  : formData.gatewayType === "cashfree"
                    ? !formData.cashfreeSubMerchantId && (!formData.cashfreeAppId || !formData.cashfreeSecretKey)
                    : !formData.paytmMid || !formData.paytmMerchantKey)
              }
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* How It Works Section */}
      <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border border-white/30 dark:border-gray-700/30 rounded-3xl shadow-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
            {formData.gatewayType === "paytm"
              ? "How Paytm Integration Works"
              : formData.gatewayType === "cashfree"
                ? "How Cashfree Gateway Works"
                : "How UPI QR Payments Work"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.gatewayType === "paytm" ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl">
                <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white font-bold">1</span>
                </div>
                <p className="text-sm font-medium dark:text-gray-300">
                  Dynamic QR generated per order
                </p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-xl">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white font-bold">2</span>
                </div>
                <p className="text-sm font-medium dark:text-gray-300">
                  Customer scans with any UPI app
                </p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/30 rounded-xl">
                <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white font-bold">3</span>
                </div>
                <p className="text-sm font-medium dark:text-gray-300">
                  Payment auto-detected via webhook
                </p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/30 dark:to-amber-900/30 rounded-xl">
                <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white font-bold">4</span>
                </div>
                <p className="text-sm font-medium dark:text-gray-300">
                  Voice & popup notification on POS
                </p>
              </div>
            </div>
          ) : formData.gatewayType === "cashfree" ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl">
                <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white font-bold">1</span>
                </div>
                <p className="text-sm font-medium dark:text-gray-300">
                  Payment session created securely
                </p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-xl">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white font-bold">2</span>
                </div>
                <p className="text-sm font-medium dark:text-gray-300">
                  Customer pays via Card/Netbanking/UPI
                </p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/30 rounded-xl">
                <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white font-bold">3</span>
                </div>
                <p className="text-sm font-medium dark:text-gray-300">
                  Authoritative check to confirm payment
                </p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/30 dark:to-amber-900/30 rounded-xl">
                <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white font-bold">4</span>
                </div>
                <p className="text-sm font-medium dark:text-gray-300">
                  Automatic platform split/payouts
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl">
                <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white font-bold">1</span>
                </div>
                <p className="text-sm font-medium dark:text-gray-300">
                  Customer scans QR code
                </p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-xl">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white font-bold">2</span>
                </div>
                <p className="text-sm font-medium dark:text-gray-300">
                  UPI app opens with pre-filled amount
                </p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-xl">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white font-bold">3</span>
                </div>
                <p className="text-sm font-medium dark:text-gray-300">
                  Payment completed instantly
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSettingsTab;
