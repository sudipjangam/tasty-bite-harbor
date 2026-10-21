import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { AdminDashboard } from "@/components/Admin/AdminDashboard";

const AdminPanel = () => {
  const { user } = useAuth();
  const roleName = (user?.role_name_text || user?.role || "").toLowerCase();
  const isPlatformSuperAdmin =
    roleName === "superadmin" ||
    roleName === "super_admin" ||
    roleName === "platform_admin" ||
    roleName === "platform admin" ||
    (roleName === "admin" && !user?.restaurant_id);

  if (!isPlatformSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
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
  );
};

export default AdminPanel;
