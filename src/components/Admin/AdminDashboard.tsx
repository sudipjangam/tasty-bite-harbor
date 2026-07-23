import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RestaurantManagement } from "./RestaurantManagement";
import { GlobalUserManagement } from "./GlobalUserManagement";
import { WhatsAppProviderAdmin } from "./WhatsAppProviderAdmin";
import { DatabaseSync } from "./DatabaseSync";
import { Building2, Users, MessageCircle, Database } from "lucide-react";

export const AdminDashboard = () => {
  return (
    <Tabs defaultValue="restaurants" className="space-y-4">
      <TabsList>
        <TabsTrigger value="restaurants" className="space-x-2">
          <Building2 className="h-4 w-4" />
          <span>Restaurants</span>
        </TabsTrigger>
        <TabsTrigger value="users" className="space-x-2">
          <Users className="h-4 w-4" />
          <span>Users</span>
        </TabsTrigger>
        <TabsTrigger value="whatsapp" className="space-x-2">
          <MessageCircle className="h-4 w-4" />
          <span>WhatsApp</span>
        </TabsTrigger>
        <TabsTrigger value="db-sync" className="space-x-2">
          <Database className="h-4 w-4" />
          <span>Database Sync</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="restaurants" className="space-y-4">
        <RestaurantManagement />
      </TabsContent>

      <TabsContent value="users" className="space-y-4">
        <GlobalUserManagement />
      </TabsContent>

      <TabsContent value="whatsapp" className="space-y-4">
        <WhatsAppProviderAdmin />
      </TabsContent>

      <TabsContent value="db-sync" className="space-y-4">
        <DatabaseSync />
      </TabsContent>
    </Tabs>
  );
};

