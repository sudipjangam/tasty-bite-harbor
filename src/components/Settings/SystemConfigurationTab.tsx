import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurantId } from '@/hooks/useRestaurantId';
import { useAuth } from '@/hooks/useAuth';
import { useOnlineDelivery } from '@/hooks/useOnlineDelivery';
import { 
  Settings, Download, Upload, Database, Shield, 
  Loader2, Check, AlertTriangle, DollarSign, RefreshCw,
  HardDrive, FileJson, Calendar, Star, Instagram, Save, Smartphone, Bike, MessageCircle
} from 'lucide-react';
import { format } from 'date-fns';

declare const __APP_VERSION__: string;

interface Currency {
  id: string;
  name: string;
  code: string;
  symbol: string;
  commonly_used_in: string;
}

export function SystemConfigurationTab() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { restaurantId } = useRestaurantId();
  const { 
    isOnlineDeliveryEnabled, 
    isPlanFeatureEnabled,
    toggleOnlineDelivery, 
    isToggling, 
    connectedStores 
  } = useOnlineDelivery();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('');
  const [isBackupLoading, setIsBackupLoading] = useState(false);
  const [isRestoreLoading, setIsRestoreLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastBackup, setLastBackup] = useState<any>(null);

  // Social links state
  const [googleReviewUrl, setGoogleReviewUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [isSavingSocial, setIsSavingSocial] = useState(false);

  // WhatsApp custom sender state
  const [waPhoneNumberId, setWaPhoneNumberId] = useState('');
  const [waPhoneNumber, setWaPhoneNumber] = useState('');
  const [waDisplayName, setWaDisplayName] = useState('');
  const [isSavingWaSender, setIsSavingWaSender] = useState(false);
  
  // App Release state
  const [isPublishingRelease, setIsPublishingRelease] = useState(false);
  const [appUpdateConfig, setAppUpdateConfig] = useState<{
    enabled: boolean;
    latest_version: string;
    required_version: string;
    download_url: string;
  } | null>(null);
  const [isTogglingAppUpdate, setIsTogglingAppUpdate] = useState(false);

  // Load data
  useEffect(() => {
    if (restaurantId) {
      loadCurrencies();
      loadRestaurantSettings();
      loadLastBackup();
      loadSocialLinks();
      loadWhatsAppSender();
    }
    loadAppUpdateConfig();
  }, [restaurantId]);

  const loadCurrencies = async () => {
    const { data, error } = await supabase.from('currencies').select('*').eq('is_active', true);
    if (!error && data) setCurrencies(data);
    setLoading(false);
  };

  const loadRestaurantSettings = async () => {
    if (!restaurantId) return;
    const { data, error } = await supabase
      .from('restaurant_settings')
      .select('currency_id')
      .eq('restaurant_id', restaurantId)
      .maybeSingle();
    if (!error && data) setSelectedCurrency(data.currency_id || '');
  };

  const loadSocialLinks = async () => {
    if (!restaurantId) return;
    const { data, error } = await supabase
      .from('restaurants')
      .select('social_media')
      .eq('id', restaurantId)
      .maybeSingle();
    if (!error && data?.social_media) {
      const social = data.social_media as any;
      setGoogleReviewUrl(social.google_review_url || '');
      setInstagramUrl(social.instagram_url || '');
    }
  };

  const handleSaveSocialLinks = async () => {
    if (!restaurantId) return;
    setIsSavingSocial(true);
    try {
      // Fetch existing social_media to merge (preserve other keys)
      const { data: existing } = await supabase
        .from('restaurants')
        .select('social_media')
        .eq('id', restaurantId)
        .maybeSingle();

      const currentSocial = (existing?.social_media as any) || {};

      const { error } = await supabase
        .from('restaurants')
        .update({
          social_media: {
            ...currentSocial,
            google_review_url: googleReviewUrl.trim(),
            instagram_url: instagramUrl.trim(),
          },
        })
        .eq('id', restaurantId);

      if (error) throw error;
      toast({ title: "Saved ✅", description: "Social links updated successfully." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save social links", variant: "destructive" });
    } finally {
      setIsSavingSocial(false);
    }
  };

  const loadWhatsAppSender = async () => {
    if (!restaurantId) return;
    const { data, error } = await supabase
      .from('restaurants')
      .select('whatsapp_phone_number_id, whatsapp_phone_number, whatsapp_display_name')
      .eq('id', restaurantId)
      .maybeSingle();
    if (!error && data) {
      const rest = data as any;
      setWaPhoneNumberId(rest.whatsapp_phone_number_id || '');
      setWaPhoneNumber(rest.whatsapp_phone_number || '');
      setWaDisplayName(rest.whatsapp_display_name || '');
    }
  };

  const handleSaveWhatsAppSender = async () => {
    if (!restaurantId) return;
    setIsSavingWaSender(true);
    try {
      const { error } = await supabase
        .from('restaurants')
        .update({
          whatsapp_phone_number_id: waPhoneNumberId.trim() || null,
          whatsapp_phone_number: waPhoneNumber.trim() || null,
          whatsapp_display_name: waDisplayName.trim() || null,
        } as any)
        .eq('id', restaurantId);

      if (error) throw error;
      
      if (waPhoneNumberId.trim()) {
        toast({
          title: "Custom Sender Active ✅",
          description: `WhatsApp bills are configured to send from ${waDisplayName || waPhoneNumber}.`,
        });
      } else if (waPhoneNumber.trim()) {
        toast({
          title: "Request Submitted ⏳",
          description: "Details saved! Swadeshi Solutions support will connect your number to Meta and contact you for OTP verification.",
        });
      } else {
        toast({
          title: "Saved ✅",
          description: "Reverted to Swadeshi Solutions default platform sender.",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to save WhatsApp sender settings",
        variant: "destructive"
      });
    } finally {
      setIsSavingWaSender(false);
    }
  };

  const loadLastBackup = async () => {
    if (!restaurantId) return;
    const { data, error } = await supabase
      .from('backups')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!error && data) setLastBackup(data);
  };

  const handleCurrencyChange = async (currencyId: string) => {
    if (!restaurantId) return;
    
    const { error } = await supabase
      .from('restaurant_settings')
      .upsert({
        restaurant_id: restaurantId,
        currency_id: currencyId
      }, { onConflict: 'restaurant_id' });

    if (error) {
      toast({ title: "Error", description: "Failed to update currency", variant: "destructive" });
    } else {
      setSelectedCurrency(currencyId);
      toast({ title: "Success", description: "Currency updated successfully" });
    }
  };

  const handleBackup = async () => {
    setIsBackupLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('backup-restore', {
        body: { action: 'backup', restaurant_id: restaurantId }
      });

      if (error) throw error;

      // Download the backup file
      const backupData = JSON.stringify(data.data, null, 2);
      const blob = new Blob([backupData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `restaurant-backup-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.json`;
      a.click();
      URL.revokeObjectURL(url);

      // Refresh last backup
      loadLastBackup();

      toast({ title: "Success", description: "Backup created and downloaded successfully" });
    } catch (error: any) {
      console.error('Backup error:', error);
      toast({ 
        title: "Backup Failed", 
        description: error.message || "Failed to create backup", 
        variant: "destructive" 
      });
    } finally {
      setIsBackupLoading(false);
    }
  };

  const handleRestore = async (file: File) => {
    setIsRestoreLoading(true);
    try {
      const backupData = JSON.parse(await file.text());
      
      // Validate backup data
      if (!backupData.restaurant_id || !backupData.timestamp) {
        throw new Error('Invalid backup file format');
      }

      const { error } = await supabase.functions.invoke('backup-restore', {
        body: { action: 'restore', restaurant_id: restaurantId, backup_data: backupData }
      });

      if (error) throw error;

      toast({ title: "Success", description: "Backup restored successfully. Refreshing page..." });
      // Reload the page to show restored data
      setTimeout(() => window.location.reload(), 2000);
    } catch (error: any) {
      console.error('Restore error:', error);
      toast({ 
        title: "Restore Failed", 
        description: error.message || "Failed to restore backup", 
        variant: "destructive" 
      });
    } finally {
      setIsRestoreLoading(false);
    }
  };

  const loadAppUpdateConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_config')
        .select('value')
        .eq('key', 'app_update_info')
        .maybeSingle();

      if (!error && data?.value) {
        const val = data.value as any;
        setAppUpdateConfig({
          enabled: val.enabled ?? val.is_active ?? false,
          latest_version: val.latest_version || '1.0.0',
          required_version: val.required_version || '1.0.0',
          download_url: val.download_url || "https://clmsoetktmvhazctlans.supabase.co/storage/v1/object/public/releases/swadeshisolutions.apk"
        });
      }
    } catch (err) {
      console.error('Failed to load app update config:', err);
    }
  };

  const handleToggleAppUpdate = async (checked: boolean) => {
    setIsTogglingAppUpdate(true);
    try {
      const currentVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';
      const updatedConfig = {
        enabled: checked,
        latest_version: appUpdateConfig?.latest_version || currentVersion,
        required_version: appUpdateConfig?.required_version || currentVersion,
        download_url: appUpdateConfig?.download_url || "https://clmsoetktmvhazctlans.supabase.co/storage/v1/object/public/releases/swadeshisolutions.apk"
      };

      const { error } = await supabase
        .from('platform_config')
        .update({ value: updatedConfig })
        .eq('key', 'app_update_info');

      if (error) throw error;

      setAppUpdateConfig(updatedConfig);
      toast({
        title: checked ? "OTA Updates Enabled 🟢" : "OTA Updates Paused 🔴",
        description: checked 
          ? "Mobile devices will now check and prompt for updates." 
          : "Update prompts paused. Users will not see update screens while you test or debug.",
      });
    } catch (error: any) {
      console.error('Toggle error:', error);
      toast({
        title: "Failed to change update status",
        description: error.message || "Could not update platform config",
        variant: "destructive"
      });
    } finally {
      setIsTogglingAppUpdate(false);
    }
  };

  const handlePublishRelease = async () => {
    setIsPublishingRelease(true);
    try {
      const currentVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';
      const updatedConfig = {
        enabled: true,
        latest_version: currentVersion,
        required_version: currentVersion,
        download_url: appUpdateConfig?.download_url || "https://clmsoetktmvhazctlans.supabase.co/storage/v1/object/public/releases/swadeshisolutions.apk"
      };

      const { error } = await supabase
        .from('platform_config')
        .update({
          value: updatedConfig
        })
        .eq('key', 'app_update_info');

      if (error) throw error;
      
      setAppUpdateConfig(updatedConfig);
      toast({ 
        title: "Release Published 🚀", 
        description: `Version ${currentVersion} published and enabled. Outdated devices will be prompted for update.` 
      });
    } catch (error: any) {
      console.error('Publish error:', error);
      toast({ 
        title: "Failed to publish release", 
        description: error.message || "Could not update platform config", 
        variant: "destructive" 
      });
    } finally {
      setIsPublishingRelease(false);
    }
  };

  const selectedCurrencyData = currencies.find(c => c.id === selectedCurrency);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Online Delivery (Swiggy / Zomato) Configuration */}
      <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border border-white/30 dark:border-gray-700/30 rounded-3xl shadow-2xl">
        <CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <div className="p-3 bg-gradient-to-r from-orange-500 to-rose-600 rounded-xl shadow-lg">
                <Bike className="h-6 w-6 text-white" />
              </div>
              Online Delivery (Swiggy / Zomato)
            </CardTitle>
            <div className="flex items-center gap-3">
              {!isPlanFeatureEnabled && (
                <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30 text-xs">
                  Plan Locked
                </Badge>
              )}
              <span className="text-xs font-bold text-gray-500">
                {isOnlineDeliveryEnabled ? "ENABLED" : "DISABLED"}
              </span>
              <Switch
                checked={isOnlineDeliveryEnabled}
                disabled={isToggling || (!isPlanFeatureEnabled && !isOnlineDeliveryEnabled)}
                onCheckedChange={toggleOnlineDelivery}
              />
            </div>
          </div>
          <CardDescription className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
            Control online order relay and 1-Click Quick 86 item cascade. When disabled, Quick 86 is hidden in QSR POS.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              className={`p-5 rounded-2xl border transition-all ${
                isOnlineDeliveryEnabled
                  ? "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
                  : "bg-gray-50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-700"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-gray-800 dark:text-gray-200">
                  Feature Status
                </span>
                <Badge variant={isOnlineDeliveryEnabled ? "default" : "secondary"}>
                  {isOnlineDeliveryEnabled ? "Active" : "Inactive"}
                </Badge>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isOnlineDeliveryEnabled
                  ? "Quick 86 button and delivery rider tracking are visible in QSR POS."
                  : "Quick 86 and delivery rider tracking are hidden from QSR POS."}
              </p>
            </div>
            <div className="p-5 rounded-2xl border bg-gray-50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-gray-800 dark:text-gray-200">
                  Connected Channels
                </span>
                <span className="text-xs font-mono font-bold text-gray-600 dark:text-gray-400">
                  {connectedStores.length} Connected
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Manage credentials for Swiggy, Zomato, and UrbanPiper in the Online Aggregators Hub.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Currency Configuration */}
      <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border border-white/30 dark:border-gray-700/30 rounded-3xl shadow-2xl">
        <CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-700">
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="p-3 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl shadow-lg">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            Currency Configuration
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
            Set the default currency for your restaurant. This will be used throughout the system.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <Label htmlFor="currency" className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-3">
                  <Settings className="h-4 w-4" />
                  Default Currency
                </Label>
                <Select value={selectedCurrency} onValueChange={handleCurrencyChange}>
                  <SelectTrigger className="h-12 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 rounded-xl">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.id} value={currency.id}>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-lg bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                            {currency.symbol}
                          </span>
                          <span>{currency.name} ({currency.code})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedCurrencyData && (
              <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 rounded-2xl border border-amber-100 dark:border-amber-800">
                <div className="flex items-center gap-2 mb-4">
                  <Check className="h-5 w-5 text-amber-600" />
                  <span className="text-lg font-semibold text-amber-700 dark:text-amber-300">Selected Currency</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-white/60 dark:bg-gray-800/60 rounded-xl">
                    <span className="text-gray-600 dark:text-gray-400">Symbol</span>
                    <span className="font-bold text-2xl text-gray-900 dark:text-white">{selectedCurrencyData.symbol}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/60 dark:bg-gray-800/60 rounded-xl">
                    <span className="text-gray-600 dark:text-gray-400">Code</span>
                    <Badge className="bg-amber-500 text-white">{selectedCurrencyData.code}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/60 dark:bg-gray-800/60 rounded-xl">
                    <span className="text-gray-600 dark:text-gray-400">Used in</span>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedCurrencyData.commonly_used_in}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Social Links — Google Review & Instagram */}
      <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border border-white/30 dark:border-gray-700/30 rounded-3xl shadow-2xl">
        <CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-700">
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="p-3 bg-gradient-to-r from-pink-500 to-rose-600 rounded-xl shadow-lg">
              <Star className="h-6 w-6 text-white" />
            </div>
            Social & Review Links
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
            Add your Google Review and Instagram links. These will be sent as buttons in WhatsApp invoice messages.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <div className="space-y-6">
            {/* Google Review URL */}
            <div className="space-y-2">
              <Label htmlFor="google-review-url" className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                Google Review URL
              </Label>
              <Input
                id="google-review-url"
                type="url"
                value={googleReviewUrl}
                onChange={(e) => setGoogleReviewUrl(e.target.value)}
                placeholder="https://g.page/r/YOUR_PLACE_ID/review"
                className="h-12 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 rounded-xl"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Paste your Google Business review link. Customers will see a "⭐ Google Review" button on their WhatsApp invoice.
              </p>
            </div>

            {/* Instagram URL */}
            <div className="space-y-2">
              <Label htmlFor="instagram-url" className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Instagram className="h-4 w-4 text-pink-500" />
                Instagram Profile URL
              </Label>
              <Input
                id="instagram-url"
                type="url"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="https://www.instagram.com/your_handle"
                className="h-12 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 rounded-xl"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Paste your Instagram profile link. Customers will see a "📸 Follow us on Instagram" button on their WhatsApp invoice.
              </p>
            </div>

            {/* Preview */}
            {(googleReviewUrl || instagramUrl) && (
              <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800">
                <p className="text-sm font-semibold text-green-800 dark:text-green-200 mb-2">WhatsApp Invoice Buttons Preview</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2 bg-white/60 dark:bg-gray-800/60 rounded-lg text-sm">
                    <span>📋</span> <span className="text-blue-600 font-medium">View Bill</span>
                    <span className="text-gray-400 ml-auto text-xs">always shown</span>
                  </div>
                  {googleReviewUrl && (
                    <div className="flex items-center gap-2 p-2 bg-white/60 dark:bg-gray-800/60 rounded-lg text-sm">
                      <span>⭐</span> <span className="text-blue-600 font-medium">Google Review</span>
                      <span className="text-green-500 ml-auto text-xs">✓ configured</span>
                    </div>
                  )}
                  {instagramUrl && (
                    <div className="flex items-center gap-2 p-2 bg-white/60 dark:bg-gray-800/60 rounded-lg text-sm">
                      <span>📸</span> <span className="text-blue-600 font-medium">Follow us on Instagram</span>
                      <span className="text-green-500 ml-auto text-xs">✓ configured</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <Button
              onClick={handleSaveSocialLinks}
              disabled={isSavingSocial}
              className="bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg"
            >
              {isSavingSocial ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Social Links
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp Custom Sender Identity */}
      <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border border-white/30 dark:border-gray-700/30 rounded-3xl shadow-2xl">
        <CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <div className="p-3 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl shadow-lg">
                <MessageCircle className="h-6 w-6 text-white" />
              </div>
              WhatsApp Business Identity
            </CardTitle>
            {waPhoneNumberId.trim() ? (
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300 px-3 py-1 text-xs font-semibold">
                ✓ Verified &amp; Active
              </Badge>
            ) : waPhoneNumber.trim() ? (
              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300 px-3 py-1 text-xs font-semibold">
                ⏳ Verification Pending
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 px-3 py-1 text-xs">
                Platform Default (Swadeshi Solutions)
              </Badge>
            )}
          </div>
          <CardDescription className="text-gray-600 dark:text-gray-400 mt-2 text-base">
            Send bills, receipts, and order updates from your restaurant's business name and phone number on WhatsApp.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <div className="space-y-6">
            {/* Status explanation alert */}
            {waPhoneNumberId.trim() ? (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-sm text-emerald-900 dark:text-emerald-200">
                <p className="font-semibold flex items-center gap-2">
                  <span>🎉</span> Custom sender identity is live!
                </p>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-1">
                  Customer bills are sent displaying <strong>{waDisplayName || 'Your Business'}</strong> ({waPhoneNumber || 'Connected'}).
                </p>
              </div>
            ) : waPhoneNumber.trim() ? (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-800 text-sm text-amber-900 dark:text-amber-200">
                <p className="font-semibold flex items-center gap-2">
                  <span>⏳</span> Request under review by Swadeshi Solutions team
                </p>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                  We are attaching <strong>{waPhoneNumber}</strong> with display name <strong>"{waDisplayName}"</strong> to Meta WhatsApp Business. 
                  Our team will contact you for the 6-digit OTP code to complete verification.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-2xl border border-blue-200 dark:border-blue-800 text-sm text-blue-900 dark:text-blue-200">
                <p className="font-semibold flex items-center gap-2">
                  <span>💡</span> Want your own name on customer WhatsApp bills?
                </p>
                <p className="text-xs text-blue-800 dark:text-blue-300 mt-1">
                  Enter your business phone number and name below. Swadeshi Solutions will connect it to Meta for free so customers see your brand name instead of Swadeshi Solutions.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* WhatsApp Phone Number */}
              <div className="space-y-2">
                <Label htmlFor="wa-phone-number" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Business WhatsApp Phone Number
                </Label>
                <Input
                  id="wa-phone-number"
                  value={waPhoneNumber}
                  onChange={(e) => setWaPhoneNumber(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="h-12 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 rounded-xl"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Must be a phone number not currently active on personal WhatsApp app.
                </p>
              </div>

              {/* Verified Display Name */}
              <div className="space-y-2">
                <Label htmlFor="wa-display-name" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Business Display Name
                </Label>
                <Input
                  id="wa-display-name"
                  value={waDisplayName}
                  onChange={(e) => setWaDisplayName(e.target.value)}
                  placeholder="e.g. Kiwi Cafe"
                  className="h-12 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 rounded-xl"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  The business name customers will see at the top of their WhatsApp chat.
                </p>
              </div>

              {/* Admin Override Field (only shown if platform admin or if already verified) */}
              {(user?.role_has_full_access || waPhoneNumberId) && (
                <div className="space-y-2 md:col-span-2 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="wa-phone-number-id" className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                      Meta Phone Number ID (Assigned by Swadeshi Admin)
                    </Label>
                    {!user?.role_has_full_access && (
                      <span className="text-[11px] text-emerald-600 font-mono">Managed by Platform Admin</span>
                    )}
                  </div>
                  <Input
                    id="wa-phone-number-id"
                    value={waPhoneNumberId}
                    onChange={(e) => setWaPhoneNumberId(e.target.value)}
                    disabled={!user?.role_has_full_access}
                    placeholder="Auto-filled once verified (e.g. 104829104812345)"
                    className="h-10 font-mono text-xs bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 rounded-xl"
                  />
                </div>
              )}
            </div>

            <Button
              onClick={handleSaveWhatsAppSender}
              disabled={isSavingWaSender}
              className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg"
            >
              {isSavingWaSender ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {waPhoneNumberId.trim()
                    ? "Update Business Identity"
                    : waPhoneNumber.trim()
                    ? "Update Request"
                    : "Submit WhatsApp Business Request"}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* App Release Management */}
      {user?.role_has_full_access && (
        <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border border-white/30 dark:border-gray-700/30 rounded-3xl shadow-2xl overflow-hidden">
          <CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <div className="p-3 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl shadow-lg">
                  <Smartphone className="h-6 w-6 text-white" />
                </div>
                App Release Management
              </CardTitle>
              <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-900/70 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span className={`text-xs font-bold tracking-wider uppercase ${appUpdateConfig?.enabled ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                  {appUpdateConfig?.enabled ? "BROADCAST ACTIVE" : "UPDATES PAUSED"}
                </span>
                <Switch
                  checked={appUpdateConfig?.enabled ?? false}
                  disabled={isTogglingAppUpdate || isPublishingRelease}
                  onCheckedChange={handleToggleAppUpdate}
                />
              </div>
            </div>
            <CardDescription className="text-gray-600 dark:text-gray-400 mt-2 text-base">
              Control mobile app OTA (Over The Air) update prompts. Keep paused while building/testing debug APKs so customers are not affected.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            {/* Status Alert Banner */}
            {appUpdateConfig?.enabled ? (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex items-start gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping mt-1.5 shrink-0" />
                <div>
                  <h4 className="font-bold text-emerald-900 dark:text-emerald-200 text-sm">Update Broadcast is LIVE 🟢</h4>
                  <p className="text-emerald-700 dark:text-emerald-400 text-xs mt-0.5">
                    Customer Android devices running an older version than <span className="font-mono font-bold">{appUpdateConfig?.required_version || '1.0.0'}</span> will receive update prompts upon opening the app.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-bold text-amber-900 dark:text-amber-200 text-sm">Safe Mode: Update Notifications Paused 🔴</h4>
                  <p className="text-amber-700 dark:text-amber-400 text-xs mt-0.5">
                    No customer devices will receive update prompts or forced download screens. You can safely build, install debug APKs, and test on your devices without customer disruption.
                  </p>
                </div>
              </div>
            )}

            {/* Version Comparison Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Current Web Build</span>
                <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1">
                  {typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0'}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Published Latest Version</span>
                <div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                  {appUpdateConfig?.latest_version || 'None'}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Minimum Required Version</span>
                <div className="text-xl font-black font-mono text-blue-600 dark:text-blue-400 mt-1">
                  {appUpdateConfig?.required_version || 'None'}
                </div>
              </div>
            </div>

            {/* Publish Action Area */}
            <div className="p-6 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-2xl border border-emerald-100 dark:border-emerald-800 flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-200 mb-1">
                  Ready to release new version to users?
                </h3>
                <p className="text-emerald-700 dark:text-emerald-400 text-sm max-w-lg">
                  Ensure release APK is uploaded to Supabase Storage (<span className="font-mono text-xs">releases/swadeshisolutions.apk</span>). 
                  Clicking below will publish version <span className="font-mono font-bold text-emerald-950 dark:text-white">{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0'}</span> and turn update broadcast <span className="font-bold">ON</span>.
                </p>
              </div>
              <Button
                onClick={handlePublishRelease}
                disabled={isPublishingRelease || isTogglingAppUpdate}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-6 px-8 rounded-xl shadow-lg shrink-0 text-base w-full md:w-auto"
              >
                {isPublishingRelease ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5 mr-2" />
                    Publish Update to Users
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Backup & Restore */}
      <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border border-white/30 dark:border-gray-700/30 rounded-3xl shadow-2xl">
        <CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-700">
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg">
              <HardDrive className="h-6 w-6 text-white" />
            </div>
            Backup & Restore
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
            Create backups of your restaurant data and restore from previous backups.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Backup Section */}
            <div className="space-y-6">
              <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl border border-blue-100 dark:border-blue-800">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <Download className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-300">Create Backup</h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Download a complete backup of all your restaurant data including menu, orders, inventory, and settings.
                </p>
                <Button 
                  onClick={handleBackup} 
                  disabled={isBackupLoading}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-3 rounded-xl shadow-lg"
                >
                  {isBackupLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating Backup...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Create & Download Backup
                    </>
                  )}
                </Button>
              </div>

              {lastBackup && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Last Backup</span>
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {format(new Date(lastBackup.created_at), 'PPpp')}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Size: {(lastBackup.file_size / 1024).toFixed(2)} KB
                  </p>
                </div>
              )}
            </div>

            {/* Restore Section */}
            <div className="space-y-6">
              <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-2xl border border-purple-100 dark:border-purple-800">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-500 rounded-lg">
                    <Upload className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-300">Restore Backup</h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Restore your restaurant data from a previously created backup file.
                </p>
                <RestoreDialog onRestore={handleRestore} isLoading={isRestoreLoading} />
              </div>

              {/* Warning */}
              <div className="p-4 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">Important Notes</h4>
                    <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                      <li>• Backups include all restaurant data</li>
                      <li>• Restoring will replace all current data</li>
                      <li>• Keep multiple backup copies</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RestoreDialog({ onRestore, isLoading }: { onRestore: (file: File) => void; isLoading: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileInfo, setFileInfo] = useState<any>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/json') {
      setSelectedFile(file);
      try {
        const content = await file.text();
        const data = JSON.parse(content);
        setFileInfo({
          timestamp: data.timestamp,
          tables: Object.keys(data).filter(k => !['restaurant_id', 'timestamp'].includes(k)).length
        });
      } catch {
        setFileInfo(null);
      }
    }
  };

  const handleRestore = () => {
    if (selectedFile) {
      onRestore(selectedFile);
      setIsOpen(false);
      setSelectedFile(null);
      setFileInfo(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full bg-white dark:bg-gray-700 border-purple-200 dark:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-semibold py-3 rounded-xl"
        >
          <Upload className="h-4 w-4 mr-2" />
          Select Backup File
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white dark:bg-gray-800 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-purple-600" />
            Restore from Backup
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            Select a backup file to restore. This will replace all current data.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="backup-file" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Backup File (.json)
            </Label>
            <Input
              id="backup-file"
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="mt-2"
            />
          </div>
          
          {selectedFile && fileInfo && (
            <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl border border-blue-200 dark:border-blue-700">
              <div className="flex items-center gap-2 mb-2">
                <FileJson className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-gray-900 dark:text-white">{selectedFile.name}</span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <p>Size: {(selectedFile.size / 1024).toFixed(2)} KB</p>
                {fileInfo.timestamp && (
                  <p>Created: {format(new Date(fileInfo.timestamp), 'PPpp')}</p>
                )}
                <p>Tables: {fileInfo.tables} data sets</p>
              </div>
            </div>
          )}
          
          <div className="p-4 bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-xl border border-red-200 dark:border-red-800">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800 dark:text-red-200">Warning</p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  This action will permanently replace all current data with the backup data.
                </p>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleRestore} 
            disabled={!selectedFile || isLoading}
            className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Restoring...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Restore Data
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}