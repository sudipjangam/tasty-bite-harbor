import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurantId } from '@/hooks/useRestaurantId';
import { 
  Settings, Download, Upload, Database, Shield, 
  Loader2, Check, AlertTriangle, DollarSign, RefreshCw,
  HardDrive, FileJson, Calendar
} from 'lucide-react';
import { format } from 'date-fns';

interface Currency {
  id: string;
  name: string;
  code: string;
  symbol: string;
  commonly_used_in: string;
}

export function SystemConfigurationTab() {
  const { toast } = useToast();
  const { restaurantId } = useRestaurantId();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('');
  const [isBackupLoading, setIsBackupLoading] = useState(false);
  const [isRestoreLoading, setIsRestoreLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastBackup, setLastBackup] = useState<any>(null);

  // Load data
  useEffect(() => {
    if (restaurantId) {
      loadCurrencies();
      loadRestaurantSettings();
      loadLastBackup();
    }
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