import React, { useState, useEffect } from "react";
import { useDeliveryConfig, DeliveryZone } from "@/hooks/useDeliveryConfig";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Truck,
  MapPin,
  Save,
  Plus,
  Trash2,
  Navigation,
  Loader2,
  AlertTriangle,
} from "lucide-react";

export const DeliverySettings: React.FC = () => {
  const { toast } = useToast();
  const { symbol: currencySymbol } = useCurrencyContext();
  const {
    isDeliveryEnabled,
    maxRadius,
    restaurantLocation,
    defaultCharge,
    freeDeliveryAbove,
    settingsLoading,
    zones,
    zonesLoading,
    saveSettings,
    addZone,
    deleteZone,
  } = useDeliveryConfig();

  // Settings states
  const [enabled, setEnabled] = useState(false);
  const [radius, setRadius] = useState<string>("10");
  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");
  const [defCharge, setDefCharge] = useState<string>("30");
  const [freeAbove, setFreeAbove] = useState<string>("");
  const [gpsLoading, setGpsLoading] = useState(false);

  // New zone states
  const [newZoneName, setNewZoneName] = useState("");
  const [newMinDist, setNewMinDist] = useState("0");
  const [newMaxDist, setNewMaxDist] = useState("");
  const [newZoneCharge, setNewZoneCharge] = useState("");

  // Sync settings when loaded — only on first load (not after GPS capture)
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (restaurantLocation && !initialized) {
      setInitialized(true);
      setEnabled(isDeliveryEnabled);
      setRadius(maxRadius.toString());
      setLat(restaurantLocation.lat ? restaurantLocation.lat.toString() : "");
      setLng(restaurantLocation.lng ? restaurantLocation.lng.toString() : "");
      setDefCharge(defaultCharge.toString());
      setFreeAbove(freeDeliveryAbove !== null ? freeDeliveryAbove.toString() : "");
    } else if (!restaurantLocation && !initialized) {
      // settings loaded but no row yet — still mark initialized
      setEnabled(isDeliveryEnabled);
      setRadius(maxRadius.toString());
      setDefCharge(defaultCharge.toString());
    }
  }, [restaurantLocation, isDeliveryEnabled, maxRadius, defaultCharge, freeDeliveryAbove, initialized]);

  const handleCaptureGps = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Error",
        description: "GPS is not supported on this device",
        variant: "destructive",
      });
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const capturedLat = position.coords.latitude.toString();
        const capturedLng = position.coords.longitude.toString();
        setLat(capturedLat);
        setLng(capturedLng);
        setGpsLoading(false);
        toast({
          title: "Location Captured 📍",
          description: `Lat: ${parseFloat(capturedLat).toFixed(5)}, Lng: ${parseFloat(capturedLng).toFixed(5)} — click Save Settings to apply`,
        });
      },
      (error) => {
        console.error(error);
        toast({
          title: "GPS Error",
          description: "Could not retrieve GPS coordinates. Check permissions.",
          variant: "destructive",
        });
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSaveSettings = async () => {
    try {
      const parsedLat = lat.trim() ? parseFloat(lat) : null;
      const parsedLng = lng.trim() ? parseFloat(lng) : null;
      const parsedRadius = parseFloat(radius);
      const parsedDefCharge = parseFloat(defCharge);
      const parsedFreeAbove = freeAbove.trim() ? parseFloat(freeAbove) : null;

      if (enabled && (parsedLat === null || parsedLng === null || isNaN(parsedLat) || isNaN(parsedLng))) {
        toast({
          title: "Error",
          description: "Restaurant GPS location is required when delivery is enabled",
          variant: "destructive",
        });
        return;
      }

      if (isNaN(parsedRadius) || parsedRadius <= 0) {
        toast({
          title: "Error",
          description: "Please enter a valid max delivery radius",
          variant: "destructive",
        });
        return;
      }

      await saveSettings.mutateAsync({
        delivery_enabled: enabled,
        max_delivery_radius_km: parsedRadius,
        restaurant_lat: parsedLat,
        restaurant_lng: parsedLng,
        default_delivery_charge: parsedDefCharge,
        free_delivery_above: parsedFreeAbove,
      });

      toast({
        title: "Success ✅",
        description: "Delivery configurations saved successfully",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to save settings",
        variant: "destructive",
      });
    }
  };

  const handleAddZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newZoneName.trim() || !newMaxDist.trim() || !newZoneCharge.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all zone details",
        variant: "destructive",
      });
      return;
    }

    try {
      const minDist = parseFloat(newMinDist);
      const maxDist = parseFloat(newMaxDist);
      const charge = parseFloat(newZoneCharge);

      if (isNaN(minDist) || isNaN(maxDist) || isNaN(charge) || maxDist <= minDist) {
        toast({
          title: "Invalid range",
          description: "Max distance must be greater than min distance",
          variant: "destructive",
        });
        return;
      }

      await addZone.mutateAsync({
        zone_name: newZoneName.trim(),
        min_distance_km: minDist,
        max_distance_km: maxDist,
        delivery_charge: charge,
        is_active: true,
      });

      toast({
        title: "Zone Added",
        description: `Zone "${newZoneName}" added successfully`,
      });

      // Reset
      setNewZoneName("");
      setNewMinDist(newMaxDist);
      setNewMaxDist("");
      setNewZoneCharge("");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to add delivery zone",
        variant: "destructive",
      });
    }
  };

  const handleDeleteZone = async (id: string) => {
    try {
      await deleteZone.mutateAsync(id);
      toast({
        title: "Zone Deleted",
        description: "Delivery zone removed successfully",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete zone",
        variant: "destructive",
      });
    }
  };

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border border-white/30 dark:border-gray-700/30 rounded-3xl shadow-2xl">
        <CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-700">
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl shadow-lg">
              <Truck className="h-6 w-6 text-white" />
            </div>
            Delivery Configuration
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
            Configure delivery ranges, general pricing policies, and dynamic charges.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-8 space-y-6">
          {/* Delivery Toggle */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-2xl border border-blue-100/50 dark:border-blue-900/30">
            <div>
              <Label htmlFor="delivery-enabled" className="font-bold text-lg text-gray-900 dark:text-white block">
                Enable Delivery Support
              </Label>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Allow counter operators to create delivery orders and auto-calculate distance charges.
              </span>
            </div>
            <Switch
              id="delivery-enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Restaurant GPS Coordinates */}
            <div className="space-y-4 p-5 border border-gray-100 dark:border-gray-700 rounded-2xl bg-slate-50/30 dark:bg-slate-900/10">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                <MapPin className="h-5 w-5 text-red-500" />
                Restaurant Location
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Exact coordinates are required to calculate customer distance.
              </p>

              <div className="flex gap-2">
                <div className="flex-1">
                  <Label className="text-xs">Latitude</Label>
                  <Input
                    placeholder="e.g. 19.076"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    className="h-10 text-xs rounded-xl"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs">Longitude</Label>
                  <Input
                    placeholder="e.g. 72.877"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    className="h-10 text-xs rounded-xl"
                  />
                </div>
              </div>

              <Button
                variant="outline"
                onClick={handleCaptureGps}
                disabled={gpsLoading}
                className="w-full h-10 rounded-xl border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-900/30"
              >
                {gpsLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-blue-600" />
                ) : (
                  <Navigation className="mr-2 h-4 w-4 text-blue-600" />
                )}
                Get GPS Coordinates
              </Button>
            </div>

            {/* Threshold and Charge Configurations */}
            <div className="space-y-4 p-5 border border-gray-100 dark:border-gray-700 rounded-2xl bg-slate-50/30 dark:bg-slate-900/10">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">Delivery Parameters</h3>

              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Max Delivery Radius (km)</Label>
                  <Input
                    type="number"
                    value={radius}
                    onChange={(e) => setRadius(e.target.value)}
                    className="h-10 text-xs rounded-xl"
                  />
                </div>

                <div>
                  <Label className="text-xs">Default Charge ({currencySymbol})</Label>
                  <Input
                    type="number"
                    value={defCharge}
                    onChange={(e) => setDefCharge(e.target.value)}
                    placeholder="Charge outside defined zones"
                    className="h-10 text-xs rounded-xl"
                  />
                </div>

                <div>
                  <Label className="text-xs">Free Delivery Above ({currencySymbol}) - Optional</Label>
                  <Input
                    type="number"
                    value={freeAbove}
                    onChange={(e) => setFreeAbove(e.target.value)}
                    placeholder="Leave empty for no free threshold"
                    className="h-10 text-xs rounded-xl"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSaveSettings}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg px-6 py-5 h-auto transition-all"
            >
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tiered Zones Configuration */}
      <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border border-white/30 dark:border-gray-700/30 rounded-3xl shadow-2xl">
        <CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-700">
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="p-3 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-xl shadow-lg">
              <MapPin className="h-6 w-6 text-white" />
            </div>
            Tiered Delivery Zones
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
            Create distance tiers for dynamic customer billing.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-8 space-y-6">
          {/* Add Zone Form */}
          <div className="p-5 border border-dashed border-teal-200 dark:border-teal-800/50 rounded-2xl bg-teal-50/10 dark:bg-teal-950/10 space-y-4">
            <h4 className="font-bold text-sm text-teal-800 dark:text-teal-400 flex items-center gap-1.5">
              <Plus className="h-4 w-4" /> Add Delivery Zone
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs">Zone Name</Label>
                <Input
                  placeholder="e.g. Nearby, Outer Ring"
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>
              <div>
                <Label className="text-xs">Min Distance (km)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={newMinDist}
                  onChange={(e) => setNewMinDist(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>
              <div>
                <Label className="text-xs">Max Distance (km)</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 5"
                  value={newMaxDist}
                  onChange={(e) => setNewMaxDist(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>
              <div>
                <Label className="text-xs">Charge ({currencySymbol})</Label>
                <Input
                  type="number"
                  placeholder="e.g. 20"
                  value={newZoneCharge}
                  onChange={(e) => setNewZoneCharge(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={(e) => handleAddZone(e as any)}
                className="bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl text-xs h-9 px-4"
              >
                Create Zone
              </Button>
            </div>
          </div>

          {/* Zones List */}
          {zonesLoading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
            </div>
          ) : zones.length === 0 ? (
            <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm">
              No delivery zones configured yet. Default charge will be applied to all deliveries.
            </div>
          ) : (
            <div className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/40 text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-100 dark:border-gray-800">
                    <th className="p-3">Zone Name</th>
                    <th className="p-3">Distance Range</th>
                    <th className="p-3">Delivery Charge</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {zones.map((zone: DeliveryZone) => (
                    <tr key={zone.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                      <td className="p-3 font-semibold text-gray-900 dark:text-white">
                        {zone.zone_name}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {zone.min_distance_km} - {zone.max_distance_km} km
                      </td>
                      <td className="p-3 font-bold text-gray-900 dark:text-white">
                        {currencySymbol}
                        {zone.delivery_charge}
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteZone(zone.id)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
