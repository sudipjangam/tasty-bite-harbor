import { RoleGuard } from "@/components/Auth/PermissionGuard";
import { AdminDashboard } from "@/components/Admin/AdminDashboard";

const AdminPanel = () => {
  return (
    <RoleGuard roles={["admin"]} requireAll={false} showError>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Admin Panel</h2>
            <p className="text-muted-foreground">
              Manage restaurants and users across the platform
            </p>
          </div>
        </div>
        <AdminDashboard />
      </div>
    </RoleGuard>
  );
};

export default AdminPanel;
