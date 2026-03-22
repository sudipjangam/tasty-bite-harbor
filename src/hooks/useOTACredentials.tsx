
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRestaurantId } from "@/hooks/useRestaurantId";

export interface OTACredential {
  id: string;
  restaurant_id: string;
  channel_id: string | null;
  ota_name: string;
  username: string | null;
  password_encrypted: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expiry: string | null;
  api_endpoint: string | null;
  auth_type: string;
  extra_config: Record<string, any>;
  connection_status: string;
  last_tested_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SyncLog {
  id: string;
  restaurant_id: string;
  channel_id: string | null;
  sync_type: string;
  direction: string;
  status: string;
  records_processed: number;
  records_failed: number;
  error_details: any[];
  request_payload: any;
  response_payload: any;
  http_status_code: number | null;
  duration_ms: number | null;
  triggered_by: string;
  started_at: string;
  completed_at: string | null;
}

export interface OTABooking {
  id: string;
  restaurant_id: string;
  channel_id: string;
  ota_booking_id: string;
  ota_name: string;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  check_in: string;
  check_out: string;
  room_type: string;
  room_count: number;
  adults: number;
  children: number;
  total_amount: number | null;
  commission_amount: number | null;
  net_amount: number | null;
  currency: string;
  booking_status: string;
  payment_status: string;
  payment_mode: string | null;
  special_requests: string | null;
  raw_payload: any;
  synced_to_pms: boolean;
  created_at: string;
  updated_at: string;
}

export const useOTACredentials = () => {
  const { restaurantId } = useRestaurantId();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch OTA credentials
  const { data: credentials = [], isLoading: isLoadingCredentials } = useQuery({
    queryKey: ["ota-credentials", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from("ota_credentials")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("ota_name");
      if (error) throw error;
      return data as OTACredential[];
    },
    enabled: !!restaurantId,
  });

  // Save credential (create or update)
  const saveCredential = useMutation({
    mutationFn: async (credential: Partial<OTACredential> & { password?: string }) => {
      if (!restaurantId) throw new Error("No restaurant ID");

      const payload = {
        restaurant_id: restaurantId,
        ota_name: credential.ota_name,
        channel_id: credential.channel_id || null,
        username: credential.username || null,
        password_encrypted: credential.password || credential.password_encrypted || null,
        access_token: credential.access_token || null,
        refresh_token: credential.refresh_token || null,
        token_expiry: credential.token_expiry || null,
        api_endpoint: credential.api_endpoint || null,
        auth_type: credential.auth_type || 'token',
        extra_config: credential.extra_config || {},
        is_active: credential.is_active ?? true,
      };

      if (credential.id) {
        const { data, error } = await supabase
          .from("ota_credentials")
          .update(payload)
          .eq("id", credential.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("ota_credentials")
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ota-credentials"] });
      toast({ title: "Success", description: "OTA credentials saved securely" });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error", description: `Failed to save credentials: ${error.message}` });
    },
  });

  // Delete credential
  const deleteCredential = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ota_credentials")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ota-credentials"] });
      toast({ title: "Deleted", description: "OTA credentials removed" });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error", description: `Failed to delete: ${error.message}` });
    },
  });

  // Test connection
  const testConnection = useMutation({
    mutationFn: async (credentialId: string) => {
      if (!restaurantId) throw new Error("No restaurant ID");

      // Update status to testing
      await supabase
        .from("ota_credentials")
        .update({ connection_status: 'testing', last_tested_at: new Date().toISOString() })
        .eq("id", credentialId);

      // Call the sync-channels function in test mode
      const { data, error } = await supabase.functions.invoke('sync-channels', {
        body: {
          restaurantId,
          syncType: 'all',
          testMode: true,
          triggeredBy: 'user',
        }
      });

      // Update connection status based on result
      const status = data?.success ? 'connected' : 'error';
      await supabase
        .from("ota_credentials")
        .update({ 
          connection_status: status, 
          last_tested_at: new Date().toISOString() 
        })
        .eq("id", credentialId);

      if (error) throw error;
      return { ...data, status };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ota-credentials"] });
      toast({
        title: data.status === 'connected' ? "✅ Connected!" : "⚠️ Connection Issue",
        description: data.status === 'connected' 
          ? "OTA connection test successful" 
          : "Connection test failed — check credentials",
        variant: data.status === 'connected' ? 'default' : 'destructive',
      });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Connection Failed", description: error.message });
    },
  });

  // Fetch sync logs
  const { data: syncLogs = [], isLoading: isLoadingSyncLogs } = useQuery({
    queryKey: ["sync-logs", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from("sync_logs")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("started_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as SyncLog[];
    },
    enabled: !!restaurantId,
    refetchInterval: 10000, // auto-refresh every 10 seconds
  });

  // Fetch OTA bookings
  const { data: otaBookings = [], isLoading: isLoadingOTABookings } = useQuery({
    queryKey: ["ota-bookings", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from("ota_bookings")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as OTABooking[];
    },
    enabled: !!restaurantId,
    refetchInterval: 15000,
  });

  return {
    credentials,
    isLoadingCredentials,
    saveCredential,
    deleteCredential,
    testConnection,
    syncLogs,
    isLoadingSyncLogs,
    otaBookings,
    isLoadingOTABookings,
  };
};
