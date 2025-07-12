import { useAuth } from "@/hooks/useAuth";
import { RoleGuard } from "@/components/Auth/PermissionGuard";
import { UserManagementDashboard } from "@/components/UserManagement/UserManagementDashboard";

const UserManagement = () => {
  const { user } = useAuth();

  return (
    <RoleGuard roles={["admin", "owner"]} requireAll={false} showError>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
        </div>
        <UserManagementDashboard />
      </div>
    </RoleGuard>
  );
};

export default UserManagement;