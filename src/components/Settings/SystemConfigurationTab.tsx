import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurantId } from '@/hooks/useRestaurantId';
import { Settings, Download, Upload, Database, Shield, Clock, Trash2, Plus, Edit } from 'lucide-react';

interface Currency {
  id: string;
  name: string;
  code: string;
  symbol: string;
  commonly_used_in: string;
}

interface ShiftType {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
}

interface PaymentMethod {
  id: string;
  name: string;
  type: string;
  processing_fee_percentage: number;
}

export function SystemConfigurationTab() {
  const { toast } = useToast();
  const { restaurantId } = useRestaurantId();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('');
  const [isBackupLoading, setIsBackupLoading] = useState(false);
  const [isRestoreLoading, setIsRestoreLoading] = useState(false);

  // Load data
  useEffect(() => {
    loadCurrencies();
    loadShiftTypes();
    loadPaymentMethods();
    loadRestaurantSettings();
  }, [restaurantId]);

  const loadCurrencies = async () => {
    const { data, error } = await supabase.from('currencies').select('*').eq('is_active', true);
    if (!error && data) setCurrencies(data);
  };

  const loadShiftTypes = async () => {
    if (!restaurantId) return;
    const { data, error } = await supabase
      .from('shift_types')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true);
    if (!error && data) setShiftTypes(data);
  };

  const loadPaymentMethods = async () => {
    if (!restaurantId) return;
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true);
    if (!error && data) setPaymentMethods(data);
  };

  const loadRestaurantSettings = async () => {
    if (!restaurantId) return;
    const { data, error } = await supabase
      .from('restaurant_settings')
      .select('currency_id')
      .eq('restaurant_id', restaurantId)
      .single();
    if (!error && data) setSelectedCurrency(data.currency_id || '');
  };

  const handleCurrencyChange = async (currencyId: string) => {
    if (!restaurantId) return;
    
    const { error } = await supabase
      .from('restaurant_settings')
      .upsert({
        restaurant_id: restaurantId,
        currency_id: currencyId
      });

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
      a.download = `restaurant-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: "Success", description: "Backup created and downloaded successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to create backup", variant: "destructive" });
    } finally {
      setIsBackupLoading(false);
    }
  };

  const handleRestore = async (file: File) => {
    setIsRestoreLoading(true);
    try {
      const backupData = JSON.parse(await file.text());
      
      const { error } = await supabase.functions.invoke('backup-restore', {
        body: { action: 'restore', restaurant_id: restaurantId, backup_data: backupData }
      });

      if (error) throw error;

      toast({ title: "Success", description: "Backup restored successfully" });
      // Reload the page to show restored data
      window.location.reload();
    } catch (error) {
      toast({ title: "Error", description: "Failed to restore backup", variant: "destructive" });
    } finally {
      setIsRestoreLoading(false);
    }
  };

  const addShiftType = async (name: string, startTime: string, endTime: string) => {
    if (!restaurantId) return;
    
    const { error } = await supabase.from('shift_types').insert({
      restaurant_id: restaurantId,
      name,
      start_time: startTime,
      end_time: endTime
    });

    if (error) {
      toast({ title: "Error", description: "Failed to add shift type", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Shift type added successfully" });
      loadShiftTypes();
    }
  };

  const addPaymentMethod = async (name: string, type: string, fee: number) => {
    if (!restaurantId) return;
    
    const { error } = await supabase.from('payment_methods').insert({
      restaurant_id: restaurantId,
      name,
      type,
      processing_fee_percentage: fee
    });

    if (error) {
      toast({ title: "Error", description: "Failed to add payment method", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Payment method added successfully" });
      loadPaymentMethods();
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="currency" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="currency">Currency</TabsTrigger>
          <TabsTrigger value="shifts">Shift Types</TabsTrigger>
          <TabsTrigger value="payments">Payment Methods</TabsTrigger>
          <TabsTrigger value="backup">Backup & Restore</TabsTrigger>
        </TabsList>

        <TabsContent value="currency">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Currency Configuration
              </CardTitle>
              <CardDescription>
                Set the default currency for your restaurant. This will be used throughout the system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="currency">Default Currency</Label>
                  <Select value={selectedCurrency} onValueChange={handleCurrencyChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((currency) => (
                        <SelectItem key={currency.id} value={currency.id}>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-lg">{currency.symbol}</span>
                            <span>{currency.name} ({currency.code})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedCurrency && (
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">Selected Currency Details</h4>
                    {currencies.find(c => c.id === selectedCurrency) && (
                      <div className="text-sm text-muted-foreground">
                        <p><strong>Symbol:</strong> {currencies.find(c => c.id === selectedCurrency)?.symbol}</p>
                        <p><strong>Code:</strong> {currencies.find(c => c.id === selectedCurrency)?.code}</p>
                        <p><strong>Used in:</strong> {currencies.find(c => c.id === selectedCurrency)?.commonly_used_in}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shifts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Shift Types
              </CardTitle>
              <CardDescription>
                Manage shift types for staff scheduling.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <ShiftTypeForm onAdd={addShiftType} />
                <div className="grid gap-2">
                  {shiftTypes.map((shift) => (
                    <div key={shift.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <span className="font-medium">{shift.name}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          {shift.start_time} - {shift.end_time}
                        </span>
                      </div>
                      <Badge variant="secondary">{shift.name}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Payment Methods
              </CardTitle>
              <CardDescription>
                Configure available payment methods and their processing fees.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <PaymentMethodForm onAdd={addPaymentMethod} />
                <div className="grid gap-2">
                  {paymentMethods.map((method) => (
                    <div key={method.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <span className="font-medium">{method.name}</span>
                        <Badge variant="outline" className="ml-2">{method.type}</Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {method.processing_fee_percentage}% fee
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Backup & Restore
              </CardTitle>
              <CardDescription>
                Create backups of your restaurant data and restore from previous backups.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <Button 
                    onClick={handleBackup} 
                    disabled={isBackupLoading}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    {isBackupLoading ? 'Creating Backup...' : 'Create Backup'}
                  </Button>
                  
                  <RestoreDialog onRestore={handleRestore} isLoading={isRestoreLoading} />
                </div>
                
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-medium text-yellow-800 mb-2">Important Notes:</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• Backups include all restaurant data (orders, staff, inventory, etc.)</li>
                    <li>• Restoring will replace all current data with backup data</li>
                    <li>• Always test restores in a safe environment first</li>
                    <li>• Keep multiple backup copies in secure locations</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ShiftTypeForm({ onAdd }: { onAdd: (name: string, start: string, end: string) => void }) {
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = () => {
    if (name && startTime && endTime) {
      onAdd(name, startTime, endTime);
      setName('');
      setStartTime('');
      setEndTime('');
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Shift Type
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Shift Type</DialogTitle>
          <DialogDescription>Create a new shift type for staff scheduling.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="shift-name">Shift Name</Label>
            <Input
              id="shift-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Morning Shift"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start-time">Start Time</Label>
              <Input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="end-time">End Time</Label>
              <Input
                id="end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>Add Shift Type</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PaymentMethodForm({ onAdd }: { onAdd: (name: string, type: string, fee: number) => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [fee, setFee] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = () => {
    if (name && type) {
      onAdd(name, type, fee);
      setName('');
      setType('');
      setFee(0);
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Payment Method
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Payment Method</DialogTitle>
          <DialogDescription>Configure a new payment method for your restaurant.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="payment-name">Method Name</Label>
            <Input
              id="payment-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Credit Card"
            />
          </div>
          <div>
            <Label htmlFor="payment-type">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="digital">Digital Wallet</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="processing-fee">Processing Fee (%)</Label>
            <Input
              id="processing-fee"
              type="number"
              min="0"
              step="0.1"
              value={fee}
              onChange={(e) => setFee(parseFloat(e.target.value) || 0)}
              placeholder="0.0"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>Add Payment Method</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RestoreDialog({ onRestore, isLoading }: { onRestore: (file: File) => void; isLoading: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/json') {
      setSelectedFile(file);
    }
  };

  const handleRestore = () => {
    if (selectedFile) {
      onRestore(selectedFile);
      setIsOpen(false);
      setSelectedFile(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Restore Backup
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Restore from Backup</DialogTitle>
          <DialogDescription>
            Select a backup file to restore. This will replace all current data.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="backup-file">Backup File</Label>
            <Input
              id="backup-file"
              type="file"
              accept=".json"
              onChange={handleFileSelect}
            />
          </div>
          {selectedFile && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm"><strong>File:</strong> {selectedFile.name}</p>
              <p className="text-sm"><strong>Size:</strong> {(selectedFile.size / 1024).toFixed(2)} KB</p>
            </div>
          )}
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800 font-medium">⚠️ Warning</p>
            <p className="text-sm text-red-700">
              This action will permanently replace all current data with the backup data. 
              Make sure you have a current backup before proceeding.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleRestore} 
            disabled={!selectedFile || isLoading}
            variant="destructive"
          >
            {isLoading ? 'Restoring...' : 'Restore Data'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}