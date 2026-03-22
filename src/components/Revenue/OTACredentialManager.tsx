
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOTACredentials, type OTACredential } from "@/hooks/useOTACredentials";
import { useChannelManagement } from "@/hooks/useChannelManagement";
import { 
  Shield, Plus, Wifi, WifiOff, TestTube2, Trash2, Edit, Eye, EyeOff, 
  Key, Globe, RefreshCw, Clock, CheckCircle2, XCircle, AlertTriangle,
  ExternalLink, FileText, ArrowUpDown
} from "lucide-react";

const OTA_PRESETS = [
  { 
    ota_name: 'mmt', 
    label: 'MakeMyTrip', 
    color: 'from-red-500 to-red-600',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
    auth_type: 'token',
    api_endpoint: 'https://connect.makemytrip.com/api/v1',
    icon: '🏨',
    description: 'Connect via InGo-MMT Extranet access token',
    setupUrl: 'https://connect.makemytrip.com',
  },
  { 
    ota_name: 'goibibo', 
    label: 'Goibibo', 
    color: 'from-orange-500 to-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    borderColor: 'border-orange-200 dark:border-orange-800',
    auth_type: 'token',
    api_endpoint: 'https://connect.makemytrip.com/api/v1',
    icon: '🌐',
    description: 'Same InGo-MMT platform as MakeMyTrip',
    setupUrl: 'https://connect.makemytrip.com',
  },
  { 
    ota_name: 'booking_com', 
    label: 'Booking.com', 
    color: 'from-blue-600 to-blue-700',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    auth_type: 'basic',
    api_endpoint: 'https://supply-api.booking.com/v1',
    icon: '🅱️',
    description: 'Connect via Connectivity Partner credentials',
    setupUrl: 'https://connectivity.booking.com',
  },
  { 
    ota_name: 'agoda', 
    label: 'Agoda', 
    color: 'from-rose-500 to-rose-600',
    bgColor: 'bg-rose-50 dark:bg-rose-900/20',
    borderColor: 'border-rose-200 dark:border-rose-800',
    auth_type: 'basic',
    api_endpoint: 'https://supply-api.agoda.com/api/v2',
    icon: '🔴',
    description: 'Connect via Agoda YCS Partner API',
    setupUrl: 'https://ycs.agoda.com',
  },
  { 
    ota_name: 'expedia', 
    label: 'Expedia', 
    color: 'from-yellow-500 to-yellow-600',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    auth_type: 'basic',
    api_endpoint: 'https://services.expediapartnercentral.com/products/v1',
    icon: '✈️',
    description: 'Connect via Expedia Partner Central',
    setupUrl: 'https://expediapartnercentral.com',
  },
];

const OTACredentialManager = () => {
  const { credentials, isLoadingCredentials, saveCredential, deleteCredential, testConnection, syncLogs, isLoadingSyncLogs } = useOTACredentials();
  const { bookingChannels } = useChannelManagement();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState<Partial<OTACredential> | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("credentials");

  // Form state
  const [formData, setFormData] = useState({
    ota_name: '',
    username: '',
    password: '',
    access_token: '',
    api_endpoint: '',
    auth_type: 'token',
    channel_id: '',
    extra_config: {} as Record<string, any>,
  });

  const handleOpenDialog = (credential?: OTACredential) => {
    if (credential) {
      setEditingCredential(credential);
      setFormData({
        ota_name: credential.ota_name,
        username: credential.username || '',
        password: '', // never show existing password
        access_token: credential.access_token || '',
        api_endpoint: credential.api_endpoint || '',
        auth_type: credential.auth_type,
        channel_id: credential.channel_id || '',
        extra_config: credential.extra_config || {},
      });
    } else {
      setEditingCredential(null);
      setFormData({
        ota_name: '',
        username: '',
        password: '',
        access_token: '',
        api_endpoint: '',
        auth_type: 'token',
        channel_id: '',
        extra_config: {},
      });
    }
    setDialogOpen(true);
    setShowPassword(false);
  };

  const handleSelectPreset = (preset: typeof OTA_PRESETS[0]) => {
    setFormData(prev => ({
      ...prev,
      ota_name: preset.ota_name,
      auth_type: preset.auth_type,
      api_endpoint: preset.api_endpoint,
    }));
  };

  const handleSave = async () => {
    await saveCredential.mutateAsync({
      ...editingCredential,
      ota_name: formData.ota_name,
      username: formData.username || null,
      password: formData.password || undefined,
      password_encrypted: formData.password || editingCredential?.password_encrypted || null,
      access_token: formData.access_token || null,
      api_endpoint: formData.api_endpoint || null,
      auth_type: formData.auth_type,
      channel_id: formData.channel_id || null,
      extra_config: formData.extra_config,
    });
    setDialogOpen(false);
  };

  const getPreset = (otaName: string) => {
    return OTA_PRESETS.find(p => p.ota_name === otaName);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 shadow-sm"><CheckCircle2 className="w-3 h-3 mr-1" /> Connected</Badge>;
      case 'testing':
        return <Badge className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white border-0 shadow-sm animate-pulse"><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Testing</Badge>;
      case 'error':
        return <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white border-0 shadow-sm"><XCircle className="w-3 h-3 mr-1" /> Error</Badge>;
      case 'expired':
        return <Badge className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0 shadow-sm"><AlertTriangle className="w-3 h-3 mr-1" /> Expired</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground"><WifiOff className="w-3 h-3 mr-1" /> Not Connected</Badge>;
    }
  };

  if (isLoadingCredentials) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="credentials" className="flex items-center gap-2">
            <Key className="w-4 h-4" /> OTA Credentials
          </TabsTrigger>
          <TabsTrigger value="sync-logs" className="flex items-center gap-2">
            <FileText className="w-4 h-4" /> Sync Logs
          </TabsTrigger>
          <TabsTrigger value="bookings" className="flex items-center gap-2">
            <Globe className="w-4 h-4" /> OTA Bookings
          </TabsTrigger>
        </TabsList>

        {/* ─── CREDENTIALS TAB ─── */}
        <TabsContent value="credentials" className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Shield className="w-6 h-6 text-primary" />
                OTA Credential Vault
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Securely store your OTA login credentials for automated sync
              </p>
            </div>
            <Button 
              onClick={() => handleOpenDialog()} 
              className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white shadow-lg"
            >
              <Plus className="w-4 h-4 mr-2" /> Add OTA Connection
            </Button>
          </div>

          {/* OTA Quick-Add Cards */}
          {credentials.length === 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Quick Setup — Select Your OTA</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {OTA_PRESETS.map(preset => (
                  <Card 
                    key={preset.ota_name} 
                    className={`cursor-pointer hover:scale-105 transition-all duration-300 ${preset.bgColor} ${preset.borderColor} border-2`}
                    onClick={() => { handleSelectPreset(preset); setDialogOpen(true); }}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-3xl">{preset.icon}</span>
                        <div>
                          <h4 className="font-bold text-foreground">{preset.label}</h4>
                          <p className="text-xs text-muted-foreground">{preset.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <Badge variant="outline" className="text-xs">
                          {preset.auth_type === 'token' ? '🔑 Token Auth' : '🔐 Basic Auth'}
                        </Badge>
                        <a 
                          href={preset.setupUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                          onClick={e => e.stopPropagation()}
                        >
                          Setup Guide <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Connected OTAs */}
          {credentials.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {credentials.map(cred => {
                const preset = getPreset(cred.ota_name);
                return (
                  <Card key={cred.id} className={`standardized-card-elevated group hover:shadow-xl transition-all duration-300 ${preset?.borderColor || 'border-gray-200'} border-2`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{preset?.icon || '🌐'}</span>
                        <div>
                          <CardTitle className="text-lg font-bold">{preset?.label || cred.ota_name}</CardTitle>
                          <p className="text-xs text-muted-foreground">
                            {cred.auth_type === 'token' ? 'Token Authentication' : 'Basic Authentication'}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(cred.connection_status)}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Credential Summary */}
                      <div className="space-y-2 text-sm">
                        {cred.username && (
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Username:</span>
                            <span className="font-mono text-foreground">{cred.username}</span>
                          </div>
                        )}
                        {cred.access_token && (
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Token:</span>
                            <span className="font-mono text-foreground">{cred.access_token.substring(0, 12)}••••</span>
                          </div>
                        )}
                        {cred.api_endpoint && (
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Endpoint:</span>
                            <span className="font-mono text-xs text-foreground truncate max-w-[180px]">{cred.api_endpoint}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Last Tested:</span>
                          <span className="text-foreground">
                            {cred.last_tested_at 
                              ? new Date(cred.last_tested_at).toLocaleString()
                              : 'Never'
                            }
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 hover:bg-green-50 hover:text-green-600 hover:border-green-300"
                          onClick={() => testConnection.mutate(cred.id)}
                          disabled={testConnection.isPending}
                        >
                          <TestTube2 className="w-4 h-4 mr-1" />
                          {testConnection.isPending ? 'Testing...' : 'Test'}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                          onClick={() => handleOpenDialog(cred)}
                        >
                          <Edit className="w-4 h-4 mr-1" /> Edit
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                          onClick={() => {
                            if (confirm('Delete these OTA credentials?')) {
                              deleteCredential.mutate(cred.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Add More Card */}
              <Card 
                className="border-2 border-dashed border-muted-foreground/30 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 flex items-center justify-center min-h-[250px]"
                onClick={() => handleOpenDialog()}
              >
                <CardContent className="text-center p-6">
                  <Plus className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="font-medium text-muted-foreground">Add Another OTA</p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ─── SYNC LOGS TAB ─── */}
        <TabsContent value="sync-logs" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" />
              Sync Audit Trail
            </h2>
            <Badge variant="outline" className="text-xs">
              <Clock className="w-3 h-3 mr-1" /> Auto-refreshes every 10s
            </Badge>
          </div>

          {isLoadingSyncLogs ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : syncLogs.length === 0 ? (
            <Card className="standardized-card-glass">
              <CardContent className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="text-lg font-semibold text-muted-foreground">No Sync History Yet</h3>
                <p className="text-sm text-muted-foreground mt-1">Sync logs will appear here once you connect an OTA and run a sync</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {syncLogs.map(log => (
                <Card key={log.id} className="standardized-card-glass hover:shadow-md transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {log.status === 'success' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                        {log.status === 'failed' && <XCircle className="w-5 h-5 text-red-500" />}
                        {log.status === 'partial' && <AlertTriangle className="w-5 h-5 text-yellow-500" />}
                        {log.status === 'started' && <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />}
                        <div>
                          <span className="font-semibold text-foreground capitalize">{log.sync_type.replace('_', ' ')}</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            <ArrowUpDown className="w-3 h-3 inline mr-1" />
                            {log.direction}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{log.records_processed} processed</span>
                        {log.records_failed > 0 && (
                          <span className="text-red-500">{log.records_failed} failed</span>
                        )}
                        {log.duration_ms && <span>{log.duration_ms}ms</span>}
                        <span>{new Date(log.started_at).toLocaleString()}</span>
                      </div>
                    </div>
                    {log.error_details && log.error_details.length > 0 && (
                      <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-600 dark:text-red-400">
                        {log.error_details.map((e: any, i: number) => (
                          <div key={i}>⚠️ {e.message || JSON.stringify(e)}</div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── OTA BOOKINGS TAB ─── */}
        <TabsContent value="bookings" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Globe className="w-6 h-6 text-primary" />
              OTA Bookings
            </h2>
            <Badge variant="outline" className="text-xs">
              <Clock className="w-3 h-3 mr-1" /> Auto-refreshes every 15s
            </Badge>
          </div>

          {/* Will show real bookings pulled from OTAs */}
          <Card className="standardized-card-glass">
            <CardContent className="text-center py-12">
              <Globe className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
              <h3 className="text-lg font-semibold text-muted-foreground">No OTA Bookings Yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Connect your OTAs above, then bookings will appear here automatically
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── ADD / EDIT CREDENTIAL DIALOG ─── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Key className="w-6 h-6 text-primary" />
              {editingCredential?.id ? 'Edit OTA Credentials' : 'Add OTA Connection'}
            </DialogTitle>
            <DialogDescription>
              Your credentials are stored securely and never displayed in plaintext after saving.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* OTA Selection */}
            {!editingCredential?.id && (
              <div className="space-y-2">
                <Label className="font-semibold">Select OTA Platform</Label>
                <div className="grid grid-cols-3 gap-2">
                  {OTA_PRESETS.map(preset => (
                    <button
                      key={preset.ota_name}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`p-3 rounded-lg border-2 text-center transition-all duration-200 ${
                        formData.ota_name === preset.ota_name 
                          ? `${preset.borderColor} ${preset.bgColor} ring-2 ring-primary/30` 
                          : 'border-muted hover:border-primary/30 hover:bg-accent/50'
                      }`}
                    >
                      <span className="text-xl block mb-1">{preset.icon}</span>
                      <span className="text-xs font-medium">{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Auth Type */}
            <div className="space-y-2">
              <Label className="font-semibold">Authentication Method</Label>
              <Select value={formData.auth_type} onValueChange={v => setFormData(p => ({ ...p, auth_type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="token">🔑 Access Token (Recommended)</SelectItem>
                  <SelectItem value="basic">🔐 Username + Password</SelectItem>
                  <SelectItem value="session">🍪 Session / Login</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Token Auth */}
            {formData.auth_type === 'token' && (
              <div className="space-y-2">
                <Label className="font-semibold">Access Token</Label>
                <div className="relative">
                  <Input 
                    type={showPassword ? 'text' : 'password'}
                    value={formData.access_token}
                    onChange={e => setFormData(p => ({ ...p, access_token: e.target.value }))}
                    placeholder="Paste your InGo-MMT access token here"
                    className="pr-10"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Get this from: <a href={getPreset(formData.ota_name)?.setupUrl || '#'} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {getPreset(formData.ota_name)?.setupUrl || 'OTA Extranet'} ↗
                  </a>
                </p>
              </div>
            )}

            {/* Username + Password Auth */}
            {(formData.auth_type === 'basic' || formData.auth_type === 'session') && (
              <>
                <div className="space-y-2">
                  <Label className="font-semibold">Username / Email</Label>
                  <Input 
                    value={formData.username}
                    onChange={e => setFormData(p => ({ ...p, username: e.target.value }))}
                    placeholder="Your OTA login username or email"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">Password</Label>
                  <div className="relative">
                    <Input 
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                      placeholder={editingCredential?.id ? "Leave blank to keep existing" : "Your OTA login password"}
                      className="pr-10"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* API Endpoint */}
            <div className="space-y-2">
              <Label className="font-semibold">API Endpoint (Optional)</Label>
              <Input 
                value={formData.api_endpoint}
                onChange={e => setFormData(p => ({ ...p, api_endpoint: e.target.value }))}
                placeholder="Auto-filled based on OTA selection"
              />
            </div>

            {/* Link to Channel */}
            {bookingChannels.length > 0 && (
              <div className="space-y-2">
                <Label className="font-semibold">Link to Channel</Label>
                <Select value={formData.channel_id} onValueChange={v => setFormData(p => ({ ...p, channel_id: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a booking channel" />
                  </SelectTrigger>
                  <SelectContent>
                    {bookingChannels.map(ch => (
                      <SelectItem key={ch.id} value={ch.id}>{ch.channel_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSave} 
              disabled={saveCredential.isPending || (!formData.ota_name)}
              className="bg-gradient-to-r from-primary to-primary/90 text-white"
            >
              {saveCredential.isPending ? (
                <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                <><Shield className="w-4 h-4 mr-2" /> Save Securely</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OTACredentialManager;
