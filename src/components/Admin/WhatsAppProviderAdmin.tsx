import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle, Shield, Loader2, Check, Eye, EyeOff, AlertTriangle } from 'lucide-react';

/**
 * Platform-wide WhatsApp Provider configuration.
 * Stores settings in a global row (restaurant_id = 'global') in restaurant_settings.
 * The unified edge function reads this when no per-restaurant override exists.
 */
export function WhatsAppProviderAdmin() {
  const { toast } = useToast();
  const GLOBAL_KEY = 'global';

  const [whatsappProvider, setWhatsappProvider] = useState<string>('msg91');
  const [metaPhoneNumberId, setMetaPhoneNumberId] = useState('');
  const [metaAccessToken, setMetaAccessToken] = useState('');
  const [metaBusinessId, setMetaBusinessId] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadGlobalSettings();
  }, []);

  const loadGlobalSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('restaurant_settings')
        .select('whatsapp_provider, whatsapp_meta_config')
        .eq('restaurant_id', GLOBAL_KEY)
        .maybeSingle();

      if (!error && data) {
        setWhatsappProvider((data as any).whatsapp_provider || 'msg91');
        const metaCfg = (data as any).whatsapp_meta_config || {};
        setMetaPhoneNumberId(metaCfg.phone_number_id || '');
        setMetaAccessToken(metaCfg.access_token || '');
        setMetaBusinessId(metaCfg.business_account_id || '');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('restaurant_settings')
        .upsert({
          restaurant_id: GLOBAL_KEY,
          whatsapp_provider: whatsappProvider,
          whatsapp_meta_config: {
            phone_number_id: metaPhoneNumberId.trim(),
            access_token: metaAccessToken.trim(),
            business_account_id: metaBusinessId.trim(),
          },
        } as any, { onConflict: 'restaurant_id' });

      if (error) throw error;
      toast({
        title: 'Saved',
        description: `Platform WhatsApp provider set to ${whatsappProvider === 'meta_cloud' ? 'Meta Cloud API (Free)' : 'MSG91'}`,
      });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to save', variant: 'destructive' });
    } finally {
      setIsSaving(false);
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">WhatsApp Provider</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Platform-wide WhatsApp API configuration — applies to all restaurants
          </p>
        </div>
      </div>

      <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border border-white/30 dark:border-gray-700/30 rounded-3xl shadow-2xl">
        <CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-700">
          <CardTitle className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-lg">
              <MessageCircle className="h-6 w-6 text-white" />
            </div>
            Active Provider
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400 mt-2">
            All restaurants use Swadeshi Solutions' WhatsApp Business profile. Switch between MSG91 (₹500/mo subscription) and Meta Cloud API (free, pay-per-message).
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
                  Meta Cloud API Credentials
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number ID</Label>
                    <Input
                      value={metaPhoneNumberId}
                      onChange={(e) => setMetaPhoneNumberId(e.target.value)}
                      placeholder="e.g. 123456789012345"
                      className="bg-white dark:bg-gray-600 rounded-xl"
                    />
                    <p className="text-xs text-gray-500">WhatsApp &gt; API Setup in Meta Developer Dashboard</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Business Account ID</Label>
                    <Input
                      value={metaBusinessId}
                      onChange={(e) => setMetaBusinessId(e.target.value)}
                      placeholder="e.g. 987654321098765"
                      className="bg-white dark:bg-gray-600 rounded-xl"
                    />
                    <p className="text-xs text-gray-500">Optional — from Business Settings</p>
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
                      className="bg-white dark:bg-gray-600 rounded-xl pr-12"
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
                  <p className="text-xs text-gray-500">Business Settings → Users → System Users → Generate Token (with whatsapp_business_messaging permission)</p>
                </div>

                {/* Info box */}
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-amber-800 dark:text-amber-200">
                      <p className="font-semibold mb-1">Before switching to Meta Cloud API:</p>
                      <ul className="space-y-1 list-disc ml-4">
                        <li>Ensure all templates are approved in Meta WhatsApp Manager</li>
                        <li>Create a System User with permanent token (never expires)</li>
                        <li>Test with a test number before going live</li>
                      </ul>
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
    </div>
  );
}

export default WhatsAppProviderAdmin;
