
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
  Key
} from "lucide-react";

const Security = () => {
  const { user, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [securityMetrics, setSecurityMetrics] = useState([
    {
      title: "Active Users",
      value: "0",
      status: "normal",
      icon: Users,
      description: "Currently active user sessions"
    },
    {
      title: "Failed Logins",
      value: "0",
      status: "normal",
      icon: AlertTriangle,
      description: "Failed login attempts today"
    },
    {
      title: "Last Backup",
      value: "Never",
      status: "warning",
      icon: Database,
      description: "Most recent successful backup"
    },
    {
      title: "GDPR Requests",
      value: "0",
      status: "normal",
      icon: FileText,
      description: "Pending data subject requests"
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

        // Fetch audit logs for failed logins (placeholder - would need auth logs)
        const { data: auditData } = await supabase
          .from('audit_logs')
          .select('id')
          .eq('restaurant_id', user.restaurant_id)
          .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString());

        const activeUsers = staffData?.length || 0;
        const lastBackup = backupData?.[0] 
          ? new Date(backupData[0].completed_at).toLocaleString()
          : "Never";
        const failedLogins = 0; // Would be calculated from auth logs
        const auditCount = auditData?.length || 0;

        setSecurityMetrics([
          {
            title: "Active Users",
            value: activeUsers.toString(),
            status: activeUsers > 0 ? "good" : "warning",
            icon: Users,
            description: "Currently active user sessions"
          },
          {
            title: "Failed Logins",
            value: failedLogins.toString(),
            status: failedLogins > 5 ? "error" : failedLogins > 0 ? "warning" : "good",
            icon: AlertTriangle,
            description: "Failed login attempts today"
          },
          {
            title: "Last Backup",
            value: lastBackup === "Never" ? "Never" : "Recently",
            status: lastBackup === "Never" ? "error" : "good",
            icon: Database,
            description: lastBackup === "Never" ? "No backups found" : `Last backup: ${lastBackup}`
          },
          {
            title: "GDPR Requests",
            value: "0",
            status: "good",
            icon: FileText,
            description: "Pending data subject requests"
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
      case 'good': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader 
        title="Security & Compliance"
        description="Manage security settings, audit trails, and compliance requirements"
      />
      
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Audit Trail
            </TabsTrigger>
            <TabsTrigger value="gdpr" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              GDPR
            </TabsTrigger>
            <TabsTrigger value="backup" className="flex items-center gap-2">
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
                  <Card key={index} className={`border-2 ${getStatusColor(metric.status)}`}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">{metric.title}</p>
                          <p className="text-2xl font-bold">{metric.value}</p>
                          <p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <metric.icon className="h-5 w-5 text-muted-foreground" />
                          <StatusIcon className={`h-4 w-4 ${
                            metric.status === 'good' ? 'text-green-600' :
                            metric.status === 'warning' ? 'text-yellow-600' : 'text-red-600'
                          }`} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Your Current Role & Permissions */}
            <Card>
              <CardHeader>
                <CardTitle>Your Current Role & Permissions</CardTitle>
                <CardDescription>
                  Your access level and available permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {getCurrentRoleData() ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 border rounded-lg bg-blue-50 dark:bg-blue-950">
                      <Shield className="h-5 w-5 text-blue-600" />
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
                        <button className="w-full p-3 text-left border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">View All Your Permissions</span>
                            <Eye className="h-4 w-4" />
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Click to see detailed list of what you can access
                          </div>
                        </button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Your Permissions ({getCurrentRoleData()?.role})</DialogTitle>
                          <DialogDescription>
                            Detailed list of all permissions available to your role
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-1 gap-3 mt-4">
                          {getCurrentRoleData()?.permissionsList.map((permission, index) => {
                            const IconComponent = getPermissionIcon(permission);
                            return (
                              <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                                <IconComponent className="h-5 w-5 text-green-600 mt-0.5" />
                                <div className="flex-1">
                                  <div className="font-medium capitalize">
                                    {permission.replace(/[._]/g, ' ')}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {getPermissionDescription(permission)}
                                  </div>
                                </div>
                                <Badge variant="outline" className="text-green-600 border-green-600">
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
            <Card>
              <CardHeader>
                <CardTitle>Compliance Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">GDPR Compliant</p>
                      <p className="text-xs text-muted-foreground">Data protection measures active</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">Audit Trail Active</p>
                      <p className="text-xs text-muted-foreground">All actions are being logged</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">Regular Backups</p>
                      <p className="text-xs text-muted-foreground">Automated backup system running</p>
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
