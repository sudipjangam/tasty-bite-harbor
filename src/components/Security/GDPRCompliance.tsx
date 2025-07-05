
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Shield, 
  Download, 
  Trash2, 
  Eye, 
  FileText, 
  AlertTriangle,
  CheckCircle 
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

export const GDPRCompliance = () => {
  const { user, hasPermission } = useAuth();
  const { toast } = useToast();
  const [dataRequests, setDataRequests] = useState<DataRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [requestReason, setRequestReason] = useState("");
  const [showDataExport, setShowDataExport] = useState(false);

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

  const submitDataRequest = async (type: 'export' | 'delete' | 'rectification') => {
    if (!userEmail || !requestReason) {
      toast({
        title: "Error",
        description: "Please provide email and reason",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('gdpr-data-request', {
        body: {
          type,
          user_email: userEmail,
          reason: requestReason
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `${type} request submitted successfully`
      });

      setUserEmail("");
      setRequestReason("");
      fetchDataRequests();
    } catch (error) {
      console.error('Error submitting GDPR request:', error);
      toast({
        title: "Error",
        description: "Failed to submit request",
        variant: "destructive"
      });
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

    const confirmed = window.confirm(
      `Are you sure you want to delete all data for ${email}? This action cannot be undone.`
    );

    if (!confirmed) return;

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
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case 'processing':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Processing</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* GDPR Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            GDPR Compliance Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This system helps you comply with GDPR requirements by managing data subject requests,
              maintaining audit trails, and ensuring proper data handling procedures.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Data Subject Rights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Download className="h-5 w-5" />
              Right to Data Portability
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="User email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
            />
            <Textarea
              placeholder="Reason for request"
              value={requestReason}
              onChange={(e) => setRequestReason(e.target.value)}
            />
            <Button 
              onClick={() => submitDataRequest('export')}
              className="w-full"
            >
              Submit Export Request
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trash2 className="h-5 w-5" />
              Right to Erasure
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="User email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
            />
            <Textarea
              placeholder="Reason for deletion"
              value={requestReason}
              onChange={(e) => setRequestReason(e.target.value)}
            />
            <Button 
              onClick={() => submitDataRequest('delete')}
              variant="destructive"
              className="w-full"
            >
              Submit Deletion Request
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              Right to Rectification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="User email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
            />
            <Textarea
              placeholder="Data correction details"
              value={requestReason}
              onChange={(e) => setRequestReason(e.target.value)}
            />
            <Button 
              onClick={() => submitDataRequest('rectification')}
              className="w-full"
            >
              Submit Correction Request
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Active Requests */}
      {hasPermission('gdpr.view') && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>GDPR Requests</CardTitle>
              <Button onClick={fetchDataRequests} variant="outline">
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">Loading requests...</div>
            ) : dataRequests.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">No GDPR requests found</div>
            ) : (
              <div className="space-y-3">
                {dataRequests.map((request) => (
                  <div key={request.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{request.type}</Badge>
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
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        {request.type === 'delete' && request.status === 'pending' && hasPermission('gdpr.delete') && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteUserData(request.user_email)}
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
