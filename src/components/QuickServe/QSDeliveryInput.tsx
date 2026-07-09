import React, { useState, useCallback, useEffect } from "react";
import { MapPin, Navigation, Loader2, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrencyContext } from "@/contexts/CurrencyContext";

export interface DeliveryInfo {
  address: string;
  landmark: string;
  pincode: string;
  lat: number | null;
  lng: number | null;
  distanceKm: number | null;
  charge: number;
  zoneName: string;
}

interface QSDeliveryInputProps {
  deliveryInfo: DeliveryInfo;
  onDeliveryInfoChange: (info: DeliveryInfo) => void;
  onChargeCalculated?: (charge: number, distance: number) => void;
  calculateCharge?: (lat: number, lng: number) => Promise<{
    success: boolean;
    distance_km?: number;
    charge?: number;
    zone_name?: string;
    free_delivery_above?: number | null;
    error?: string;
  }>;
  orderSubtotal?: number;
  freeDeliveryAbove?: number | null;
  savedAddress?: {
    address: string;
    lat: number | null;
    lng: number | null;
    landmark: string;
    pincode: string;
  } | null;
  error?: string | null;
}

export const QSDeliveryInput: React.FC<QSDeliveryInputProps> = ({
  deliveryInfo,
  onDeliveryInfoChange,
  onChargeCalculated,
  calculateCharge,
  orderSubtotal = 0,
  freeDeliveryAbove,
  savedAddress,
  error,
}) => {
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [chargeLoading, setChargeLoading] = useState(false);
  const [chargeError, setChargeError] = useState<string | null>(null);
  const { symbol: currencySymbol } = useCurrencyContext();

  // Auto-fill saved address
  useEffect(() => {
    if (savedAddress && !deliveryInfo.address) {
      onDeliveryInfoChange({
        ...deliveryInfo,
        address: savedAddress.address || "",
        landmark: savedAddress.landmark || "",
        pincode: savedAddress.pincode || "",
        lat: savedAddress.lat,
        lng: savedAddress.lng,
      });
      // Auto-calculate charge if coords available
      if (savedAddress.lat && savedAddress.lng && calculateCharge) {
        handleCalculateCharge(savedAddress.lat, savedAddress.lng);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedAddress]);

  const handleGpsCapture = useCallback(async () => {
    if (!navigator.geolocation) {
      setGpsError("GPS not supported on this device");
      return;
    }
    setGpsLoading(true);
    setGpsError(null);
    setChargeError(null);

    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000,
          });
        },
      );

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      // Reverse geocode using Nominatim (free, no API key)
      let address = deliveryInfo.address;
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
          { headers: { "User-Agent": "QuickServePOS/1.0" } },
        );
        if (res.ok) {
          const data = await res.json();
          address = data.display_name || address;
          const pincode = data.address?.postcode || "";
          onDeliveryInfoChange({
            ...deliveryInfo,
            address,
            lat,
            lng,
            pincode: pincode || deliveryInfo.pincode,
          });
        } else {
          onDeliveryInfoChange({ ...deliveryInfo, lat, lng });
        }
      } catch {
        // Geocode failed, still use coords
        onDeliveryInfoChange({ ...deliveryInfo, lat, lng });
      }

      // Calculate delivery charge
      await handleCalculateCharge(lat, lng);
    } catch (err: unknown) {
      const geoErr = err as GeolocationPositionError;
      if (geoErr.code === 1) {
        setGpsError("Location permission denied");
      } else if (geoErr.code === 2) {
        setGpsError("Location unavailable");
      } else {
        setGpsError("GPS timeout — try again");
      }
    } finally {
      setGpsLoading(false);
    }
  }, [deliveryInfo, onDeliveryInfoChange]);

  const handleCalculateCharge = useCallback(
    async (lat: number, lng: number) => {
      if (!calculateCharge) return;
      setChargeLoading(true);
      setChargeError(null);

      try {
        const result = await calculateCharge(lat, lng);
        if (result.success) {
          const isFree =
            freeDeliveryAbove != null && orderSubtotal >= freeDeliveryAbove;
          const finalCharge = isFree ? 0 : (result.charge ?? 0);
          onDeliveryInfoChange({
            ...deliveryInfo,
            lat,
            lng,
            distanceKm: result.distance_km ?? null,
            charge: finalCharge,
            zoneName: result.zone_name ?? "default",
          });
          onChargeCalculated?.(finalCharge, result.distance_km ?? 0);
        } else {
          setChargeError(result.error ?? "Cannot deliver to this address");
          onDeliveryInfoChange({
            ...deliveryInfo,
            lat,
            lng,
            distanceKm: null,
            charge: 0,
            zoneName: "",
          });
        }
      } catch {
        setChargeError("Failed to calculate delivery charge");
      } finally {
        setChargeLoading(false);
      }
    },
    [
      calculateCharge,
      deliveryInfo,
      onDeliveryInfoChange,
      onChargeCalculated,
      freeDeliveryAbove,
      orderSubtotal,
    ],
  );

  const isFreeDelivery =
    freeDeliveryAbove != null && orderSubtotal >= freeDeliveryAbove;

  return (
    <div className="px-3 py-2 space-y-2 border-b border-gray-100 dark:border-white/5 bg-blue-50/50 dark:bg-blue-950/20">
      {/* Address input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-blue-500" />
          <Input
            value={deliveryInfo.address}
            onChange={(e) =>
              onDeliveryInfoChange({
                ...deliveryInfo,
                address: e.target.value,
              })
            }
            placeholder="Delivery address..."
            className="pl-8 h-9 text-xs bg-white dark:bg-gray-800 rounded-xl border-blue-200 dark:border-blue-800 focus:border-blue-400"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleGpsCapture}
          disabled={gpsLoading}
          className="h-9 px-2.5 rounded-xl border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50"
        >
          {gpsLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
          ) : (
            <Navigation className="h-3.5 w-3.5 text-blue-500" />
          )}
          <span className="ml-1 text-xs">GPS</span>
        </Button>
      </div>

      {/* Landmark + Pincode row */}
      <div className="flex gap-2">
        <Input
          value={deliveryInfo.landmark}
          onChange={(e) =>
            onDeliveryInfoChange({
              ...deliveryInfo,
              landmark: e.target.value,
            })
          }
          placeholder="Landmark (optional)"
          className="h-8 text-xs bg-white dark:bg-gray-800 rounded-xl border-gray-200 dark:border-gray-700 flex-1"
        />
        <Input
          value={deliveryInfo.pincode}
          onChange={(e) =>
            onDeliveryInfoChange({
              ...deliveryInfo,
              pincode: e.target.value,
            })
          }
          placeholder="Pincode"
          className="h-8 text-xs bg-white dark:bg-gray-800 rounded-xl border-gray-200 dark:border-gray-700 w-24"
        />
      </div>

      {/* Delivery Notes */}
      <Input
        value={deliveryInfo.address ? (deliveryInfo as any).notes || "" : ""}
        onChange={(e) =>
          onDeliveryInfoChange({
            ...deliveryInfo,
            ...({ notes: e.target.value } as any),
          })
        }
        placeholder="Delivery notes (e.g. Ring doorbell, call on arrival)"
        className="h-8 text-xs bg-white dark:bg-gray-800 rounded-xl border-gray-200 dark:border-gray-700"
      />

      {/* Charge info */}
      {chargeLoading && (
        <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
          <Loader2 className="h-3 w-3 animate-spin" />
          Calculating delivery charge...
        </div>
      )}

      {deliveryInfo.distanceKm != null && !chargeError && (
        <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl px-3 py-2 border border-blue-100 dark:border-blue-900">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              📍 {deliveryInfo.distanceKm.toFixed(1)} km
            </span>
            {deliveryInfo.zoneName && deliveryInfo.zoneName !== "default" && (
              <span className="text-[10px] bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full">
                {deliveryInfo.zoneName}
              </span>
            )}
          </div>
          <div className="text-right">
            {isFreeDelivery ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs line-through text-gray-400">
                  {currencySymbol}
                  {deliveryInfo.charge}
                </span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  FREE 🎉
                </span>
              </div>
            ) : (
              <span className="text-xs font-bold text-gray-900 dark:text-white">
                Delivery: {currencySymbol}
                {deliveryInfo.charge.toFixed(0)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Errors */}
      {(gpsError || chargeError || error) && (
        <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-xl px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>{chargeError || gpsError || error}</span>
          {chargeError && (
            <button
              onClick={() => setChargeError(null)}
              className="ml-auto"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
