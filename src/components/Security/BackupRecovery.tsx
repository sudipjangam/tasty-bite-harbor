
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
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
  type: 'full' | 'incremental' | 'manual';
  status: 'running' | 'completed' | 'failed';
  size_mb: number;
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

export const BackupRecovery = () => {
  const { user, hasPermission } = useAuth();
  const { toast } = useToast();
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [settings, setSettings] = useState<BackupSettings>({
    auto_backup_enabled: true,
    backup_frequency: 'daily',
    retention_days: 30,
    backup_location: 'cloud'
  });
  const [loading, setLoading] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [isBackupRunning, setIsBackupRunning] = useState(false);
  const [backupName, setBackupName] = useState("");
  
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
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) setSettings(data);
    } catch (error) {
      console.error('Error fetching backup settings:', error);
    }
  };

  const createBackup = async (type: 'full' | 'incremental' = 'full') => {
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

    const finalBackupName = backupName.trim() || `${type}-backup-${new Date().toISOString().split('T')[0]}`;

    try {
      setIsBackupRunning(true);
      setBackupProgress(0);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setBackupProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const { data, error } = await supabase.functions.invoke('backup-restore', {
        body: { 
          action: 'backup',
          restaurant_id: user.restaurant_id,
          backup_type: type,
          backup_name: finalBackupName
        }
      });

      clearInterval(progressInterval);
      setBackupProgress(100);

      if (error) throw error;

      toast({
        title: "Backup Created",
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} backup completed successfully.`,
      });

      await fetchBackups();
      setBackupName('');
    } catch (error) {
      console.error('Error creating backup:', error);
      toast({
        variant: "destructive",
        title: "Backup Failed",
        description: "Failed to create backup. Please try again.",
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
      
      const { error } = await supabase.functions.invoke('restore-backup', {
        body: { backup_id: confirmDialog.backupId }
      });

      if (error) throw error;

      toast({
        title: "Restore Started",
        description: "Backup restoration has begun. This may take a few minutes."
      });
    } catch (error) {
      console.error('Error restoring backup:', error);
      toast({
        title: "Error",
        description: "Failed to restore backup",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadBackup = async (backupId: string, name: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('download-backup', {
        body: { backup_id: backupId }
      });

      if (error) throw error;

      // Create download link
      const blob = new Blob([data], { type: 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}.backup`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Backup downloaded successfully"
      });
    } catch (error) {
      console.error('Error downloading backup:', error);
      toast({
        title: "Error",
        description: "Failed to download backup",
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

      if (error) throw error;

      toast({
        title: "Success",
        description: "Backup settings updated successfully"
      });
    } catch (error) {
      console.error('Error updating backup settings:', error);
      toast({
        title: "Error",
        description: "Failed to update backup settings",
        variant: "destructive"
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
      case 'incremental':
        return (
          <Badge variant="outline" className="border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300">
            <FileArchive className="h-3 w-3 mr-1" />
            Incremental
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
        <CardContent className="space-y-4">
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
          
          <div className="flex gap-4">
            <Input
              placeholder="Backup name (optional)"
              value={backupName}
              onChange={(e) => setBackupName(e.target.value)}
              disabled={isBackupRunning}
              className="flex-1 bg-white/50 dark:bg-gray-900/50"
            />
            <Button 
              onClick={() => createBackup('full')}
              disabled={isBackupRunning || !hasPermission('backup.create')}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg"
            >
              {isBackupRunning ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Full Backup
            </Button>
            <Button 
              onClick={() => createBackup('incremental')}
              disabled={isBackupRunning || !hasPermission('backup.create')}
              variant="outline"
              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400"
            >
              <Play className="h-4 w-4 mr-2" />
              Incremental
            </Button>
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
                          {(backup.size_mb / 1024).toFixed(2)} GB
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
