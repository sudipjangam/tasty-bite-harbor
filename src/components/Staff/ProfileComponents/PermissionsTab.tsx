
import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import type { StaffRole } from "@/types/staff";

interface PermissionsTabProps {
  roles: StaffRole[];
}

export const PermissionsTab: React.FC<PermissionsTabProps> = ({ roles }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Permissions & Roles</CardTitle>
        <CardDescription>
          Manage staff roles and system permissions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <h3 className="font-medium text-lg mb-4">Assigned Roles</h3>
            {roles.length === 0 ? (
              <div className="text-center py-8">
                <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <h3 className="text-lg font-medium">No roles defined</h3>
                <p className="text-muted-foreground">
                  No roles have been created for your restaurant yet.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {roles.map((role) => (
                  <Card key={role.id}>
                    <CardHeader className="py-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{role.name}</CardTitle>
                        <Button variant="ghost" size="sm">
                          Assign
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="py-3">
                      <div className="text-sm text-muted-foreground">
                        {role.permissions?.length > 0 
                          ? `${role.permissions.length} permissions assigned` 
                          : "No permissions assigned"}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
