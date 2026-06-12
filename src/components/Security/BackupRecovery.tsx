import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Database, 
  Download, 
  Upload, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Settings,
  Play,
  Loader2,
  HardDrive,
  RefreshCw,
  Calendar,
  FileArchive
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BackupRecord {
  id: string;
  name: string;
  type: 'full' | 'incremental' | 'manual' | 'partial';
  status: 'running' | 'completed' | 'failed' | 'in_progress';
  file_size: number | null;
  created_at: string;
  completed_at?: string;
  error_message?: string;
}

interface BackupSettings {
  auto_backup_enabled: boolean;
  backup_frequency: 'daily' | 'weekly' | 'monthly';
  retention_days: number;
  backup_location: 'local' | 'cloud';
}

const BACKUP_DOMAINS = [
  {
    id: 'settings',
    name: 'Settings & Configurations',
    description: 'Restaurant details, payment methods, operating hours, and QR codes',
    tables: ['restaurant_settings', 'payment_settings', 'payment_methods', 'shift_types', 'shifts', 'qr_codes']
  },
  {
    id: 'menu_recipes',
    name: 'Menu & Recipes',
    description: 'Categories, items, pricing variants, and recipe ingredients',
    tables: ['categories', 'menu_items', 'menu_item_variants', 'recipes', 'recipe_ingredients', 'batch_productions', 'homemade_production_logs', 'homemade_production_log_items']
  },
  {
    id: 'inventory',
    name: 'Inventory & Suppliers',
    description: 'Storage locations, items, transactions, alerts, and supplier purchase orders',
    tables: ['storage_locations', 'inventory_items', 'inventory_lots', 'inventory_transactions', 'inventory_alerts', 'suppliers', 'purchase_orders', 'purchase_order_items']
  },
  {
    id: 'staff',
    name: 'Staff & HR',
    description: 'Staff profiles, leaves, document references, and time clock history',
    tables: ['staff', 'staff_shifts', 'staff_shift_assignments', 'staff_time_clock', 'staff_leaves', 'staff_leave_requests', 'staff_documents', 'staff_notifications']
  },
  {
    id: 'guests_loyalty',
    name: 'Guests & Loyalty',
    description: 'Customer profiles, activities, loyalty programs, tiers, and transactions',
    tables: ['customers', 'customer_activities', 'customer_notes', 'loyalty_programs', 'loyalty_tiers', 'loyalty_enrollments', 'loyalty_transactions', 'guest_profiles', 'guest_loyalty']
  },
  {
    id: 'rooms_housekeeping',
    name: 'Rooms & Housekeeping',
    description: 'Hotel rooms, check-ins, room billing, cleaning schedules, and maintenance requests',
    tables: ['rooms', 'check_ins', 'room_billings', 'room_food_orders', 'room_cleaning_schedules', 'room_maintenance_requests', 'room_moves', 'room_waitlist', 'lost_found_items', 'room_amenities', 'room_amenity_inventory', 'guest_feedback', 'night_audit_logs', 'split_bills', 'split_bill_portions']
  },
  {
    id: 'pos_orders',
    name: 'POS & Orders',
    description: 'Dining orders, kitchen sync states, payment transactions, and bills',
    tables: ['orders', 'orders_unified', 'kitchen_orders', 'pos_transactions', 'shared_bills']
  },
  {
    id: 'reservations',
    name: 'Reservations & Tables',
    description: 'Table arrangements, reservations, and waiting lists',
    tables: ['restaurant_tables', 'reservations', 'table_reservations', 'waitlist']
  },
  {
    id: 'finance',
    name: 'Finance & Expenses',
    description: 'Operational costs, invoices, line items, and expense entries',
    tables: ['expenses', 'expense_categories', 'invoices', 'invoice_line_items', 'operational_costs']
  },
  {
    id: 'marketing',
    name: 'Marketing & Campaigns',
    description: 'WhatsApp templates, campaign details, and delivery receipts',
    tables: ['promotion_campaigns', 'sent_promotions', 'whatsapp_templates', 'whatsapp_campaign_sends']
  }
];

export const BackupRecovery = () => {
  const { user, hasPermission } = useAuth();
  const { toast } = useToast();
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [settings, setSettings] = useState<BackupSettings>({
    auto_backup_enabled: false,
    backup_frequency: 'daily',
    retention_days: 30,
    backup_location: 'cloud'
  });
  const [loading, setLoading] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [isBackupRunning, setIsBackupRunning] = useState(false);
  const [backupName, setBackupName] = useState("");
  
  // Backup configurations
  const [backupMode, setBackupMode] = useState<'full' | 'partial'>('full');
  const [selectedDomains, setSelectedDomains] = useState<string[]>(BACKUP_DOMAINS.map(d => d.id));
  const [showTablesList, setShowTablesList] = useState(false);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    backupId: string;
    backupName: string;
  }>({
    open: false,
    title: "",
    description: "",
    backupId: "",
    backupName: ""
  });

  useEffect(() => {
    if (hasPermission('backup.view')) {
      fetchBackups();
      fetchBackupSettings();
    }
  }, [user, hasPermission]);

  const fetchBackups = async () => {
    if (!user?.restaurant_id) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('backups')
        .select('*')
        .eq('restaurant_id', user.restaurant_id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setBackups(data || []);
    } catch (error) {
      console.error('Error fetching backups:', error);
      toast({
        title: "Error",
        description: "Failed to fetch backup history",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBackupSettings = async () => {
    if (!user?.restaurant_id) return;
    
    try {
      const { data, error } = await supabase
        .from('backup_settings')
        .select('*')
        .eq('restaurant_id', user.restaurant_id)
        .maybeSingle();

      if (error) {
        console.log('Backup settings not available:', error.message);
        return;
      }
      if (data) setSettings(data);
    } catch (error) {
      console.log('Backup settings feature not configured');
    }
  };

  const createBackup = async () => {
    if (!hasPermission('backup.create')) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to create backups",
        variant: "destructive"
      });
      return;
    }

    if (!user?.restaurant_id) {
      toast({
        title: "Error",
        description: "Restaurant ID not found",
        variant: "destructive"
      });
      return;
    }

    const type = backupMode;
    const finalBackupName = backupName.trim() || `${type}-backup-${new Date().toISOString().split('T')[0]}`;

    // Get specific table names to backup
    let tablesToBackup: string[] | null = null;
    if (type === 'partial') {
      const selected = BACKUP_DOMAINS.filter(d => selectedDomains.includes(d.id));
      if (selected.length === 0) {
        toast({
          title: "Validation Error",
          description: "Please select at least one category to backup",
          variant: "destructive"
        });
        return;
      }
      tablesToBackup = selected.flatMap(d => d.tables);
    }

    try {
      setIsBackupRunning(true);
      setBackupProgress(20);

      // Create backup record in 'in_progress' state
      const { data: backupRecord, error: insertError } = await supabase
        .from('backups')
        .insert({
          restaurant_id: user.restaurant_id,
          backup_type: type,
          name: finalBackupName,
          status: 'in_progress',
          created_by: user.id
        })
        .select()
        .single();

      if (insertError) throw insertError;
      
      setBackupProgress(50);

      // Trigger Edge Function to perform backup operations & storage upload
      const { data: edgeData, error: invokeError } = await supabase.functions.invoke('backup-restore', {
        body: {
          action: 'backup',
          restaurant_id: user.restaurant_id,
          backup_id: backupRecord.id,
          name: finalBackupName,
          tables: tablesToBackup
        }
      });

      if (invokeError) throw invokeError;
      if (edgeData?.error) throw new Error(edgeData.error);

      setBackupProgress(100);

      toast({
        title: "Backup Created",
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} backup completed successfully.`,
      });

      await fetchBackups();
      setBackupName('');
    } catch (error: any) {
      console.error('Error creating backup:', error);
      toast({
        variant: "destructive",
        title: "Backup Failed",
        description: error.message || "Failed to create backup. Please try again.",
      });
    } finally {
      setIsBackupRunning(false);
      setBackupProgress(0);
    }
  };

  const showRestoreConfirmation = (backupId: string, backupName: string) => {
    setConfirmDialog({
      open: true,
      title: "Restore Backup",
      description: `Are you sure you want to restore "${backupName}"? This will overwrite current data and cannot be undone. All changes made after this backup will be lost.`,
      backupId,
      backupName
    });
  };

  const restoreBackup = async () => {
    if (!hasPermission('backup.restore')) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to restore backups",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      setConfirmDialog(prev => ({ ...prev, open: false }));

      // Trigger Edge Function to download backup and perform DB restore operations
      const { data: edgeData, error: invokeError } = await supabase.functions.invoke('backup-restore', {
        body: {
          action: 'restore',
          restaurant_id: user?.restaurant_id,
          backup_id: confirmDialog.backupId
        }
      });

      if (invokeError) throw invokeError;
      if (edgeData?.error) throw new Error(edgeData.error);

      toast({
        title: "Restore Completed",
        description: "Your data has been restored successfully."
      });
      
      await fetchBackups();
    } catch (error: any) {
      console.error('Error restoring backup:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to restore backup",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadBackup = async (backupId: string, name: string) => {
    try {
      // Fetch backup record to get file_path
      const { data: backup, error: fetchError } = await supabase
        .from('backups')
        .select('file_path')
        .eq('id', backupId)
        .single();

      if (fetchError) throw fetchError;
      if (!backup || !backup.file_path) {
        throw new Error("Backup file path is empty or not found");
      }

      // Generate signed URL from storage bucket
      const { data: signedUrlData, error: signedUrlError } = await supabase
        .storage
        .from('backups')
        .createSignedUrl(backup.file_path, 60, {
          download: `${name}.json`
        });

      if (signedUrlError) throw signedUrlError;
      if (!signedUrlData?.signedUrl) {
        throw new Error("Failed to generate download URL");
      }

      // Trigger browser download via dynamic link
      const a = document.createElement('a');
      a.href = signedUrlData.signedUrl;
      a.download = `${name}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Backup downloaded successfully"
      });
    } catch (error: any) {
      console.error('Error downloading backup:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to download backup",
        variant: "destructive"
      });
    }
  };

  const updateBackupSettings = async () => {
    if (!user?.restaurant_id) return;
    
    try {
      const { error } = await supabase
        .from('backup_settings')
        .upsert({
          restaurant_id: user.restaurant_id,
          auto_backup_enabled: settings.auto_backup_enabled,
          backup_frequency: settings.backup_frequency,
          retention_days: settings.retention_days,
          backup_location: settings.backup_location,
        }, {
          onConflict: 'restaurant_id'
        });

      if (error) {
        console.log('Could not save backup settings:', error.message);
        toast({
          title: "Note",
          description: "Backup settings feature is not yet configured for your account",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Backup settings updated successfully"
      });
    } catch (error) {
      console.log('Backup settings update failed');
      toast({
        title: "Note",
        description: "Backup settings feature is not available",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-gradient-to-r from-emerald-500 to-green-500 text-white border-0">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-gradient-to-r from-red-500 to-rose-500 text-white border-0">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case 'running':
      case 'in_progress':
        return (
          <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Running
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1" />
            {status}
          </Badge>
        );
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'full':
        return (
          <Badge variant="outline" className="border-purple-300 text-purple-700 dark:border-purple-700 dark:text-purple-300">
            <HardDrive className="h-3 w-3 mr-1" />
            Full
          </Badge>
        );
      case 'partial':
        return (
          <Badge variant="outline" className="border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300">
            <FileArchive className="h-3 w-3 mr-1" />
            Partial
          </Badge>
        );
      case 'manual':
        return (
          <Badge variant="outline" className="border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300">
            <Play className="h-3 w-3 mr-1" />
            Manual
          </Badge>
        );
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  if (!hasPermission('backup.view')) {
    return (
      <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-white/20 dark:border-gray-700/50">
        <CardContent className="p-6 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center mb-4">
            <Database className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">You don't have permission to view backup management.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Restore Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-md bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-white/20 dark:border-gray-700/50">
          <DialogHeader>
            <div className="mx-auto p-3 rounded-full mb-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
            </div>
            <DialogTitle className="text-center">{confirmDialog.title}</DialogTitle>
            <DialogDescription className="text-center">
              {confirmDialog.description}
            </DialogDescription>
          </DialogHeader>
          <Alert className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 dark:text-red-200">
              This is a destructive action. Make sure you have a recent backup before proceeding.
            </AlertDescription>
          </Alert>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={restoreBackup}
              className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
            >
              <Upload className="h-4 w-4 mr-2" />
              Restore Backup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Backup Settings */}
      <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-gray-500 to-slate-600 rounded-lg shadow-lg">
              <Settings className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle>Backup Settings</CardTitle>
              <CardDescription>Configure automatic backup preferences</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between p-4 bg-white/50 dark:bg-gray-900/50 rounded-xl border border-gray-200/50 dark:border-gray-800/50">
            <div className="space-y-0.5">
              <span className="text-sm font-medium">Auto Backup Enabled</span>
              <p className="text-xs text-muted-foreground">Automatically trigger backups based on the selected frequency</p>
            </div>
            <Switch
              checked={settings.auto_backup_enabled}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, auto_backup_enabled: checked }))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Backup Frequency
              </label>
              <Select 
                value={settings.backup_frequency} 
                onValueChange={(value: 'daily' | 'weekly' | 'monthly') => 
                  setSettings(prev => ({ ...prev, backup_frequency: value }))
                }
              >
                <SelectTrigger className="bg-white/50 dark:bg-gray-900/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Retention (Days)
              </label>
              <Input
                type="number"
                value={settings.retention_days}
                onChange={(e) => setSettings(prev => ({ 
                  ...prev, 
                  retention_days: parseInt(e.target.value) || 30 
                }))}
                min="1"
                max="365"
                className="bg-white/50 dark:bg-gray-900/50"
              />
            </div>
          </div>
          <Button 
            onClick={updateBackupSettings}
            className="bg-gradient-to-r from-gray-600 to-slate-700 hover:from-gray-700 hover:to-slate-800 text-white"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
        </CardContent>
      </Card>

      {/* Create Backup */}
      <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg shadow-lg">
              <Database className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle>Create Backup</CardTitle>
              <CardDescription>Create a new backup of your restaurant data</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isBackupRunning && (
            <div className="space-y-2 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  Creating backup...
                </span>
                <span className="text-sm font-bold text-blue-600">{Math.round(backupProgress)}%</span>
              </div>
              <Progress value={backupProgress} className="h-2" />
            </div>
          )}
          
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
              <div className="flex gap-2 p-1 bg-gray-105 dark:bg-gray-900 rounded-lg w-fit border border-gray-200/50 dark:border-gray-800/50">
                <Button
                  size="sm"
                  variant={backupMode === 'full' ? 'default' : 'ghost'}
                  onClick={() => setBackupMode('full')}
                  className={backupMode === 'full' ? 'bg-emerald-600 text-white shadow hover:bg-emerald-600' : 'text-muted-foreground'}
                >
                  Full Backup
                </Button>
                <Button
                  size="sm"
                  variant={backupMode === 'partial' ? 'default' : 'ghost'}
                  onClick={() => setBackupMode('partial')}
                  className={backupMode === 'partial' ? 'bg-emerald-600 text-white shadow hover:bg-emerald-600' : 'text-muted-foreground'}
                >
                  Partial Backup
                </Button>
              </div>
              <div className="text-sm text-muted-foreground">
                {backupMode === 'full' 
                  ? 'All 61 tables will be backed up.'
                  : `${BACKUP_DOMAINS.filter(d => selectedDomains.includes(d.id)).flatMap(d => d.tables).length} tables selected for backup.`}
              </div>
            </div>

            {backupMode === 'partial' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-white/40 dark:bg-gray-900/40 rounded-xl border border-gray-200/50 dark:border-gray-800/50 animate-in fade-in slide-in-from-top-2 duration-200">
                {BACKUP_DOMAINS.map((domain) => {
                  const isChecked = selectedDomains.includes(domain.id);
                  return (
                    <div
                      key={domain.id}
                      onClick={() => {
                        setSelectedDomains(prev => 
                          isChecked 
                            ? prev.filter(id => id !== domain.id) 
                            : [...prev, domain.id]
                        );
                      }}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                        isChecked 
                          ? 'border-emerald-500/50 bg-emerald-50/10 dark:bg-emerald-950/10' 
                          : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // handled by div onClick
                        className="mt-1 accent-emerald-600 h-4 w-4 rounded"
                      />
                      <div className="space-y-0.5">
                        <span className="text-sm font-semibold flex items-center gap-2">
                          {domain.name}
                          <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 bg-gray-100 dark:bg-gray-800 text-muted-foreground">
                            {domain.tables.length} tables
                          </Badge>
                        </span>
                        <p className="text-xs text-muted-foreground leading-snug">{domain.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* List of tables overview */}
            <div className="space-y-2">
              <Button
                size="sm"
                variant="link"
                onClick={() => setShowTablesList(!showTablesList)}
                className="text-emerald-600 dark:text-emerald-400 p-0 h-auto font-medium hover:no-underline"
              >
                {showTablesList ? 'Hide schema tables list ▲' : 'Show schema tables list ▼'}
              </Button>

              {showTablesList && (
                <div className="p-4 bg-gray-50/50 dark:bg-gray-900/50 rounded-xl border border-gray-200/50 dark:border-gray-800/50 max-h-60 overflow-y-auto text-xs space-y-3 animate-in fade-in duration-200">
                  {BACKUP_DOMAINS.map(domain => {
                    const isDomainActive = backupMode === 'full' || selectedDomains.includes(domain.id);
                    return (
                      <div key={domain.id} className={isDomainActive ? 'opacity-100' : 'opacity-40'}>
                        <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
                          <span className={`h-1.5 w-1.5 rounded-full ${isDomainActive ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                          {domain.name}
                        </h4>
                        <div className="flex flex-wrap gap-1.5 pl-3">
                          {domain.tables.map(table => (
                            <span 
                              key={table} 
                              className={`px-2 py-0.5 rounded text-[11px] font-mono border ${
                                isDomainActive 
                                  ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-400' 
                                  : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-muted-foreground'
                              }`}
                            >
                              {table}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Input
                placeholder="Backup name (optional)"
                value={backupName}
                onChange={(e) => setBackupName(e.target.value)}
                disabled={isBackupRunning}
                className="flex-1 bg-white/50 dark:bg-gray-900/50"
              />
              <Button 
                onClick={createBackup}
                disabled={isBackupRunning || !hasPermission('backup.create') || (backupMode === 'partial' && selectedDomains.length === 0)}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg px-6"
              >
                {isBackupRunning ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                {backupMode === 'full' ? 'Start Full Backup' : 'Start Partial Backup'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Backup History */}
      <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
                <FileArchive className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle>Backup History</CardTitle>
                <CardDescription>View and manage your backup archives</CardDescription>
              </div>
            </div>
            <Button 
              onClick={fetchBackups} 
              variant="outline"
              disabled={loading}
              className="border-gray-200 dark:border-gray-700"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center mb-4">
                <Database className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No backups found</p>
              <p className="text-sm text-muted-foreground mt-1">Create your first backup above</p>
            </div>
          ) : (
            <div className="space-y-3">
              {backups.map((backup) => (
                <div 
                  key={backup.id} 
                  className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white/50 dark:bg-gray-900/50 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        {getStatusBadge(backup.status)}
                        {getTypeBadge(backup.type)}
                        <span className="font-medium">{backup.name}</span>
                        <span className="text-sm text-muted-foreground px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
                          {backup.file_size
                            ? `${(backup.file_size / (1024 * 1024)).toFixed(2)} MB`
                            : "0.00 MB"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Created: {new Date(backup.created_at).toLocaleString()}
                        {backup.completed_at && ` • Completed: ${new Date(backup.completed_at).toLocaleString()}`}
                      </p>
                      {backup.error_message && (
                        <p className="text-sm text-red-600 dark:text-red-400">{backup.error_message}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {backup.status === 'completed' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadBackup(backup.id, backup.name)}
                            className="border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {hasPermission('backup.restore') && (
                            <Button
                              size="sm"
                              onClick={() => showRestoreConfirmation(backup.id, backup.name)}
                              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                            >
                              <Upload className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
