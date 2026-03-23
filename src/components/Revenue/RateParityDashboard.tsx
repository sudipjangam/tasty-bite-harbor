
import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import {
  AlertTriangle, CheckCircle, RefreshCw, TrendingUp, TrendingDown,
  Scale, BarChart3, Search
} from "lucide-react";

interface ParityCheck {
  roomName: string;
  roomId: string;
  baseRate: number;
  channels: {
    name: string;
    rate: number;
    difference: number;
    differencePercent: number;
    status: "match" | "higher" | "lower" | "critical";
  }[];
}

const RateParityDashboard = () => {
  const { restaurantId } = useRestaurantId();
  const [searchTerm, setSearchTerm] = useState("");
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  // Fetch all rooms
  const { data: rooms = [] } = useQuery({
    queryKey: ["parity-rooms", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data } = await supabase
        .from("rooms")
        .select("id, name, price")
        .eq("restaurant_id", restaurantId)
        .order("name");
      return data || [];
    },
    enabled: !!restaurantId,
  });

  // Fetch channel mappings
  const { data: mappings = [] } = useQuery({
    queryKey: ["parity-mappings", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data } = await supabase
        .from("channel_room_mapping")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true);
      return data || [];
    },
    enabled: !!restaurantId,
  });

  // Fetch OTA credentials
  const { data: otaCredentials = [] } = useQuery({
    queryKey: ["parity-ota-creds", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data } = await supabase
        .from("ota_credentials")
        .select("id, ota_name, channel_id")
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true);
      return data || [];
    },
    enabled: !!restaurantId,
  });

  // Fetch channel rate rules
  const { data: rateRules = [] } = useQuery({
    queryKey: ["parity-rate-rules", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data } = await supabase
        .from("channel_rate_rules")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true);
      return data || [];
    },
    enabled: !!restaurantId,
  });

  // Fetch booking channels for commission rates
  const { data: channels = [] } = useQuery({
    queryKey: ["parity-channels", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data } = await supabase
        .from("booking_channels")
        .select("id, channel_name, commission_rate, is_active")
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true);
      return data || [];
    },
    enabled: !!restaurantId,
  });

  // Fetch recent parity check records
  const { data: parityRecords = [], refetch: refreshParity } = useQuery({
    queryKey: ["rate-parity-checks", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data } = await supabase
        .from("rate_parity_checks")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("checked_at", { ascending: false })
        .limit(100);
      return data || [];
    },
    enabled: !!restaurantId,
  });

  // Calculate parity analysis
  const parityAnalysis: ParityCheck[] = useMemo(() => {
    return rooms.map(room => {
      const baseRate = Number(room.price) || 0;
      const roomMappings = mappings.filter(m => m.hms_room_type_id === room.id);

      const channelRates = roomMappings.map(mapping => {
        const channel = channels.find(c => c.id === mapping.channel_id);
        const ota = otaCredentials.find(c => c.channel_id === mapping.channel_id);
        const rules = rateRules.filter(r => r.channel_id === mapping.channel_id);

        let adjustedRate = baseRate;

        // Apply rate rules
        rules.forEach(rule => {
          const ruleAny = rule as any;
          switch (ruleAny.rule_type) {
            case "markup":
              adjustedRate = ruleAny.is_percentage
                ? adjustedRate * (1 + Number(ruleAny.value) / 100)
                : adjustedRate + Number(ruleAny.value);
              break;
            case "markdown":
              adjustedRate = ruleAny.is_percentage
                ? adjustedRate * (1 - Number(ruleAny.value) / 100)
                : adjustedRate - Number(ruleAny.value);
              break;
            case "commission_offset":
              adjustedRate = adjustedRate * (1 + Number(ruleAny.value) / 100);
              break;
          }
        });

        // Add commission offset
        const commission = channel?.commission_rate || 0;
        const effectiveRate = Math.round(adjustedRate * (1 + commission / 100));

        const difference = effectiveRate - baseRate;
        const differencePercent = baseRate > 0 ? ((effectiveRate - baseRate) / baseRate) * 100 : 0;
        
        let status: "match" | "higher" | "lower" | "critical";
        if (Math.abs(differencePercent) < 1) status = "match";
        else if (differencePercent > 10) status = "critical";
        else if (differencePercent > 0) status = "higher";
        else status = "lower";

        const channelName = channel?.channel_name || (ota as any)?.ota_name || "Unknown";

        return {
          name: channelName,
          rate: effectiveRate,
          difference,
          differencePercent: Math.round(differencePercent * 10) / 10,
          status,
        };
      });

      return {
        roomName: room.name,
        roomId: room.id,
        baseRate,
        channels: channelRates,
      };
    }).filter(p => p.channels.length > 0);
  }, [rooms, mappings, otaCredentials, rateRules, channels]);

  const filteredParity = useMemo(() => {
    if (!searchTerm.trim()) return parityAnalysis;
    return parityAnalysis.filter(p => 
      p.roomName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [parityAnalysis, searchTerm]);

  // Summary stats
  const stats = useMemo(() => {
    const allChannels = parityAnalysis.flatMap(p => p.channels);
    return {
      total: allChannels.length,
      match: allChannels.filter(c => c.status === "match").length,
      higher: allChannels.filter(c => c.status === "higher").length,
      lower: allChannels.filter(c => c.status === "lower").length,
      critical: allChannels.filter(c => c.status === "critical").length,
      parityScore: allChannels.length > 0
        ? Math.round((allChannels.filter(c => c.status === "match").length / allChannels.length) * 100)
        : 100,
    };
  }, [parityAnalysis]);

  const handleRefresh = () => {
    refreshParity();
    setLastChecked(new Date());
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "match": return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case "higher": return <TrendingUp className="w-4 h-4 text-amber-500" />;
      case "lower": return <TrendingDown className="w-4 h-4 text-blue-500" />;
      case "critical": return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "match": return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-0">Parity ✓</Badge>;
      case "higher": return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-0">Higher</Badge>;
      case "lower": return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-0">Lower</Badge>;
      case "critical": return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-0">Critical ⚠</Badge>;
      default: return null;
    }
  };

  const getOtaDisplayName = (name: string) => {
    const names: Record<string, string> = {
      mmt: "MakeMyTrip", makemytrip: "MakeMyTrip",
      goibibo: "Goibibo", booking_com: "Booking.com",
      "booking.com": "Booking.com", agoda: "Agoda", expedia: "Expedia",
    };
    return names[name.toLowerCase()] || name.charAt(0).toUpperCase() + name.slice(1);
  };

  return (
    <div className="space-y-6">
      {/* Parity Score Header */}
      <Card className="standardized-card-glass overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5" />
        <CardHeader className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5">
                <Scale className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Rate Parity Monitor</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Compare your base rates against effective OTA selling prices
                </p>
              </div>
            </div>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-1" /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="relative">
          <div className="grid grid-cols-5 gap-4">
            {/* Parity Score */}
            <div className="col-span-1 flex flex-col items-center justify-center">
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle cx="48" cy="48" r="40" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/20" />
                  <circle cx="48" cy="48" r="40" fill="none" strokeWidth="6"
                    strokeDasharray={`${stats.parityScore * 2.51} 251`}
                    strokeLinecap="round"
                    className={stats.parityScore >= 80 ? "text-emerald-500" : stats.parityScore >= 50 ? "text-amber-500" : "text-red-500"}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold">{stats.parityScore}%</span>
                </div>
              </div>
              <span className="text-xs text-muted-foreground mt-1">Parity Score</span>
            </div>

            {/* Stats */}
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-200/50 text-center">
              <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
              <div className="text-2xl font-bold text-emerald-600">{stats.match}</div>
              <div className="text-xs text-muted-foreground">At Parity</div>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-200/50 text-center">
              <TrendingUp className="w-5 h-5 text-amber-500 mx-auto mb-1" />
              <div className="text-2xl font-bold text-amber-600">{stats.higher}</div>
              <div className="text-xs text-muted-foreground">Higher</div>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-200/50 text-center">
              <TrendingDown className="w-5 h-5 text-blue-500 mx-auto mb-1" />
              <div className="text-2xl font-bold text-blue-600">{stats.lower}</div>
              <div className="text-xs text-muted-foreground">Lower</div>
            </div>
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-200/50 text-center">
              <AlertTriangle className="w-5 h-5 text-red-500 mx-auto mb-1" />
              <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
              <div className="text-xs text-muted-foreground">Critical</div>
            </div>
          </div>

          {lastChecked && (
            <p className="text-xs text-muted-foreground mt-3 text-right">
              Last checked: {lastChecked.toLocaleTimeString()}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search rooms..."
          className="pl-10"
        />
      </div>

      {/* Parity Table */}
      {filteredParity.length === 0 ? (
        <Card className="standardized-card-glass">
          <CardContent className="flex flex-col items-center justify-center min-h-[200px] gap-3">
            <BarChart3 className="w-12 h-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">
              {rooms.length === 0 ? "No rooms found" :
               mappings.length === 0 ? "No channel mappings yet — map rooms first" :
               "No parity data to show"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredParity.map(room => (
            <Card key={room.roomId} className="standardized-card-glass hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Room Info */}
                  <div className="min-w-[180px]">
                    <h3 className="font-semibold text-base">{room.roomName}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">Base Rate:</span>
                      <span className="font-bold text-primary">₹{room.baseRate.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Channel Comparisons */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {room.channels.map((ch, idx) => (
                      <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        ch.status === "match" ? "bg-emerald-50/50 border-emerald-200/50 dark:bg-emerald-900/10 dark:border-emerald-800/50" :
                        ch.status === "critical" ? "bg-red-50/50 border-red-200/50 dark:bg-red-900/10 dark:border-red-800/50" :
                        ch.status === "higher" ? "bg-amber-50/50 border-amber-200/50 dark:bg-amber-900/10 dark:border-amber-800/50" :
                        "bg-blue-50/50 border-blue-200/50 dark:bg-blue-900/10 dark:border-blue-800/50"
                      }`}>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(ch.status)}
                          <div>
                            <span className="text-sm font-medium">{getOtaDisplayName(ch.name)}</span>
                            <div className="text-sm font-bold">₹{ch.rate.toLocaleString()}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          {getStatusBadge(ch.status)}
                          <div className={`text-xs mt-1 font-medium ${
                            ch.differencePercent > 0 ? "text-amber-600" :
                            ch.differencePercent < 0 ? "text-blue-600" :
                            "text-emerald-600"
                          }`}>
                            {ch.differencePercent > 0 ? "+" : ""}{ch.differencePercent}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Parity History */}
      {parityRecords.length > 0 && (
        <Card className="standardized-card-glass">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Recent Parity Checks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {parityRecords.slice(0, 20).map((record: any) => (
                <div key={record.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm">
                  <div className="flex items-center gap-2">
                    {record.parity_status === "in_parity" ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    )}
                    <span>{record.room_type}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">
                      Base: ₹{Number(record.base_rate || 0).toLocaleString()} →
                      OTA: ₹{Number(record.ota_rate || 0).toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(record.checked_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RateParityDashboard;
