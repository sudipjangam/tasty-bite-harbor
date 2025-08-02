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

  // Fetch payment settings
  const { data: paymentSettings, isLoading } = useQuery({
    queryKey: ['payment-settings', restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_settings')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });

  // Fetch restaurant info for UPI ID
  const { data: restaurant } = useQuery({
    queryKey: ['restaurant', restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('restaurants')
        .select('upi_id, payment_gateway_enabled')
        .eq('id', restaurantId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  React.useEffect(() => {
    if (paymentSettings) {
      setFormData({
        upiId: paymentSettings.upi_id || '',
        upiName: paymentSettings.upi_name || '',
        isActive: paymentSettings.is_active,
      });
    } else if (restaurant?.upi_id) {
      setFormData(prev => ({
        ...prev,
        upiId: restaurant.upi_id,
      }));
    }
  }, [paymentSettings, restaurant]);

  const handleSave = async () => {
    if (!restaurantId) return;
    
    if (!formData.upiId) {
      toast({
        title: "Error",
        description: "UPI ID is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Update payment settings table
      const { error: paymentError } = await supabase
        .from('payment_settings')
        .upsert({
          restaurant_id: restaurantId,
          upi_id: formData.upiId,
          upi_name: formData.upiName,
          is_active: formData.isActive,
        });

      if (paymentError) throw paymentError;

      // Also update restaurant table for backward compatibility
      const { error: restaurantError } = await supabase
        .from('restaurants')
        .update({
          upi_id: formData.upiId,
          payment_gateway_enabled: formData.isActive,
        })
        .eq('id', restaurantId);

      if (restaurantError) throw restaurantError;

      queryClient.invalidateQueries({ queryKey: ['payment-settings'] });
      queryClient.invalidateQueries({ queryKey: ['restaurant'] });

      toast({
        title: "Success",
        description: "Payment settings saved successfully",
      });
    } catch (error) {
      console.error('Error saving payment settings:', error);
      toast({
        title: "Error",
        description: "Failed to save payment settings",
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
      <Card className="bg-white/90 backdrop-blur-lg border border-white/30 rounded-3xl shadow-2xl">
        <CardHeader className="pb-4 border-b border-gray-100">
          <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-lg">
              <CreditCard className="h-6 w-6 text-white" />
            </div>
            UPI Payment Settings
          </CardTitle>
          <CardDescription className="text-gray-600 mt-2 text-lg">
            Configure your UPI payment details for QR code generation
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="upiId" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
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
                <p className="text-xs text-gray-500 mt-1">
                  This will be used to generate QR codes for customer payments
                </p>
              </div>

              <div>
                <Label htmlFor="upiName" className="text-sm font-semibold text-gray-700">
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
                <p className="text-xs text-gray-500 mt-1">
                  This will appear in the payment request
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="isActive" className="text-sm font-semibold text-blue-600">
                      Enable UPI Payments
                    </Label>
                    <p className="text-xs text-blue-500 mt-1">
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
                <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Check className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-semibold text-green-600">Ready for Payments</span>
                  </div>
                  <p className="text-xs text-green-500">
                    QR codes will be generated with UPI ID: <code className="bg-white px-1 rounded">{formData.upiId}</code>
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

      <Card className="bg-white/90 backdrop-blur-lg border border-white/30 rounded-3xl shadow-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-900">
            How UPI QR Payments Work
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl">
              <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold">1</span>
              </div>
              <p className="text-sm font-medium">Customer scans QR code</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold">2</span>
              </div>
              <p className="text-sm font-medium">UPI app opens with pre-filled amount</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold">3</span>
              </div>
              <p className="text-sm font-medium">Payment completed instantly</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSettingsTab;