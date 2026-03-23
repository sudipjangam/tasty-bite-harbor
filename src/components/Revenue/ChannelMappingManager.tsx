
import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowRight, Link2, RefreshCw, Trash2, Plus, 
  CheckCircle, AlertCircle, BedDouble, Globe 
} from "lucide-react";

interface RoomMapping {
  id: string;
  restaurant_id: string;
  channel_id: string;
  hms_room_type: string;
  hms_room_type_id: string;
  ota_room_type_id: string;
  ota_rate_plan_id: string;
  ota_room_name: string;
  is_active: boolean;
  created_at: string;
}

interface Room {
  id: string;
  name: string;
  capacity: number;
  price: number;
}

const ChannelMappingManager = () => {
  const { restaurantId } = useRestaurantId();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState("");
  const [formData, setFormData] = useState({
    hms_room_id: "",
    ota_room_type_id: "",
    ota_rate_plan_id: "",
    ota_room_name: "",
  });

  // Fetch rooms
  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms-mapping", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data } = await supabase
        .from("rooms")
        .select("id, name, capacity, price")
        .eq("restaurant_id", restaurantId)
        .order("name");
      return (data || []) as Room[];
    },
    enabled: !!restaurantId,
  });

  // Fetch active OTA credentials (channels with credentials)
  const { data: otaChannels = [] } = useQuery({
    queryKey: ["ota-channels-mapping", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data } = await supabase
        .from("ota_credentials")
        .select("id, ota_name, channel_id, is_active, auth_type")
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true);
      return data || [];
    },
    enabled: !!restaurantId,
  });

  // Fetch existing mappings
  const { data: mappings = [], isLoading, refetch } = useQuery({
    queryKey: ["channel-mappings", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from("channel_room_mapping")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as RoomMapping[];
    },
    enabled: !!restaurantId,
  });

  // Group mappings by channel
  const mappingsByChannel = useMemo(() => {
    const grouped = new Map<string, RoomMapping[]>();
    mappings.forEach(m => {
      const existing = grouped.get(m.channel_id) || [];
      existing.push(m);
      grouped.set(m.channel_id, existing);
    });
    return grouped;
  }, [mappings]);

  // Create mapping
  const createMapping = useMutation({
    mutationFn: async () => {
      if (!restaurantId) throw new Error("No restaurant");
      const room = rooms.find(r => r.id === formData.hms_room_id);
      if (!room) throw new Error("Room not found");

      const { data, error } = await supabase
        .from("channel_room_mapping")
        .insert([{
          restaurant_id: restaurantId,
          channel_id: selectedChannelId || null,
          hms_room_type: room.name,
          hms_room_type_id: room.id,
          ota_room_type_id: formData.ota_room_type_id,
          ota_rate_plan_id: formData.ota_rate_plan_id || "default",
          ota_room_name: formData.ota_room_name || room.name,
          is_active: true,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channel-mappings"] });
      toast({ title: "✅ Room Mapped!", description: "Room mapping saved successfully" });
      setAddDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Failed", description: error.message });
    },
  });

  // Delete mapping
  const deleteMapping = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("channel_room_mapping").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channel-mappings"] });
      toast({ title: "Mapping removed" });
    },
  });

  // Auto-map: create mappings for all rooms with same name as OTA room ID
  const autoMapRooms = useMutation({
    mutationFn: async (channelId: string) => {
      if (!restaurantId) throw new Error("No restaurant");
      const existingForChannel = mappings.filter(m => m.channel_id === channelId);
      const unmappedRooms = rooms.filter(
        r => !existingForChannel.some(m => m.hms_room_type_id === r.id)
      );

      if (unmappedRooms.length === 0) throw new Error("All rooms already mapped");

      const newMappings = unmappedRooms.map(room => ({
        restaurant_id: restaurantId,
        channel_id: channelId,
        hms_room_type: room.name,
        hms_room_type_id: room.id,
        ota_room_type_id: room.id, // same ID as local for now
        ota_rate_plan_id: "default",
        ota_room_name: room.name,
        is_active: true,
      }));

      const { error } = await supabase.from("channel_room_mapping").insert(newMappings);
      if (error) throw error;
      return newMappings.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["channel-mappings"] });
      toast({ title: "✅ Auto-Mapped!", description: `${count} rooms mapped automatically` });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Failed", description: error.message });
    },
  });

  const resetForm = () => {
    setFormData({ hms_room_id: "", ota_room_type_id: "", ota_rate_plan_id: "", ota_room_name: "" });
    setSelectedChannelId("");
  };

  const getOtaDisplayName = (name: string) => {
    const names: Record<string, string> = {
      mmt: "MakeMyTrip", makemytrip: "MakeMyTrip",
      goibibo: "Goibibo", booking_com: "Booking.com",
      "booking.com": "Booking.com", agoda: "Agoda", expedia: "Expedia",
    };
    return names[name.toLowerCase()] || name;
  };

  const getOtaColor = (name: string) => {
    const colors: Record<string, string> = {
      mmt: "bg-blue-500", makemytrip: "bg-blue-500",
      goibibo: "bg-red-500", booking_com: "bg-blue-700",
      "booking.com": "bg-blue-700", agoda: "bg-red-600", expedia: "bg-yellow-500",
    };
    return colors[name.toLowerCase()] || "bg-gray-500";
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="standardized-card-glass">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5">
                <Link2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Channel Room Mapping</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Link your rooms to OTA room IDs for synchronized availability and rates
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-1" /> Refresh
              </Button>
              <Button onClick={() => setAddDialogOpen(true)} className="bg-gradient-to-r from-primary to-primary/80">
                <Plus className="w-4 h-4 mr-1" /> Map Room
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-200/50 text-center">
              <div className="text-2xl font-bold text-emerald-600">{mappings.length}</div>
              <div className="text-xs text-muted-foreground">Total Mappings</div>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-200/50 text-center">
              <div className="text-2xl font-bold text-blue-600">{rooms.length}</div>
              <div className="text-xs text-muted-foreground">Your Rooms</div>
            </div>
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-200/50 text-center">
              <div className="text-2xl font-bold text-purple-600">{otaChannels.length}</div>
              <div className="text-xs text-muted-foreground">Connected OTAs</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auto-Map Section */}
      {otaChannels.length > 0 && (
        <Card className="standardized-card-elevated border-dashed border-primary/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Globe className="w-5 h-5 text-primary" />
              <span className="font-semibold">Quick Auto-Map</span>
              <span className="text-xs text-muted-foreground">
                Automatically map all your rooms to an OTA channel
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {otaChannels.map((ch: any) => {
                const mapped = mappings.filter(m => m.channel_id === ch.channel_id).length;
                return (
                  <Button
                    key={ch.id}
                    variant="outline"
                    size="sm"
                    onClick={() => ch.channel_id && autoMapRooms.mutate(ch.channel_id)}
                    disabled={autoMapRooms.isPending}
                    className="gap-2"
                  >
                    <div className={`w-2.5 h-2.5 rounded-full ${getOtaColor(ch.ota_name)}`} />
                    {getOtaDisplayName(ch.ota_name)}
                    {mapped > 0 && (
                      <Badge variant="secondary" className="ml-1 text-[10px]">
                        {mapped} mapped
                      </Badge>
                    )}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mapping List */}
      {isLoading ? (
        <Card className="standardized-card-glass">
          <CardContent className="flex items-center justify-center min-h-[200px]">
            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      ) : mappings.length === 0 ? (
        <Card className="standardized-card-glass">
          <CardContent className="flex flex-col items-center justify-center min-h-[200px] gap-3">
            <BedDouble className="w-12 h-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">No room mappings yet</p>
            <p className="text-xs text-muted-foreground">
              Use "Auto-Map" above or click "Map Room" to manually link your rooms to OTA room IDs
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {Array.from(mappingsByChannel.entries()).map(([channelId, channelMappings]) => {
            const ota = otaChannels.find((c: any) => c.channel_id === channelId);
            const otaName = ota ? getOtaDisplayName((ota as any).ota_name) : "Direct";
            
            return (
              <Card key={channelId || "direct"} className="standardized-card-glass">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${ota ? getOtaColor((ota as any).ota_name) : "bg-gray-400"}`} />
                    <CardTitle className="text-base">{otaName}</CardTitle>
                    <Badge variant="secondary" className="ml-auto">{channelMappings.length} rooms</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {channelMappings.map((mapping) => (
                      <div key={mapping.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors group">
                        <div className="flex-1 flex items-center gap-3">
                          <div className="flex items-center gap-2 flex-1">
                            <BedDouble className="w-4 h-4 text-primary shrink-0" />
                            <div>
                              <span className="font-medium text-sm">{mapping.hms_room_type}</span>
                              <span className="text-[10px] text-muted-foreground block">ID: {mapping.hms_room_type_id.substring(0, 8)}…</span>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div className="flex items-center gap-2 flex-1">
                            <Globe className="w-4 h-4 text-blue-500 shrink-0" />
                            <div>
                              <span className="font-medium text-sm">{mapping.ota_room_name || mapping.ota_room_type_id}</span>
                              <span className="text-[10px] text-muted-foreground block">OTA ID: {mapping.ota_room_type_id.substring(0, 12)}…</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {mapping.is_active ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700"
                            onClick={() => deleteMapping.mutate(mapping.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Mapping Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-primary" />
              Map Room to OTA
            </DialogTitle>
            <DialogDescription>
              Link your local room to an OTA room type ID for syncing
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="font-semibold">Your Room</Label>
              <Select value={formData.hms_room_id} onValueChange={v => setFormData(p => ({ ...p, hms_room_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a room" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map(room => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.name} (Cap: {room.capacity} · ₹{Number(room.price).toLocaleString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="font-semibold">OTA Channel</Label>
              <Select value={selectedChannelId} onValueChange={setSelectedChannelId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select OTA channel" />
                </SelectTrigger>
                <SelectContent>
                  {otaChannels.map((ch: any) => (
                    <SelectItem key={ch.id} value={ch.channel_id || ch.id}>
                      {getOtaDisplayName(ch.ota_name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="font-semibold">OTA Room Type ID <span className="text-red-500">*</span></Label>
              <Input
                value={formData.ota_room_type_id}
                onChange={e => setFormData(p => ({ ...p, ota_room_type_id: e.target.value }))}
                placeholder="e.g., 12345 or deluxe_king"
              />
              <p className="text-[10px] text-muted-foreground">
                Find this in your OTA extranet under room/inventory settings
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="font-semibold">Rate Plan ID</Label>
                <Input
                  value={formData.ota_rate_plan_id}
                  onChange={e => setFormData(p => ({ ...p, ota_rate_plan_id: e.target.value }))}
                  placeholder="BAR, default"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">OTA Room Name</Label>
                <Input
                  value={formData.ota_room_name}
                  onChange={e => setFormData(p => ({ ...p, ota_room_name: e.target.value }))}
                  placeholder="Deluxe King"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddDialogOpen(false); resetForm(); }}>Cancel</Button>
            <Button
              onClick={() => createMapping.mutate()}
              disabled={!formData.hms_room_id || !formData.ota_room_type_id || createMapping.isPending}
              className="bg-gradient-to-r from-primary to-primary/80"
            >
              {createMapping.isPending ? (
                <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                <><Link2 className="w-4 h-4 mr-2" /> Save Mapping</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChannelMappingManager;
