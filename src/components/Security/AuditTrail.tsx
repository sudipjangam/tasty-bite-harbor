
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  CalendarIcon, 
  Download, 
  Eye, 
  Search, 
  Filter,
  Loader2,
  ChevronLeft,
  ChevronRight,
  FileText,
  User,
  Clock,
  Globe,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AuditLogEntry {
  id: string;
  user_id: string | null;
  user_email?: string; // Fetched from profiles join
  action: string;
  table_name: string | null; // Was resource_type
  record_id: string | null;
  old_values: any;
  new_values: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  restaurant_id: string;
}

const ITEMS_PER_PAGE = 20;

export const AuditTrail = () => {
  const { user, hasPermission } = useAuth();
  const { toast } = useToast();
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  useEffect(() => {
    if (hasPermission('audit.view')) {
      fetchAuditLogs();
    }
  }, [user, hasPermission, currentPage]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      
      // Get total count first
      let countQuery = supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true });

      if (searchTerm) {
        countQuery = countQuery.or(`action.ilike.%${searchTerm}%,table_name.ilike.%${searchTerm}%`);
      }
      if (actionFilter !== 'all') {
        countQuery = countQuery.eq('action', actionFilter);
      }
      if (dateRange.from) {
        countQuery = countQuery.gte('created_at', dateRange.from.toISOString());
      }
      if (dateRange.to) {
        countQuery = countQuery.lte('created_at', dateRange.to.toISOString());
      }

      const { count, error: countError } = await countQuery;
      
      if (countError) {
        // Table might not exist or access denied
        console.log('Audit logs not available:', countError.message);
        setAuditLogs([]);
        setTotalCount(0);
        return;
      }
      
      setTotalCount(count || 0);

      // Fetch paginated data WITHOUT profiles join (FK doesn't exist)
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (searchTerm) {
        query = query.or(`action.ilike.%${searchTerm}%,table_name.ilike.%${searchTerm}%`);
      }

      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }

      if (dateRange.from) {
        query = query.gte('created_at', dateRange.from.toISOString());
      }

      if (dateRange.to) {
        query = query.lte('created_at', dateRange.to.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.log('Error fetching audit logs:', error.message);
        setAuditLogs([]);
        return;
      }
      
      // Use the data directly without profile join
      const mappedData = (data || []).map((log: any) => ({
        ...log,
        user_email: log.user_email || null // Use user_email directly if it exists in table
      }));
      
      setAuditLogs(mappedData);
    } catch (error) {
      console.log('Audit logs feature not available');
      setAuditLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchAuditLogs();
  };

  const exportAuditLogs = async () => {
    if (!hasPermission('audit.export')) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to export audit logs",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('export-audit-logs', {
        body: { filters: { searchTerm, actionFilter, dateRange } }
      });

      if (error) throw error;

      // Create download link
      const blob = new Blob([data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Audit logs exported successfully"
      });
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      toast({
        title: "Error",
        description: "Failed to export audit logs",
        variant: "destructive"
      });
    }
  };

  const getActionBadge = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
        return (
          <Badge className="bg-gradient-to-r from-emerald-500 to-green-500 text-white border-0">
            Create
          </Badge>
        );
      case 'update':
        return (
          <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0">
            Update
          </Badge>
        );
      case 'delete':
        return (
          <Badge className="bg-gradient-to-r from-red-500 to-rose-500 text-white border-0">
            Delete
          </Badge>
        );
      case 'login':
        return (
          <Badge className="bg-gradient-to-r from-purple-500 to-violet-500 text-white border-0">
            Login
          </Badge>
        );
      case 'logout':
        return (
          <Badge className="bg-gradient-to-r from-gray-500 to-slate-500 text-white border-0">
            Logout
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0">
            {action}
          </Badge>
        );
    }
  };

  // Format JSON for display with syntax highlighting
  const formatJsonForDisplay = (obj: any) => {
    if (!obj) return null;
    
    return Object.entries(obj).map(([key, value]) => (
      <div key={key} className="flex gap-2 py-1 border-b border-gray-100 dark:border-gray-800 last:border-0">
        <span className="font-medium text-purple-600 dark:text-purple-400 min-w-[120px]">{key}:</span>
        <span className="text-gray-700 dark:text-gray-300 break-all">
          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
        </span>
      </div>
    ));
  };

  if (!hasPermission('audit.view')) {
    return (
      <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-white/20 dark:border-gray-700/50">
        <CardContent className="p-6 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center mb-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">You don't have permission to view audit logs.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="sm:max-w-3xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
                <Eye className="h-5 w-5 text-white" />
              </div>
              Audit Log Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-6">
              {/* Basic Info - Improved Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-800/50 dark:to-slate-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    <User className="h-3.5 w-3.5" />
                    User
                  </div>
                  <p className="font-medium text-sm break-all">
                    {selectedLog.user_email || <span className="text-muted-foreground italic">Not recorded</span>}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    <Clock className="h-3.5 w-3.5" />
                    Timestamp
                  </div>
                  <p className="font-medium text-sm">{format(new Date(selectedLog.created_at), 'PPpp')}</p>
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Action</div>
                  {getActionBadge(selectedLog.action)}
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Table / Resource</div>
                  <p className="font-medium text-sm">
                    {selectedLog.table_name || <span className="text-muted-foreground italic">Not specified</span>}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Record ID</div>
                  <p className="font-medium text-sm font-mono">
                    {selectedLog.record_id || <span className="text-muted-foreground italic">N/A</span>}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    <Globe className="h-3.5 w-3.5" />
                    IP Address
                  </div>
                  <p className="font-medium text-sm font-mono">
                    {selectedLog.ip_address || <span className="text-muted-foreground italic">Not captured</span>}
                  </p>
                </div>
              </div>

              {/* Changes - Dynamic Layout */}
              {(selectedLog.old_values || selectedLog.new_values) && (
                <div className={`grid gap-4 ${
                  selectedLog.old_values && selectedLog.new_values 
                    ? 'grid-cols-1 md:grid-cols-2' 
                    : 'grid-cols-1'
                }`}>
                  {selectedLog.old_values && Object.keys(selectedLog.old_values).length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-gradient-to-r from-red-500 to-rose-500" />
                        Previous Values
                      </h4>
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                        <div className="space-y-2">
                          {formatJsonForDisplay(selectedLog.old_values)}
                        </div>
                      </div>
                    </div>
                  )}
                  {selectedLog.new_values && Object.keys(selectedLog.new_values).length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-green-600 dark:text-green-400 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-500 to-green-500" />
                        {selectedLog.old_values ? 'New Values' : 'Record Data'}
                      </h4>
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                        <div className="space-y-2">
                          {formatJsonForDisplay(selectedLog.new_values)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* No data message */}
              {!selectedLog.old_values && !selectedLog.new_values && (
                <div className="text-center py-6 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No data changes recorded for this action</p>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button variant="outline" onClick={() => setSelectedLog(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-lg">
              <Filter className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle>Audit Trail Filters</CardTitle>
              <CardDescription>Search and filter activity logs</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="bg-white/50 dark:bg-gray-900/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Action Type</label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="bg-white/50 dark:bg-gray-900/50">
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="create">Create</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="login">Login</SelectItem>
                  <SelectItem value="logout">Logout</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">From Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal bg-white/50 dark:bg-gray-900/50">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? format(dateRange.from, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">&nbsp;</label>
              <div className="flex gap-2">
                <Button 
                  onClick={handleSearch} 
                  className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
                {hasPermission('audit.export') && (
                  <Button 
                    onClick={exportAuditLogs} 
                    variant="outline"
                    className="border-indigo-300 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-400"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs */}
      <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle>Audit Logs</CardTitle>
                <CardDescription>
                  Showing {auditLogs.length} of {totalCount} records
                </CardDescription>
              </div>
            </div>
            <Button 
              onClick={fetchAuditLogs} 
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
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No audit logs found</p>
              <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="space-y-3">
              {auditLogs.map((log) => (
                <div 
                  key={log.id} 
                  className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white/50 dark:bg-gray-900/50 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-wrap">
                      {getActionBadge(log.action)}
                      <span className="font-medium">{log.user_email || <span className="text-muted-foreground italic">Unknown user</span>}</span>
                      {log.table_name && (
                        <span className="text-muted-foreground text-sm">
                          {log.table_name}{log.record_id ? ` #${log.record_id.slice(0, 8)}...` : ''}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(log.created_at), 'PPpp')}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedLog(log)}
                        className="hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
