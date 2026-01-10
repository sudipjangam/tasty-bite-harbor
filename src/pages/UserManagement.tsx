import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { RoleGuard } from "@/components/Auth/PermissionGuard";
import { UserManagementDashboard } from "@/components/UserManagement/UserManagementDashboard";
import { RoleManagementDashboard } from "@/components/RoleManagement/RoleManagementDashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Shield, Sparkles, KeyRound } from "lucide-react";
import { ErrorBoundary } from "@/components/ui/error-boundary";

/**
 * User & Access Management Page
 * Combines User Management and Role Management into a single unified page
 */
const UserAccessManagement = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Get active tab from URL query parameter
  const searchParams = new URLSearchParams(location.search);
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(
    tabFromUrl === "roles" ? "roles" : "users"
  );

  // Update URL when tab changes
  useEffect(() => {
    if (activeTab === "users") {
      navigate("/user-management", { replace: true });
    } else if (activeTab === "roles") {
      navigate("/user-management?tab=roles", { replace: true });
    }
  }, [activeTab, navigate]);

  return (
    <RoleGuard roles={["admin", "owner"]} requireAll={false} showError>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-950 dark:via-blue-950/50 dark:to-indigo-950 p-6">
        {/* Modern Header with Glass Effect */}
        <div className="mb-8 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/20 dark:border-blue-500/20 rounded-3xl shadow-xl dark:shadow-blue-500/10 p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 rounded-2xl shadow-lg shadow-blue-500/30 dark:shadow-blue-500/50">
                <KeyRound className="h-8 w-8 text-white drop-shadow-lg" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  User & Access Management
                </h1>
                <p className="text-gray-600 dark:text-gray-300 text-lg mt-2 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-blue-500" />
                  Manage users, roles, and access permissions
                </p>
              </div>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="overflow-x-auto pb-2 mb-6">
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/20 dark:border-blue-500/20 rounded-3xl shadow-xl dark:shadow-blue-500/10 p-2">
              <TabsList className="inline-flex w-auto min-w-full md:w-auto space-x-1 p-1 bg-transparent rounded-2xl">
                <TabsTrigger
                  value="users"
                  className="whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/30 px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  <Users className="h-4 w-4" />
                  Users
                </TabsTrigger>
                <TabsTrigger
                  value="roles"
                  className="whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/30 px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400"
                >
                  <Shield className="h-4 w-4" />
                  Roles & Permissions
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent value="users" className="animate-in fade-in">
            <ErrorBoundary>
              <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/20 dark:border-blue-500/20 rounded-3xl shadow-xl dark:shadow-blue-500/10 p-8">
                <UserManagementDashboard />
              </div>
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="roles" className="animate-in fade-in">
            <ErrorBoundary>
              <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/20 dark:border-blue-500/20 rounded-3xl shadow-xl dark:shadow-blue-500/10 p-8">
                <RoleManagementDashboard />
              </div>
            </ErrorBoundary>
          </TabsContent>
        </Tabs>
      </div>
    </RoleGuard>
  );
};

export default UserAccessManagement;
