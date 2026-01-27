import React, { useState, useEffect } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { Loader2, QrCode, Save, Check, AlertCircle } from "lucide-react";

const QRSettingsTab = () => {
  const { toast } = useToast();
  const { restaurantId } = useRestaurantId();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    qrOrderingEnabled: false,
    qrServiceChargePercent: 0,
  });

  // Fetch restaurant QR settings
  const { data: restaurant, isLoading } = useQuery({
    queryKey: ["restaurant-qr-settings", restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurants")
        .select(
          "qr_ordering_enabled, qr_service_charge_percent, qr_payment_required",
        )
        .eq("id", restaurantId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Check if payment is configured
  const { data: paymentSettings } = useQuery({
    queryKey: ["payment-settings", restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_settings")
        .select("upi_id, is_active")
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (restaurant) {
      setFormData({
        qrOrderingEnabled: restaurant.qr_ordering_enabled || false,
        qrServiceChargePercent: restaurant.qr_service_charge_percent || 0,
      });
    }
  }, [restaurant]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!restaurantId) throw new Error("Restaurant ID not found");

      const { error } = await supabase
        .from("restaurants")
        .update({
          qr_ordering_enabled: formData.qrOrderingEnabled,
          qr_service_charge_percent: formData.qrServiceChargePercent,
        })
        .eq("id", restaurantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-qr-settings"] });
      toast({
        title: "Success",
        description: "QR ordering settings saved successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      await saveMutation.mutateAsync();
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  const isPaymentConfigured = !!paymentSettings?.upi_id;

  return (
    <div className="space-y-6">
      {/* Payment Warning */}
      {!isPaymentConfigured && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
          <CardHeader>
            <CardTitle className="text-orange-700 dark:text-orange-400 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Payment Configuration Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-orange-600 dark:text-orange-300">
              Before enabling QR ordering, you must configure payment settings.
              Go to <strong>Settings → Payment Settings</strong> and add your
              UPI ID.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Main Settings Card */}
      <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border border-white/30 dark:border-gray-700/30 rounded-3xl shadow-2xl">
        <CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-700">
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl shadow-lg">
              <QrCode className="h-6 w-6 text-white" />
            </div>
            QR Ordering Settings
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
            Configure contactless ordering via QR codes for tables and rooms
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8 space-y-6">
          {/* Enable/Disable QR Ordering */}
          <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-2xl border border-blue-100 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <Label
                  htmlFor="qr-enabled"
                  className="text-base font-semibold text-blue-900 dark:text-blue-100"
                >
                  Enable QR Ordering
                </Label>
                <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                  Allow customers to order by scanning QR codes at tables/rooms
                </p>
              </div>
              <Switch
                id="qr-enabled"
                checked={formData.qrOrderingEnabled}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    qrOrderingEnabled: checked,
                  }))
                }
                disabled={!isPaymentConfigured}
              />
            </div>
          </div>

          {/* Service Charge */}
          <div className="space-y-3">
            <Label
              htmlFor="service-charge"
              className="text-sm font-semibold text-gray-700 dark:text-gray-300"
            >
              Service Charge (%)
            </Label>
            <Input
              id="service-charge"
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={formData.qrServiceChargePercent}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  qrServiceChargePercent: parseFloat(e.target.value) || 0,
                }))
              }
              className="max-w-xs"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Additional charge applied to all QR orders (e.g., 5% service
              charge)
            </p>
          </div>

          {/* Payment Required Notice */}
          <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-2xl border border-green-100 dark:border-green-800">
            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-green-900 dark:text-green-100">
                  Payment Required (Security Feature)
                </p>
                <p className="text-xs text-green-600 dark:text-green-300 mt-1">
                  All QR orders require payment before submission to prevent
                  fake orders. This setting cannot be disabled for security
                  reasons.
                </p>
              </div>
            </div>
          </div>

          {/* Auto-Accept Orders Info */}
          <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-2xl border border-purple-100 dark:border-purple-800">
            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-purple-600 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                  Auto-Accept Paid Orders
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-300 mt-1">
                  Orders go directly to the kitchen after payment confirmation.
                  No manual approval needed since payment validates legitimacy.
                </p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSave}
              disabled={
                loading || saveMutation.isPending || !isPaymentConfigured
              }
              className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700"
            >
              {loading || saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border border-white/30 dark:border-gray-700/30 rounded-3xl shadow-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
            How QR Ordering Works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl">
              <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold">1</span>
              </div>
              <p className="text-sm font-medium dark:text-gray-300">
                Customer scans QR code at table/room
              </p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-xl">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold">2</span>
              </div>
              <p className="text-sm font-medium dark:text-gray-300">
                Browse menu and add items to cart
              </p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/30 dark:to-red-900/30 rounded-xl">
              <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold">3</span>
              </div>
              <p className="text-sm font-medium dark:text-gray-300">
                Complete payment via UPI before ordering
              </p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-xl">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold">4</span>
              </div>
              <p className="text-sm font-medium dark:text-gray-300">
                Order sent to kitchen automatically
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QRSettingsTab;
