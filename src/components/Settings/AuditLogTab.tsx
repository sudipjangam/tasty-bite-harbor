import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurantId } from '@/hooks/useRestaurantId';
import { Shield, Search, Filter, Download, Eye } from 'lucide-react';
import { format } from 'date-fns';

interface AuditLog {
  id: string;
  action: string;
  table_name: string;
  record_id: string;
  old_values: any;
  new_values: any;
  created_at: string;
  user_id: string;
}

export function AuditLogTab() {
  const { restaurantId } = useRestaurantId();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [tableFilter, setTableFilter] = useState('all');

  useEffect(() => {
    loadAuditLogs();
  }, [restaurantId]);

  const loadAuditLogs = async () => {
    if (!restaurantId) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data) {
      setAuditLogs(data);
    }
    setLoading(false);
  };

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = log.table_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.action.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    const matchesTable = tableFilter === 'all' || log.table_name === tableFilter;
    
    return matchesSearch && matchesAction && matchesTable;
  });

  const getActionColor = (action: string) => {
    switch (action) {
      case 'INSERT': return 'bg-green-100 text-green-800';
      case 'UPDATE': return 'bg-blue-100 text-blue-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'Action', 'Table', 'Record ID', 'User ID'].join(','),
      ...filteredLogs.map(log => [
        log.created_at,
        log.action,
        log.table_name,
        log.record_id,
        log.user_id || 'System'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const uniqueTables = [...new Set(auditLogs.map(log => log.table_name))];
  const uniqueActions = [...new Set(auditLogs.map(log => log.action))];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            System Audit Log
          </CardTitle>
          <CardDescription>
            Track all critical operations and changes made to your restaurant data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {uniqueActions.map(action => (
                    <SelectItem key={action} value={action}>{action}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={tableFilter} onValueChange={setTableFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Table" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tables</SelectItem>
                  {uniqueTables.map(table => (
                    <SelectItem key={table} value={table}>{table}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={exportLogs} className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>

            {/* Audit Log List */}
            <ScrollArea className="h-[600px]">
              <div className="space-y-2">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading audit logs...</div>
                ) : filteredLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No audit logs found</div>
                ) : (
                  filteredLogs.map((log) => (
                    <AuditLogItem key={log.id} log={log} getActionColor={getActionColor} />
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AuditLogItem({ log, getActionColor }: { log: AuditLog; getActionColor: (action: string) => string }) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="border rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge className={getActionColor(log.action)}>{log.action}</Badge>
          <span className="font-medium">{log.table_name}</span>
          <span className="text-sm text-muted-foreground">
            {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}
          </span>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-1"
        >
          <Eye className="h-4 w-4" />
          {showDetails ? 'Hide' : 'Details'}
        </Button>
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>Record ID: {log.record_id}</span>
        <span>User: {log.user_id || 'System'}</span>
      </div>

      {showDetails && (
        <div className="mt-4 space-y-3 border-t pt-3">
          {log.old_values && (
            <div>
              <h5 className="font-medium text-sm mb-2">Old Values:</h5>
              <pre className="bg-red-50 p-2 rounded text-xs overflow-x-auto">
                {JSON.stringify(log.old_values, null, 2)}
              </pre>
            </div>
          )}
          
          {log.new_values && (
            <div>
              <h5 className="font-medium text-sm mb-2">New Values:</h5>
              <pre className="bg-green-50 p-2 rounded text-xs overflow-x-auto">
                {JSON.stringify(log.new_values, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}