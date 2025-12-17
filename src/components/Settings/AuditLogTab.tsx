import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurantId } from '@/hooks/useRestaurantId';
import { 
  Shield, Search, Download, Eye, EyeOff, Calendar, 
  Loader2, RefreshCw, Database, Edit, Trash2, Plus,
  ChevronDown, FileText
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

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
  const [dateFilter, setDateFilter] = useState('7days');
  const [showLoadMore, setShowLoadMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const LIMIT = 50;

  useEffect(() => {
    loadAuditLogs(true);
  }, [restaurantId, dateFilter]);

  const getDateRange = () => {
    const now = new Date();
    switch (dateFilter) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case '7days':
        return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
      case '30days':
        return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
      case '90days':
        return { start: startOfDay(subDays(now, 90)), end: endOfDay(now) };
      default:
        return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
    }
  };

  const loadAuditLogs = async (reset = false) => {
    if (!restaurantId) return;
    
    setLoading(true);
    const currentOffset = reset ? 0 : offset;
    const { start, end } = getDateRange();

    const { data, error, count } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .eq('restaurant_id', restaurantId)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: false })
      .range(currentOffset, currentOffset + LIMIT - 1);

    if (!error && data) {
      if (reset) {
        setAuditLogs(data);
        setOffset(LIMIT);
      } else {
        setAuditLogs(prev => [...prev, ...data]);
        setOffset(currentOffset + LIMIT);
      }
      setShowLoadMore((count || 0) > currentOffset + LIMIT);
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
      case 'INSERT': return 'bg-gradient-to-r from-green-500 to-emerald-600 text-white';
      case 'UPDATE': return 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white';
      case 'DELETE': return 'bg-gradient-to-r from-red-500 to-pink-600 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'INSERT': return <Plus className="h-3 w-3" />;
      case 'UPDATE': return <Edit className="h-3 w-3" />;
      case 'DELETE': return <Trash2 className="h-3 w-3" />;
      default: return <Database className="h-3 w-3" />;
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
      <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border border-white/30 dark:border-gray-700/30 rounded-3xl shadow-2xl">
        <CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-700">
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="p-3 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl shadow-lg">
              <Shield className="h-6 w-6 text-white" />
            </div>
            System Audit Log
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
            Track all critical operations and changes made to your restaurant data.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Search */}
              <div className="lg:col-span-2">
                <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
                  Search
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by table or action..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 rounded-xl"
                  />
                </div>
              </div>
              
              {/* Date Range Filter */}
              <div>
                <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Date Range
                </Label>
                <Select value={dateFilter} onValueChange={(value) => setDateFilter(value)}>
                  <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 rounded-xl">
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="7days">Last 7 Days</SelectItem>
                    <SelectItem value="30days">Last 30 Days</SelectItem>
                    <SelectItem value="90days">Last 90 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Action Filter */}
              <div>
                <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
                  Action
                </Label>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 rounded-xl">
                    <SelectValue placeholder="All Actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    {uniqueActions.map(action => (
                      <SelectItem key={action} value={action}>{action}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Table Filter */}
              <div>
                <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
                  Table
                </Label>
                <Select value={tableFilter} onValueChange={setTableFilter}>
                  <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 rounded-xl">
                    <SelectValue placeholder="All Tables" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tables</SelectItem>
                    {uniqueTables.map(table => (
                      <SelectItem key={table} value={table}>{table}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                  {filteredLogs.length} records
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => loadAuditLogs(true)}
                  className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 rounded-xl"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button 
                  variant="outline" 
                  onClick={exportLogs} 
                  className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 rounded-xl"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>

            {/* Audit Log List */}
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-3">
                {loading && auditLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Loading audit logs...</p>
                  </div>
                ) : filteredLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">No audit logs found</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500">Try adjusting your filters</p>
                  </div>
                ) : (
                  <>
                    {filteredLogs.map((log) => (
                      <AuditLogItem key={log.id} log={log} getActionColor={getActionColor} getActionIcon={getActionIcon} />
                    ))}
                    {showLoadMore && (
                      <div className="flex justify-center pt-4">
                        <Button 
                          variant="outline" 
                          onClick={() => loadAuditLogs(false)}
                          disabled={loading}
                          className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 rounded-xl"
                        >
                          {loading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <ChevronDown className="h-4 w-4 mr-2" />
                          )}
                          Load More
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AuditLogItem({ 
  log, 
  getActionColor, 
  getActionIcon 
}: { 
  log: AuditLog; 
  getActionColor: (action: string) => string;
  getActionIcon: (action: string) => React.ReactNode;
}) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 transition-all duration-200 hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge className={`${getActionColor(log.action)} flex items-center gap-1 px-3 py-1`}>
            {getActionIcon(log.action)}
            {log.action}
          </Badge>
          <div>
            <span className="font-semibold text-gray-900 dark:text-white">{log.table_name}</span>
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
              {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}
            </span>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDetails(!showDetails)}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          {showDetails ? (
            <>
              <EyeOff className="h-4 w-4 mr-1" />
              Hide
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-1" />
              Details
            </>
          )}
        </Button>
      </div>

      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1">
          <Database className="h-3 w-3" />
          ID: {log.record_id?.substring(0, 8)}...
        </span>
        <span>User: {log.user_id?.substring(0, 8) || 'System'}...</span>
      </div>

      {showDetails && (
        <div className="mt-4 space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
          {log.old_values && (
            <div>
              <h5 className="font-semibold text-sm mb-2 text-red-600 dark:text-red-400 flex items-center gap-1">
                <Trash2 className="h-3 w-3" />
                Old Values:
              </h5>
              <pre className="bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 p-3 rounded-lg text-xs overflow-x-auto border border-red-200 dark:border-red-800 text-gray-800 dark:text-gray-200">
                {JSON.stringify(log.old_values, null, 2)}
              </pre>
            </div>
          )}
          
          {log.new_values && (
            <div>
              <h5 className="font-semibold text-sm mb-2 text-green-600 dark:text-green-400 flex items-center gap-1">
                <Plus className="h-3 w-3" />
                New Values:
              </h5>
              <pre className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-3 rounded-lg text-xs overflow-x-auto border border-green-200 dark:border-green-800 text-gray-800 dark:text-gray-200">
                {JSON.stringify(log.new_values, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}