import { RoleManagementDashboard } from '@/components/RoleManagement/RoleManagementDashboard';
import { RoleGuard } from '@/components/Auth/PermissionGuard';

const RoleManagement = () => {
  return (
    <RoleGuard roles={['admin', 'owner']} requireAll={false} showError>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <RoleManagementDashboard />
      </div>
    </RoleGuard>
  );
};

export default RoleManagement;