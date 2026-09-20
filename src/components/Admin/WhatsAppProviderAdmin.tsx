import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  MessageCircle, Shield, Loader2, Check, Eye, EyeOff, 
  AlertTriangle, Building2, Phone, Edit2, X, ExternalLink, RefreshCw 
} from 'lucide-react';

interface RestaurantSender {
  id: string;
  name: string;
  whatsapp_phone_number_id: string | null;
  whatsapp_phone_number: string | null;
  whatsapp_display_name: string | null;
}

/**
 * Platform-wide WhatsApp Provider configuration + Per-Restaurant Sender Management.
 * Global config stores in `platform_config` table (key = 'whatsapp').
 * Restaurant-specific sender identities store in `public.restaurants`.
 */
export function WhatsAppProviderAdmin() {
  const { toast } = useToast();

  const [whatsappProvider, setWhatsappProvider] = useState<string>('msg91');
  const [metaPhoneNumberId, setMetaPhoneNumberId] = useState('');
  const [metaAccessToken, setMetaAccessToken] = useState('');
  const [metaBusinessId, setMetaBusinessId] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Restaurants management state
  const [restaurants, setRestaurants] = useState<RestaurantSender[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPhoneId, setEditPhoneId] = useState('');
  const [editPhoneNumber, setEditPhoneNumber] = useState('');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [isSavingRestaurant, setIsSavingRestaurant] = useState(false);
  const [isLoadingRestaurants, setIsLoadingRestaurants] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setIsLoading(true);
    await Promise.all([loadConfig(), loadRestaurants()]);
    setIsLoading(false);
  };

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_config' as any)
        .select('value')
        .eq('key', 'whatsapp')
        .maybeSingle();

      if (!error && data) {
        const val = (data as any).value || {};
        setWhatsappProvider(val.provider || 'msg91');
        const meta = val.meta_config || {};
        setMetaPhoneNumberId(meta.phone_number_id || '');
        setMetaAccessToken(meta.access_token || '');
        setMetaBusinessId(meta.business_account_id || '');
      }
    } catch (e) {
      console.error('Failed to load whatsapp platform config:', e);
    }
  };

  const loadRestaurants = async () => {
    setIsLoadingRestaurants(true);
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, whatsapp_phone_number_id, whatsapp_phone_number, whatsapp_display_name')
        .order('name');

      if (!error && data) {
        setRestaurants(data as any);
      }
    } catch (e) {
      console.error('Failed to load restaurants for WhatsApp sender config:', e);
    } finally {
      setIsLoadingRestaurants(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const configValue = {
        provider: whatsappProvider,
        meta_config: {
          phone_number_id: metaPhoneNumberId.trim(),
          access_token: metaAccessToken.trim(),
          business_account_id: metaBusinessId.trim(),
        },
      };

      const { error } = await supabase
        .from('platform_config' as any)
        .upsert(
          { key: 'whatsapp', value: configValue, updated_at: new Date().toISOString() } as any,
          { onConflict: 'key' }
        );

      if (error) throw error;
      toast({
        title: 'Saved',
        description: `WhatsApp provider set to ${whatsappProvider === 'meta_cloud' ? 'Meta Cloud API (Free)' : 'MSG91'}`,
      });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to save', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const startEditRestaurant = (r: RestaurantSender) => {
    setEditingId(r.id);
    setEditPhoneId(r.whatsapp_phone_number_id || '');
    setEditPhoneNumber(r.whatsapp_phone_number || '');
    setEditDisplayName(r.whatsapp_display_name || '');
  };

  const cancelEditRestaurant = () => {
    setEditingId(null);
    setEditPhoneId('');
    setEditPhoneNumber('');
    setEditDisplayName('');
  };

  const handleSaveRestaurantSender = async (restaurantId: string) => {
    setIsSavingRestaurant(true);
    try {
      const { error } = await supabase
        .from('restaurants')
        .update({
          whatsapp_phone_number_id: editPhoneId.trim() || null,
          whatsapp_phone_number: editPhoneNumber.trim() || null,
          whatsapp_display_name: editDisplayName.trim() || null,
        } as any)
        .eq('id', restaurantId);

      if (error) throw error;

      setRestaurants(prev =>
        prev.map(r =>
          r.id === restaurantId
            ? {
                ...r,
                whatsapp_phone_number_id: editPhoneId.trim() || null,
                whatsapp_phone_number: editPhoneNumber.trim() || null,
                whatsapp_display_name: editDisplayName.trim() || null,
              }
            : r
        )
      );

      setEditingId(null);
      toast({
        title: 'Updated ✅',
        description: editPhoneId.trim()
          ? 'Custom WhatsApp Phone Number ID assigned to restaurant.'
          : 'Restaurant reverted to platform default sender.',
      });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to update restaurant WhatsApp sender',
        variant: 'destructive',
      });
    } finally {
      setIsSavingRestaurant(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">WhatsApp Provider</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Platform-wide WhatsApp API configuration &amp; per-restaurant sender routing
          </p>
        </div>
      </div>

      {/* Primary Global Provider Card */}
      <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border border-white/30 dark:border-gray-700/30 rounded-3xl shadow-2xl">
        <CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-700">
          <CardTitle className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-lg">
              <MessageCircle className="h-6 w-6 text-white" />
            </div>
            Active Provider (Swadeshi Solutions Platform)
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400 mt-2">
            Switch between MSG91 (₹500/mo subscription) and Meta Cloud API (free, pay-per-message). All restaurants without custom numbers default to this sender.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <div className="space-y-6">
            {/* Provider Toggle */}
            <div className="flex items-center justify-between p-5 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border border-green-200 dark:border-green-800">
              <div className="space-y-1">
                <p className="font-semibold text-gray-900 dark:text-white text-lg">
                  {whatsappProvider === 'meta_cloud' ? '✅ Meta Cloud API (Free)' : '📡 MSG91 (₹500/mo)'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {whatsappProvider === 'meta_cloud'
                    ? 'Messages routed directly via Meta WhatsApp Business Platform'
                    : 'Messages routed via MSG91 third-party provider'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-500">MSG91</span>
                <Switch
                  checked={whatsappProvider === 'meta_cloud'}
                  onCheckedChange={(checked) => setWhatsappProvider(checked ? 'meta_cloud' : 'msg91')}
                />
                <span className="text-sm font-medium text-green-600">Meta</span>
              </div>
            </div>

            {/* Meta Cloud Config */}
            {whatsappProvider === 'meta_cloud' && (
              <div className="space-y-4 p-6 bg-gray-50 dark:bg-gray-700/50 rounded-2xl border border-gray-200 dark:border-gray-600">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-600" />
                  Meta Cloud API Credentials (Swadeshi Solutions WABA)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Default Phone Number ID</Label>
                    <Input
                      value={metaPhoneNumberId}
                      onChange={(e) => setMetaPhoneNumberId(e.target.value)}
                      placeholder="e.g. 123456789012345"
                      className="bg-white dark:bg-gray-600 rounded-xl font-mono"
                    />
                    <p className="text-xs text-gray-500">Swadeshi Solutions default platform sender ID</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Business Account ID (WABA ID)</Label>
                    <Input
                      value={metaBusinessId}
                      onChange={(e) => setMetaBusinessId(e.target.value)}
                      placeholder="e.g. 987654321098765"
                      className="bg-white dark:bg-gray-600 rounded-xl font-mono"
                    />
                    <p className="text-xs text-gray-500">Meta WhatsApp Business Account ID</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Permanent System User Token</Label>
                  <div className="relative">
                    <Input
                      type={showToken ? 'text' : 'password'}
                      value={metaAccessToken}
                      onChange={(e) => setMetaAccessToken(e.target.value)}
                      placeholder="System User token from Business Settings"
                      className="bg-white dark:bg-gray-600 rounded-xl pr-12 font-mono"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setShowToken(!showToken)}
                    >
                      {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">Shared across all numbers under this WABA (whatsapp_business_messaging scope)</p>
                </div>

                {/* Info box */}
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-amber-800 dark:text-amber-200">
                      <p className="font-semibold mb-1">Multi-Sender Architecture:</p>
                      <p className="text-xs">
                        All restaurant phone numbers added under this WABA share this System User Token and templates. 
                        Each restaurant only needs its own unique <strong>Phone Number ID</strong> assigned below.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 px-8 rounded-xl shadow-lg"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Save WhatsApp Settings
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Per-Restaurant Custom Sender Routing */}
      <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border border-white/30 dark:border-gray-700/30 rounded-3xl shadow-2xl">
        <CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
                Restaurant Custom Sender Routing
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400 mt-2">
                Assign specific Meta Phone Number IDs to restaurants so bills show the restaurant's business name &amp; phone number.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadRestaurants}
                disabled={isLoadingRestaurants}
                className="gap-2 rounded-xl"
              >
                <RefreshCw className={`h-4 w-4 ${isLoadingRestaurants ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <a
                href="https://business.facebook.com/wa/manage/phone-numbers/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Meta Phone Numbers Portal
              </a>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <div className="space-y-4">
            {restaurants.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">No restaurants found.</p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {restaurants.map((rest) => {
                  const isEditing = editingId === rest.id;
                  const hasCustom = !!rest.whatsapp_phone_number_id;

                  return (
                    <div key={rest.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1 min-w-[220px]">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 dark:text-white text-base">{rest.name}</span>
                          {hasCustom ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-800 text-[11px]">
                              Custom Sender
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-500 dark:text-gray-400 text-[11px]">
                              Default Swadeshi
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-3">
                          {hasCustom ? (
                            <>
                              <span>Display: <strong>{rest.whatsapp_display_name || rest.name}</strong></span>
                              <span>•</span>
                              <span>Phone: <strong>{rest.whatsapp_phone_number || '-'}</strong></span>
                              <span>•</span>
                              <span className="font-mono">ID: {rest.whatsapp_phone_number_id}</span>
                            </>
                          ) : (
                            <span>Using platform default phone number</span>
                          )}
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="flex-1 max-w-xl space-y-3 bg-gray-50 dark:bg-gray-700/40 p-4 rounded-2xl border border-gray-200 dark:border-gray-600">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div>
                              <Label className="text-[11px] text-gray-600 dark:text-gray-300">Meta Phone Number ID</Label>
                              <Input
                                value={editPhoneId}
                                onChange={(e) => setEditPhoneId(e.target.value)}
                                placeholder="1048291..."
                                className="h-9 text-xs font-mono bg-white dark:bg-gray-600 rounded-lg"
                              />
                            </div>
                            <div>
                              <Label className="text-[11px] text-gray-600 dark:text-gray-300">Phone Number</Label>
                              <Input
                                value={editPhoneNumber}
                                onChange={(e) => setEditPhoneNumber(e.target.value)}
                                placeholder="+91 98765..."
                                className="h-9 text-xs bg-white dark:bg-gray-600 rounded-lg"
                              />
                            </div>
                            <div>
                              <Label className="text-[11px] text-gray-600 dark:text-gray-300">Verified Display Name</Label>
                              <Input
                                value={editDisplayName}
                                onChange={(e) => setEditDisplayName(e.target.value)}
                                placeholder="Kiwi Cafe"
                                className="h-9 text-xs bg-white dark:bg-gray-600 rounded-lg"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={cancelEditRestaurant}
                              disabled={isSavingRestaurant}
                              className="h-8 text-xs rounded-lg"
                            >
                              <X className="h-3.5 w-3.5 mr-1" />
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleSaveRestaurantSender(rest.id)}
                              disabled={isSavingRestaurant}
                              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                            >
                              {isSavingRestaurant ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                              ) : (
                                <Check className="h-3.5 w-3.5 mr-1" />
                              )}
                              Save Sender
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEditRestaurant(rest)}
                          className="h-9 text-xs gap-1.5 rounded-xl border-gray-200 dark:border-gray-700"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          {hasCustom ? 'Edit Sender ID' : 'Assign Sender ID'}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default WhatsAppProviderAdmin;
