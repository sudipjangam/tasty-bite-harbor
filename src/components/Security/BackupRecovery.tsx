
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Database, 
  Download, 
  Upload, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Settings,
  Play
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

  useEffect(() => {
    if (hasPermission('backup.view')) {
      fetchBackups();
      fetchBackupSettings();
    }
  }, [user, hasPermission]);

  const fetchBackups = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('backups')
        .select('*')
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
    try {
      const { data, error } = await supabase
        .from('backup_settings')
        .select('*')
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

    if (!backupName.trim()) {
      toast({
        title: "Error",
        description: "Please provide a backup name",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsBackupRunning(true);
      setBackupProgress(0);

      const { data, error } = await supabase.functions.invoke('create-backup', {
        body: {
          name: backupName,
          type,
          settings
        }
      });

      if (error) throw error;

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setBackupProgress(prev => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return 95;
          }
          return prev + Math.random() * 10;
        });
      }, 1000);

      // Check backup status
      const checkStatus = setInterval(async () => {
        const { data: statusData } = await supabase
          .from('backups')
          .select('status')
          .eq('id', data.backup_id)
          .single();

        if (statusData?.status === 'completed' || statusData?.status === 'failed') {
          clearInterval(checkStatus);
          clearInterval(progressInterval);
          setBackupProgress(100);
          setIsBackupRunning(false);
          setBackupName("");
          fetchBackups();

          toast({
            title: statusData.status === 'completed' ? "Success" : "Error",
            description: statusData.status === 'completed' 
              ? "Backup created successfully" 
              : "Backup failed to complete",
            variant: statusData.status === 'completed' ? "default" : "destructive"
          });
        }
      }, 2000);

    } catch (error) {
      console.error('Error creating backup:', error);
      setIsBackupRunning(false);
      setBackupProgress(0);
      toast({
        title: "Error",
        description: "Failed to create backup",
        variant: "destructive"
      });
    }
  };

  const restoreBackup = async (backupId: string) => {
    if (!hasPermission('backup.restore')) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to restore backups",
        variant: "destructive"
      });
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to restore this backup? This will overwrite current data and cannot be undone."
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      const { error } = await supabase.functions.invoke('restore-backup', {
        body: { backup_id: backupId }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Backup restoration started. Please wait for completion."
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
    try {
      const { error } = await supabase
        .from('backup_settings')
        .upsert(settings);

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'running':
        return <Clock className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  if (!hasPermission('backup.view')) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">You don't have permission to view backup management.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Backup Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Backup Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Backup Frequency</label>
              <Select 
                value={settings.backup_frequency} 
                onValueChange={(value: 'daily' | 'weekly' | 'monthly') => 
                  setSettings(prev => ({ ...prev, backup_frequency: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Retention (Days)</label>
              <Input
                type="number"
                value={settings.retention_days}
                onChange={(e) => setSettings(prev => ({ 
                  ...prev, 
                  retention_days: parseInt(e.target.value) || 30 
                }))}
                min="1"
                max="365"
              />
            </div>
          </div>
          <Button onClick={updateBackupSettings}>
            Save Settings
          </Button>
        </CardContent>
      </Card>

      {/* Create Backup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Create Backup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isBackupRunning && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Creating backup...</span>
                <span className="text-sm">{Math.round(backupProgress)}%</span>
              </div>
              <Progress value={backupProgress} className="w-full" />
            </div>
          )}
          
          <div className="flex gap-4">
            <Input
              placeholder="Backup name"
              value={backupName}
              onChange={(e) => setBackupName(e.target.value)}
              disabled={isBackupRunning}
              className="flex-1"
            />
            <Button 
              onClick={() => createBackup('full')}
              disabled={isBackupRunning || !hasPermission('backup.create')}
            >
              <Play className="h-4 w-4 mr-2" />
              Full Backup
            </Button>
            <Button 
              onClick={() => createBackup('incremental')}
              disabled={isBackupRunning || !hasPermission('backup.create')}
              variant="outline"
            >
              <Play className="h-4 w-4 mr-2" />
              Incremental
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Backup History */}
      <Card>
        <CardHeader>
          <CardTitle>Backup History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading backups...</div>
          ) : backups.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">No backups found</div>
          ) : (
            <div className="space-y-3">
              {backups.map((backup) => (
                <div key={backup.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(backup.status)}
                        <span className="font-medium">{backup.name}</span>
                        <Badge variant="outline">{backup.type}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {(backup.size_mb / 1024).toFixed(2)} GB
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Created: {new Date(backup.created_at).toLocaleString()}
                        {backup.completed_at && ` • Completed: ${new Date(backup.completed_at).toLocaleString()}`}
                      </p>
                      {backup.error_message && (
                        <p className="text-sm text-red-600">{backup.error_message}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {backup.status === 'completed' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadBackup(backup.id, backup.name)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {hasPermission('backup.restore') && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => restoreBackup(backup.id)}
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
