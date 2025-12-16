import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { Loader2, CreditCard, Smartphone, Save, Check } from "lucide-react";

const PaymentSettingsTab = () => {
  const { toast } = useToast();
  const { restaurantId } = useRestaurantId();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    upiId: '',
    upiName: '',
    isActive: true,
  });

  // Fetch payment settings - get the latest one for this restaurant
  const { data: paymentSettings, isLoading } = useQuery({
    queryKey: ['payment-settings', restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_settings')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  React.useEffect(() => {
    if (paymentSettings) {
      setFormData({
        upiId: paymentSettings.upi_id || '',
        upiName: paymentSettings.upi_name || '',
        isActive: paymentSettings.is_active ?? true,
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
    
    if (!formData.upiId.trim()) {
      toast({
        title: "Error",
        description: "UPI ID is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (paymentSettings?.id) {
        // Update existing settings for this restaurant
        const { error: updateError } = await supabase
          .from('payment_settings')
          .update({
            upi_id: formData.upiId.trim(),
            upi_name: formData.upiName.trim() || null,
            is_active: formData.isActive,
            updated_at: new Date().toISOString(),
          })
          .eq('id', paymentSettings.id)
          .eq('restaurant_id', restaurantId);

        if (updateError) throw updateError;
      } else {
        // Insert a new settings row for this restaurant
        const { error: insertError } = await supabase
          .from('payment_settings')
          .insert({
            restaurant_id: restaurantId,
            upi_id: formData.upiId.trim(),
            upi_name: formData.upiName.trim() || null,
            is_active: formData.isActive,
          });

        if (insertError) throw insertError;
      }

      // Also update restaurant table for backward compatibility
      const { error: restaurantError } = await supabase
        .from('restaurants')
        .update({
          upi_id: formData.upiId.trim(),
          payment_gateway_enabled: formData.isActive,
        })
        .eq('id', restaurantId);

      if (restaurantError) {
        console.warn('Restaurant table update failed:', restaurantError);
      }

      // Refresh data
      await queryClient.invalidateQueries({ queryKey: ['payment-settings'] });

      toast({
        title: "Success",
        description: "Payment settings saved successfully",
      });
    } catch (error: any) {
      console.error('Error saving payment settings:', error);
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
      <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border border-white/30 dark:border-gray-700/30 rounded-3xl shadow-2xl">
        <CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-700">
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-lg">
              <CreditCard className="h-6 w-6 text-white" />
            </div>
            UPI Payment Settings
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
            Configure your UPI payment details for QR code generation
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="upiId" className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  UPI ID *
                </Label>
                <Input
                  id="upiId"
                  type="text"
                  placeholder="your-business@upi"
                  value={formData.upiId}
                  onChange={(e) => setFormData(prev => ({ ...prev, upiId: e.target.value }))}
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  This will be used to generate QR codes for customer payments
                </p>
              </div>

              <div>
                <Label htmlFor="upiName" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Business Name (Optional)
                </Label>
                <Input
                  id="upiName"
                  type="text"
                  placeholder="Your Business Name"
                  value={formData.upiName}
                  onChange={(e) => setFormData(prev => ({ ...prev, upiName: e.target.value }))}
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  This will appear in the payment request
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl border border-blue-100 dark:border-blue-800">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="isActive" className="text-sm font-semibold text-blue-600">
                      Enable UPI Payments
                    </Label>
                    <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
                      Allow customers to pay via UPI QR codes
                    </p>
                  </div>
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                  />
                </div>
              </div>

              {formData.isActive && formData.upiId && (
                <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-2xl border border-green-100 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-3">
                    <Check className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-semibold text-green-600">Ready for Payments</span>
                  </div>
                  <p className="text-xs text-green-500 dark:text-green-400">
                    QR codes will be generated with UPI ID: <code className="bg-white dark:bg-gray-700 px-1 rounded">{formData.upiId}</code>
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button 
              onClick={handleSave} 
              disabled={loading || !formData.upiId}
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

      <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border border-white/30 dark:border-gray-700/30 rounded-3xl shadow-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
            How UPI QR Payments Work
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl">
              <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold">1</span>
              </div>
              <p className="text-sm font-medium dark:text-gray-300">Customer scans QR code</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-xl">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold">2</span>
              </div>
              <p className="text-sm font-medium dark:text-gray-300">UPI app opens with pre-filled amount</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-xl">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold">3</span>
              </div>
              <p className="text-sm font-medium dark:text-gray-300">Payment completed instantly</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSettingsTab;