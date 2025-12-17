
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Shield, 
  Download, 
  Trash2, 
  Eye, 
  FileText, 
  AlertTriangle,
  CheckCircle,
  Loader2,
  Mail,
  RefreshCw
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DataRequest {
  id: string;
  type: 'export' | 'delete' | 'rectification';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  user_email: string;
  reason: string;
  created_at: string;
  completed_at?: string;
}

// Separate form state for each request type
interface FormState {
  email: string;
  reason: string;
  loading: boolean;
}

const initialFormState: FormState = {
  email: "",
  reason: "",
  loading: false
};

export const GDPRCompliance = () => {
  const { user, hasPermission } = useAuth();
  const { toast } = useToast();
  const [dataRequests, setDataRequests] = useState<DataRequest[]>([]);
  const [loading, setLoading] = useState(false);
  
  // FIXED: Separate state for each form type
  const [exportForm, setExportForm] = useState<FormState>(initialFormState);
  const [deleteForm, setDeleteForm] = useState<FormState>(initialFormState);
  const [rectifyForm, setRectifyForm] = useState<FormState>(initialFormState);
  
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    variant: 'danger' | 'warning';
    onConfirm: () => void;
  }>({
    open: false,
    title: "",
    description: "",
    variant: 'warning',
    onConfirm: () => {}
  });

  useEffect(() => {
    if (hasPermission('gdpr.view')) {
      fetchDataRequests();
    }
  }, [hasPermission]);

  const fetchDataRequests = async () => {
    if (!hasPermission('gdpr.view')) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('gdpr_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDataRequests(data || []);
    } catch (error) {
      console.error('Error fetching GDPR requests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch GDPR requests",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Email validation
  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const submitDataRequest = async (
    type: 'export' | 'delete' | 'rectification',
    form: FormState,
    setForm: React.Dispatch<React.SetStateAction<FormState>>
  ) => {
    if (!form.email || !form.reason) {
      toast({
        title: "Error",
        description: "Please provide email and reason",
        variant: "destructive"
      });
      return;
    }

    if (!isValidEmail(form.email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }

    try {
      setForm(prev => ({ ...prev, loading: true }));
      
      const { error } = await supabase.functions.invoke('gdpr-data-request', {
        body: {
          type,
          user_email: form.email,
          reason: form.reason
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} request submitted successfully`
      });

      setForm(initialFormState);
      fetchDataRequests();
    } catch (error) {
      console.error('Error submitting GDPR request:', error);
      toast({
        title: "Error",
        description: "Failed to submit request",
        variant: "destructive"
      });
    } finally {
      setForm(prev => ({ ...prev, loading: false }));
    }
  };

  const exportUserData = async (email: string) => {
    if (!hasPermission('gdpr.export')) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to export user data",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('export-user-data', {
        body: { user_email: email }
      });

      if (error) throw error;

      // Create download link
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user-data-${email.replace('@', '-')}.json`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "User data exported successfully"
      });
    } catch (error) {
      console.error('Error exporting user data:', error);
      toast({
        title: "Error",
        description: "Failed to export user data",
        variant: "destructive"
      });
    }
  };

  const deleteUserData = async (email: string) => {
    if (!hasPermission('gdpr.delete')) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to delete user data",
        variant: "destructive"
      });
      return;
    }

    // Show confirmation dialog instead of window.confirm
    setConfirmDialog({
      open: true,
      title: "Delete User Data",
      description: `Are you sure you want to permanently delete all data for ${email}? This action cannot be undone and will remove all personal information associated with this user.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          const { error } = await supabase.functions.invoke('delete-user-data', {
            body: { user_email: email }
          });

          if (error) throw error;

          toast({
            title: "Success",
            description: "User data deleted successfully"
          });

          fetchDataRequests();
        } catch (error) {
          console.error('Error deleting user data:', error);
          toast({
            title: "Error",
            description: "Failed to delete user data",
            variant: "destructive"
          });
        }
        setConfirmDialog(prev => ({ ...prev, open: false }));
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0">
            Pending
          </Badge>
        );
      case 'processing':
        return (
          <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Processing
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="bg-gradient-to-r from-emerald-500 to-green-500 text-white border-0">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-gradient-to-r from-red-500 to-rose-500 text-white border-0">
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'export':
        return (
          <Badge variant="outline" className="border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300">
            <Download className="h-3 w-3 mr-1" />
            Export
          </Badge>
        );
      case 'delete':
        return (
          <Badge variant="outline" className="border-red-300 text-red-700 dark:border-red-700 dark:text-red-300">
            <Trash2 className="h-3 w-3 mr-1" />
            Delete
          </Badge>
        );
      case 'rectification':
        return (
          <Badge variant="outline" className="border-purple-300 text-purple-700 dark:border-purple-700 dark:text-purple-300">
            <FileText className="h-3 w-3 mr-1" />
            Rectify
          </Badge>
        );
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-md bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-white/20 dark:border-gray-700/50">
          <DialogHeader>
            <div className={`mx-auto p-3 rounded-full mb-2 ${
              confirmDialog.variant === 'danger' 
                ? 'bg-gradient-to-r from-red-500/20 to-rose-500/20' 
                : 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20'
            }`}>
              <AlertTriangle className={`h-6 w-6 ${
                confirmDialog.variant === 'danger' ? 'text-red-500' : 'text-amber-500'
              }`} />
            </div>
            <DialogTitle className="text-center">{confirmDialog.title}</DialogTitle>
            <DialogDescription className="text-center">
              {confirmDialog.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant={confirmDialog.variant === 'danger' ? 'destructive' : 'default'}
              onClick={confirmDialog.onConfirm}
              className={`flex-1 ${
                confirmDialog.variant === 'danger' 
                  ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700' 
                  : ''
              }`}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* GDPR Overview - Modern Header */}
      <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 dark:from-indigo-900/30 dark:via-purple-900/30 dark:to-pink-900/30 rounded-2xl p-6 border border-indigo-200/50 dark:border-indigo-800/50">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              GDPR Compliance Dashboard
            </h2>
            <p className="text-sm text-muted-foreground">
              Manage data subject rights and compliance requests
            </p>
          </div>
        </div>
        
        <Alert className="mt-4 bg-white/50 dark:bg-gray-800/50 border-amber-200 dark:border-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            This system helps you comply with GDPR requirements by managing data subject requests,
            maintaining audit trails, and ensuring proper data handling procedures.
          </AlertDescription>
        </Alert>
      </div>

      {/* Data Subject Rights - Separate Forms */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Export Card */}
        <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg shadow-lg">
                <Download className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Data Portability</CardTitle>
                <CardDescription>Export user data</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                User Email
              </label>
              <Input
                placeholder="user@example.com"
                type="email"
                value={exportForm.email}
                onChange={(e) => setExportForm(prev => ({ ...prev, email: e.target.value }))}
                className="bg-white/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason for Request</label>
              <Textarea
                placeholder="Describe the reason for this data export request..."
                value={exportForm.reason}
                onChange={(e) => setExportForm(prev => ({ ...prev, reason: e.target.value }))}
                className="bg-white/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 min-h-[80px]"
              />
            </div>
            <Button 
              onClick={() => submitDataRequest('export', exportForm, setExportForm)}
              disabled={exportForm.loading}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg"
            >
              {exportForm.loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Submit Export Request
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Delete Card */}
        <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-red-500 to-rose-500 rounded-lg shadow-lg">
                <Trash2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Right to Erasure</CardTitle>
                <CardDescription>Delete user data</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                User Email
              </label>
              <Input
                placeholder="user@example.com"
                type="email"
                value={deleteForm.email}
                onChange={(e) => setDeleteForm(prev => ({ ...prev, email: e.target.value }))}
                className="bg-white/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason for Deletion</label>
              <Textarea
                placeholder="Describe the reason for this deletion request..."
                value={deleteForm.reason}
                onChange={(e) => setDeleteForm(prev => ({ ...prev, reason: e.target.value }))}
                className="bg-white/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 min-h-[80px]"
              />
            </div>
            <Button 
              onClick={() => submitDataRequest('delete', deleteForm, setDeleteForm)}
              disabled={deleteForm.loading}
              className="w-full bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white shadow-lg"
            >
              {deleteForm.loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Submit Deletion Request
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Rectification Card */}
        <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-purple-500 to-violet-500 rounded-lg shadow-lg">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Right to Rectification</CardTitle>
                <CardDescription>Correct user data</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                User Email
              </label>
              <Input
                placeholder="user@example.com"
                type="email"
                value={rectifyForm.email}
                onChange={(e) => setRectifyForm(prev => ({ ...prev, email: e.target.value }))}
                className="bg-white/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Correction Details</label>
              <Textarea
                placeholder="Describe what data needs to be corrected..."
                value={rectifyForm.reason}
                onChange={(e) => setRectifyForm(prev => ({ ...prev, reason: e.target.value }))}
                className="bg-white/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 min-h-[80px]"
              />
            </div>
            <Button 
              onClick={() => submitDataRequest('rectification', rectifyForm, setRectifyForm)}
              disabled={rectifyForm.loading}
              className="w-full bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white shadow-lg"
            >
              {rectifyForm.loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Submit Correction Request
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Active Requests */}
      {hasPermission('gdpr.view') && (
        <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg">
                  <Eye className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle>GDPR Requests</CardTitle>
                  <CardDescription>Track and manage data subject requests</CardDescription>
                </div>
              </div>
              <Button 
                onClick={fetchDataRequests} 
                variant="outline"
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
            ) : dataRequests.length === 0 ? (
              <div className="text-center py-8">
                <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">No GDPR requests found</p>
                <p className="text-sm text-muted-foreground mt-1">Submit a data request above to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dataRequests.map((request) => (
                  <div 
                    key={request.id} 
                    className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white/50 dark:bg-gray-900/50 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          {getTypeBadge(request.type)}
                          {getStatusBadge(request.status)}
                          <span className="font-medium">{request.user_email}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{request.reason}</p>
                        <p className="text-xs text-muted-foreground">
                          Created: {new Date(request.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {request.type === 'export' && request.status === 'completed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => exportUserData(request.user_email)}
                            className="border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        {request.type === 'delete' && request.status === 'pending' && hasPermission('gdpr.delete') && (
                          <Button
                            size="sm"
                            onClick={() => deleteUserData(request.user_email)}
                            className="bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
