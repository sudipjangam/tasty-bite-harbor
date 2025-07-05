
import React, { useState } from "react";
import { PageHeader } from "@/components/Layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AuditTrail } from "@/components/Security/AuditTrail";
import { GDPRCompliance } from "@/components/Security/GDPRCompliance";
import { BackupRecovery } from "@/components/Security/BackupRecovery";
import { RoleBadge } from "@/components/ui/role-badge";
import { useAuth } from "@/hooks/useAuth";
import { 
  Shield, 
  Users, 
  FileText, 
  Database, 
  AlertTriangle,
  CheckCircle,
  Clock
} from "lucide-react";

const Security = () => {
  const { user, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  const securityMetrics = [
    {
      title: "Active Users",
      value: "42",
      status: "good",
      icon: Users,
      description: "Currently active user sessions"
    },
    {
      title: "Failed Logins",
      value: "3",
      status: "warning",
      icon: AlertTriangle,
      description: "Failed login attempts today"
    },
    {
      title: "Last Backup",
      value: "2 hours ago",
      status: "good",
      icon: Database,
      description: "Most recent successful backup"
    },
    {
      title: "GDPR Requests",
      value: "0",
      status: "good",
      icon: FileText,
      description: "Pending data subject requests"
    }
  ];

  const rolePermissions = [
    { role: "owner", permissions: 28, access: "Full System Access" },
    { role: "admin", permissions: 28, access: "Full System Access" },
    { role: "manager", permissions: 18, access: "Operations & Management" },
    { role: "chef", permissions: 8, access: "Kitchen & Menu Operations" },
    { role: "waiter", permissions: 12, access: "Service Operations" },
    { role: "staff", permissions: 12, access: "Service Operations" },
    { role: "viewer", permissions: 7, access: "Read-Only Access" }
  ];

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

            {/* Role-Based Access Control Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Role-Based Access Control</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rolePermissions.map((roleData, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <RoleBadge role={roleData.role as any} />
                          <Badge variant="outline">{roleData.permissions} permissions</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{roleData.access}</p>
                      </div>
                    ))}
                  </div>
                  
                  {user && (
                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                        Your Current Role & Permissions
                      </h4>
                      <div className="flex items-center gap-4">
                        <RoleBadge role={user.role} />
                        <span className="text-sm text-blue-700 dark:text-blue-300">
                          You have access to {rolePermissions.find(r => r.role === user.role)?.permissions} system permissions
                        </span>
                      </div>
                    </div>
                  )}
                </div>
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
