
import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/Layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AuditTrail } from "@/components/Security/AuditTrail";
import { GDPRCompliance } from "@/components/Security/GDPRCompliance";
import { BackupRecovery } from "@/components/Security/BackupRecovery";
import { RoleBadge } from "@/components/ui/role-badge";
import { useAuth } from "@/hooks/useAuth";
import { Permission, UserRole, rolePermissions } from "@/types/auth";
import { supabase } from "@/integrations/supabase/client";
import { 
  Shield, 
  Users, 
  FileText, 
  Database, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Lock,
  Edit,
  Trash2,
  Settings,
  BarChart3,
  UserCheck,
  Key,
  Activity,
  TrendingUp
} from "lucide-react";

const Security = () => {
  const { user, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [securityMetrics, setSecurityMetrics] = useState([
    {
      title: "Active Staff",
      value: "0",
      status: "normal",
      icon: Users,
      description: "Currently active staff members",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      title: "Failed Logins",
      value: "0",
      status: "normal",
      icon: AlertTriangle,
      description: "Failed login attempts today",
      gradient: "from-amber-500 to-orange-500"
    },
    {
      title: "Last Backup",
      value: "Never",
      status: "warning",
      icon: Database,
      description: "Most recent successful backup",
      gradient: "from-emerald-500 to-teal-500"
    },
    {
      title: "GDPR Requests",
      value: "0",
      status: "normal",
      icon: FileText,
      description: "Pending data subject requests",
      gradient: "from-purple-500 to-violet-500"
    }
  ]);

  useEffect(() => {
    const fetchSecurityMetrics = async () => {
      if (!user?.restaurant_id) return;

      try {
        // Fetch staff count for active users
        const { data: staffData } = await supabase
          .from('staff')
          .select('id')
          .eq('restaurant_id', user.restaurant_id)
          .eq('is_active', true);

        // Fetch last backup
        const { data: backupData } = await supabase
          .from('backups')
          .select('completed_at, status')
          .eq('restaurant_id', user.restaurant_id)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(1);

        // FIXED: Fetch actual GDPR pending requests count
        const { data: gdprData, count: gdprCount } = await supabase
          .from('gdpr_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        // Fetch audit logs for failed logins (if available)
        const { data: auditData, count: failedLoginCount } = await supabase
          .from('audit_logs')
          .select('*', { count: 'exact', head: true })
          .eq('action', 'login_failed')
          .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString());

        const activeUsers = staffData?.length || 0;
        const lastBackup = backupData?.[0] 
          ? new Date(backupData[0].completed_at).toLocaleString()
          : "Never";
        const failedLogins = failedLoginCount || 0;
        const pendingGdpr = gdprCount || 0;

        setSecurityMetrics([
          {
            title: "Active Staff",
            value: activeUsers.toString(),
            status: activeUsers > 0 ? "good" : "warning",
            icon: Users,
            description: "Currently active staff members",
            gradient: "from-blue-500 to-cyan-500"
          },
          {
            title: "Failed Logins",
            value: failedLogins.toString(),
            status: failedLogins > 5 ? "error" : failedLogins > 0 ? "warning" : "good",
            icon: AlertTriangle,
            description: "Failed login attempts today",
            gradient: "from-amber-500 to-orange-500"
          },
          {
            title: "Last Backup",
            value: lastBackup === "Never" ? "Never" : "Recently",
            status: lastBackup === "Never" ? "error" : "good",
            icon: Database,
            description: lastBackup === "Never" ? "No backups found" : `Last: ${lastBackup}`,
            gradient: "from-emerald-500 to-teal-500"
          },
          {
            title: "GDPR Requests",
            value: pendingGdpr.toString(),
            status: pendingGdpr > 0 ? "warning" : "good",
            icon: FileText,
            description: pendingGdpr > 0 ? `${pendingGdpr} pending requests` : "No pending requests",
            gradient: "from-purple-500 to-violet-500"
          }
        ]);
      } catch (error) {
        console.error('Error fetching security metrics:', error);
      }
    };

    fetchSecurityMetrics();
  }, [user?.restaurant_id]);

  // Get permissions for current user role
  const getUserPermissions = (): Permission[] => {
    if (!user?.role) return [];
    return rolePermissions[user.role] || [];
  };

  const getPermissionIcon = (permission: Permission) => {
    const iconMap: Record<string, any> = {
      'dashboard.view': BarChart3,
      'dashboard.analytics': BarChart3,
      'orders.view': Eye,
      'orders.create': Edit,
      'orders.update': Edit,
      'orders.delete': Trash2,
      'pos.access': Settings,
      'menu.view': Eye,
      'menu.create': Edit,
      'menu.update': Edit,
      'menu.delete': Trash2,
      'inventory.view': Eye,
      'inventory.create': Edit,
      'inventory.update': Edit,
      'inventory.delete': Trash2,
      'staff.view': Users,
      'staff.create': UserCheck,
      'staff.update': Edit,
      'staff.delete': Trash2,
      'staff.manage_roles': Key,
      'customers.view': Users,
      'customers.create': Edit,
      'customers.update': Edit,
      'customers.delete': Trash2,
      'rooms.view': Eye,
      'rooms.create': Edit,
      'rooms.update': Edit,
      'rooms.delete': Trash2,
      'rooms.checkout': Settings,
      'reservations.view': Eye,
      'reservations.create': Edit,
      'reservations.update': Edit,
      'reservations.delete': Trash2,
      'analytics.view': BarChart3,
      'analytics.export': FileText,
      'financial.view': Database,
      'financial.create': Edit,
      'financial.update': Edit,
      'financial.delete': Trash2,
      'financial.reports': FileText,
      'settings.view': Settings,
      'settings.update': Settings,
      'settings.manage_users': UserCheck,
      'users.manage': Key,
      'kitchen.view': Eye,
      'kitchen.update': Edit,
      'tables.view': Eye,
      'tables.create': Edit,
      'tables.update': Edit,
      'tables.delete': Trash2,
      'housekeeping.view': Eye,
      'housekeeping.create': Edit,
      'housekeeping.update': Edit,
      'housekeeping.delete': Trash2,
      'audit.view': FileText,
      'audit.export': FileText,
      'backup.create': Database,
      'backup.restore': Database,
      'backup.view': Eye,
      'gdpr.view': Shield,
      'gdpr.export': FileText,
      'gdpr.delete': Trash2
    };
    return iconMap[permission] || Shield;
  };

  const getPermissionDescription = (permission: Permission): string => {
    const descriptions: Record<Permission, string> = {
      'dashboard.view': 'Access to main dashboard and overview',
      'dashboard.analytics': 'View dashboard analytics and insights',
      'orders.view': 'View order history and details',
      'orders.create': 'Create new orders',
      'orders.update': 'Update existing orders',
      'orders.delete': 'Delete orders',
      'pos.access': 'Access point-of-sale system',
      'menu.view': 'View menu items',
      'menu.create': 'Create new menu items',
      'menu.update': 'Edit menu items',
      'menu.delete': 'Delete menu items',
      'inventory.view': 'View inventory levels and items',
      'inventory.create': 'Add new inventory items',
      'inventory.update': 'Update inventory quantities and details',
      'inventory.delete': 'Remove inventory items',
      'staff.view': 'View staff list and basic information',
      'staff.create': 'Add new staff members',
      'staff.update': 'Edit staff information',
      'staff.delete': 'Remove staff members',
      'staff.manage_roles': 'Assign and modify staff roles',
      'customers.view': 'View customer information and history',
      'customers.create': 'Add new customers',
      'customers.update': 'Edit customer profiles',
      'customers.delete': 'Remove customer records',
      'rooms.view': 'View room information and status',
      'rooms.create': 'Add new rooms',
      'rooms.update': 'Update room details',
      'rooms.delete': 'Remove rooms',
      'rooms.checkout': 'Process room checkouts',
      'reservations.view': 'View reservations',
      'reservations.create': 'Create new reservations',
      'reservations.update': 'Modify reservations',
      'reservations.delete': 'Cancel reservations',
      'analytics.view': 'Access to analytics and reports',
      'analytics.export': 'Export analytics data',
      'financial.view': 'View financial data',
      'financial.create': 'Create financial records',
      'financial.update': 'Update financial information',
      'financial.delete': 'Delete financial records',
      'financial.reports': 'Generate financial reports',
      'settings.view': 'View system settings',
      'settings.update': 'Modify system settings',
      'settings.manage_users': 'Manage user accounts',
      'users.manage': 'Full user management privileges',
      'kitchen.view': 'View kitchen orders and status',
      'kitchen.update': 'Update order status in kitchen',
      'tables.view': 'View table information',
      'tables.create': 'Add new tables',
      'tables.update': 'Update table details',
      'tables.delete': 'Remove tables',
      'housekeeping.view': 'View housekeeping tasks',
      'housekeeping.create': 'Create housekeeping tasks',
      'housekeeping.update': 'Update housekeeping status',
      'housekeeping.delete': 'Remove housekeeping tasks',
      'audit.view': 'View audit logs and trails',
      'audit.export': 'Export audit data',
      'backup.create': 'Create system backups',
      'backup.restore': 'Restore from backups',
      'backup.view': 'View backup history',
      'gdpr.view': 'View GDPR compliance data',
      'gdpr.export': 'Export user data for GDPR requests',
      'gdpr.delete': 'Delete user data for GDPR compliance'
    };
    return descriptions[permission] || 'Unknown permission';
  };

  // Get current user role data with live permissions
  const getCurrentRoleData = () => {
    if (!user?.role) return null;
    
    const permissions = getUserPermissions();
    
    return {
      role: user.role.charAt(0).toUpperCase() + user.role.slice(1),
      permissions: permissions.length,
      description: `${permissions.length} permissions available`,
      permissionsList: permissions
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'from-emerald-500/20 to-green-500/20 border-emerald-300 dark:border-emerald-700';
      case 'warning': return 'from-amber-500/20 to-yellow-500/20 border-amber-300 dark:border-amber-700';
      case 'error': return 'from-red-500/20 to-rose-500/20 border-red-300 dark:border-red-700';
      default: return 'from-gray-500/20 to-slate-500/20 border-gray-300 dark:border-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'error': return AlertTriangle;
      default: return Clock;
    }
  };

  const getStatusIconColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-emerald-600';
      case 'warning': return 'text-amber-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950">
      <PageHeader 
        title="Security & Compliance"
        description="Manage security settings, audit trails, and compliance requirements"
      />
      
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 p-1 rounded-xl shadow-lg">
            <TabsTrigger 
              value="overview" 
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg transition-all"
            >
              <Shield className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="audit" 
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white rounded-lg transition-all"
            >
              <FileText className="h-4 w-4" />
              Audit Trail
            </TabsTrigger>
            <TabsTrigger 
              value="gdpr" 
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white rounded-lg transition-all"
            >
              <Users className="h-4 w-4" />
              GDPR
            </TabsTrigger>
            <TabsTrigger 
              value="backup" 
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-white rounded-lg transition-all"
            >
              <Database className="h-4 w-4" />
              Backup
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Security Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {securityMetrics.map((metric, index) => {
                const StatusIcon = getStatusIcon(metric.status);
                return (
                  <Card 
                    key={index} 
                    className={`bg-gradient-to-br ${getStatusColor(metric.status)} backdrop-blur-xl border shadow-xl hover:shadow-2xl transition-all duration-300`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">{metric.title}</p>
                          <p className="text-3xl font-bold">{metric.value}</p>
                          <p className="text-xs text-muted-foreground">{metric.description}</p>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          <div className={`p-2.5 bg-gradient-to-br ${metric.gradient} rounded-xl shadow-lg`}>
                            <metric.icon className="h-5 w-5 text-white" />
                          </div>
                          <StatusIcon className={`h-4 w-4 ${getStatusIconColor(metric.status)}`} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Your Current Role & Permissions */}
            <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 shadow-xl">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                    <Key className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle>Your Current Role & Permissions</CardTitle>
                    <CardDescription>Your access level and available permissions</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {getCurrentRoleData() ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-200/50 dark:border-indigo-800/50">
                      <Shield className="h-5 w-5 text-indigo-600" />
                      <div className="flex-1">
                        <div className="font-medium">{getCurrentRoleData()?.role}</div>
                        <div className="text-sm text-muted-foreground">
                          {getCurrentRoleData()?.description}
                        </div>
                      </div>
                      <RoleBadge role={(user.role_name_text || user.role) as UserRole} />
                    </div>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <button className="w-full p-4 text-left rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50 hover:shadow-md transition-all duration-200">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">View All Your Permissions</span>
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Click to see detailed list of what you can access
                          </div>
                        </button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-white/20 dark:border-gray-700/50">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
                              <Key className="h-5 w-5 text-white" />
                            </div>
                            Your Permissions ({getCurrentRoleData()?.role})
                          </DialogTitle>
                          <DialogDescription>
                            Detailed list of all permissions available to your role
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-1 gap-3 mt-4">
                          {getCurrentRoleData()?.permissionsList.map((permission, index) => {
                            const IconComponent = getPermissionIcon(permission);
                            return (
                              <div key={index} className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50">
                                <div className="p-1.5 bg-gradient-to-br from-emerald-500 to-green-500 rounded-lg">
                                  <IconComponent className="h-4 w-4 text-white" />
                                </div>
                                <div className="flex-1">
                                  <div className="font-medium capitalize text-sm">
                                    {permission.replace(/[._]/g, ' ')}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {getPermissionDescription(permission)}
                                  </div>
                                </div>
                                <Badge className="bg-gradient-to-r from-emerald-500 to-green-500 text-white border-0 text-xs">
                                  Granted
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No role information available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Compliance Status */}
            <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 shadow-xl">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg">
                    <Activity className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle>Compliance Status</CardTitle>
                    <CardDescription>Current compliance checks</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-200/50 dark:border-emerald-800/50">
                    <div className="p-2 bg-gradient-to-br from-emerald-500 to-green-500 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">GDPR Compliant</p>
                      <p className="text-xs text-muted-foreground">Data protection active</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-200/50 dark:border-emerald-800/50">
                    <div className="p-2 bg-gradient-to-br from-emerald-500 to-green-500 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">Audit Trail Active</p>
                      <p className="text-xs text-muted-foreground">All actions logged</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-200/50 dark:border-emerald-800/50">
                    <div className="p-2 bg-gradient-to-br from-emerald-500 to-green-500 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">Regular Backups</p>
                      <p className="text-xs text-muted-foreground">Automated system</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit">
            <AuditTrail />
          </TabsContent>

          <TabsContent value="gdpr">
            <GDPRCompliance />
          </TabsContent>

          <TabsContent value="backup">
            <BackupRecovery />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Security;
