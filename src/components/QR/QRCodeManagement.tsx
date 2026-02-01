import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { QrCode, Download, RefreshCw, Loader2, Eye } from "lucide-react";
import { QRCode as QRCodeType, QREntityType } from "@/types/qrOrdering";
import { downloadQRCode, generateQRCodeImage } from "@/utils/qrCodeUtils";
import { generateBrandedQRCard } from "@/utils/qrTemplateGenerator";
import { useRestaurantId } from "@/hooks/useRestaurantId";

interface QRCodeManagementProps {
  entityType: QREntityType;
}

const QRCodeManagement: React.FC<QRCodeManagementProps> = ({ entityType }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedQR, setSelectedQR] = useState<QRCodeType | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const {
    restaurantId,
    restaurantName,
    isLoading: restaurantLoading,
  } = useRestaurantId();

  // Fetch entities (tables or rooms)
  const tableName =
    entityType === "table" ? "restaurant_tables" : "restaurant_rooms";
  const { data: entities = [], isLoading: entitiesLoading } = useQuery({
    queryKey: [tableName, restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });

  // Fetch QR codes
  const { data: qrCodes = [], isLoading: qrCodesLoading } = useQuery({
    queryKey: ["qr_codes", entityType, restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("qr_codes")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("entity_type", entityType);

      if (error) throw error;
      return data as QRCodeType[];
    },
    enabled: !!restaurantId,
  });

  // Generate QR code mutation
  const generateQRMutation = useMutation({
    mutationFn: async (entityId: string) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-qr-code`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ entityType, entityId }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate QR code");
      }

      const result = await response.json();

      // Generate QR code image on frontend from the URL
      const qrCodeImage = await generateQRCodeImage(result.qrCode.qrCodeUrl, {
        width: 400,
        errorCorrectionLevel: "H",
      });

      // Update database with generated image
      const { error: updateError } = await supabase
        .from("qr_codes")
        .update({ qr_code_url: qrCodeImage })
        .eq("id", result.qrCode.id);

      if (updateError) {
        console.error("Error updating QR image:", updateError);
        throw updateError;
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qr_codes"] });
      toast({
        title: "Success",
        description: "QR code generated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Generate all QR codes
  const generateAllMutation = useMutation({
    mutationFn: async () => {
      const results = await Promise.allSettled(
        entities.map((entity) => generateQRMutation.mutateAsync(entity.id)),
      );
      return results;
    },
    onSuccess: (results) => {
      const successful = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      toast({
        title: "Batch Generation Complete",
        description: `${successful} QR codes generated successfully${failed > 0 ? `, ${failed} failed` : ""}`,
      });
    },
  });

  const handleDownload = async (qr: QRCodeType, entity: any) => {
    if (qr.qr_code_url) {
      try {
        // Ensure restaurant data is loaded
        if (!restaurantName) {
          toast({
            title: "Loading...",
            description: "Please wait while restaurant data loads",
          });
          return;
        }

        // Generate branded QR card
        const brandedCard = await generateBrandedQRCard({
          qrCodeDataUrl: qr.qr_code_url,
          tableName: entity.name || entity.table_number || entity.room_number,
          restaurantName: restaurantName,
          // TODO: Add primary_color and secondary_color to useRestaurantId
          primaryColor: undefined,
          secondaryColor: undefined,
        });

        const filename = `${entityType}-${entity.name}-qr-card.png`;
        downloadQRCode(brandedCard, filename);
        toast({
          title: "Downloaded",
          description: `Branded QR code card for ${entity.name} downloaded`,
        });
      } catch (error) {
        console.error("Error generating branded QR:", error);
        toast({
          title: "Download Failed",
          description: "Could not generate branded QR code",
          variant: "destructive",
        });
      }
    }
  };

  const handlePreview = async (qr: QRCodeType, entity: any) => {
    if (qr.qr_code_url && restaurantName) {
      try {
        // Generate branded QR card for preview
        const brandedCard = await generateBrandedQRCard({
          qrCodeDataUrl: qr.qr_code_url,
          tableName: entity.name || entity.table_number || entity.room_number,
          restaurantName: restaurantName,
          primaryColor: undefined,
          secondaryColor: undefined,
        });

        // Create a temporary QR object with the branded card
        setSelectedQR({ ...qr, qr_code_url: brandedCard });
        setPreviewOpen(true);
      } catch (error) {
        console.error("Error generating preview:", error);
        // Fallback to plain QR code if branded generation fails
        setSelectedQR(qr);
        setPreviewOpen(true);
      }
    } else {
      setSelectedQR(qr);
      setPreviewOpen(true);
    }
  };

  const getEntityById = (entityId: string) => {
    return entities.find((e) => e.id === entityId);
  };

  const getQRForEntity = (entityId: string) => {
    return qrCodes.find((qr) => qr.entity_id === entityId);
  };

  if (entitiesLoading || qrCodesLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  const entitiesWithoutQR = entities.filter(
    (entity) => !getQRForEntity(entity.id),
  );

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">QR Code Management</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Generate and manage QR codes for{" "}
            {entityType === "table" ? "tables" : "rooms"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => generateAllMutation.mutate()}
            disabled={generateAllMutation.isPending}
            className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
          >
            {generateAllMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <QrCode className="w-4 h-4 mr-2" />
            )}
            Generate All QR Codes
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total {entityType === "table" ? "Tables" : "Rooms"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{entities.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              QR Codes Generated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {qrCodes.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {entitiesWithoutQR.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* QR Code Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {entities.map((entity) => {
          const qr = getQRForEntity(entity.id);

          return (
            <Card key={entity.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{entity.name}</span>
                  {qr?.is_active && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                      Active
                    </span>
                  )}
                </CardTitle>
                <CardDescription className="text-sm">
                  {entityType === "table" ? "Table" : "Room"} • Capacity:{" "}
                  {entity.capacity || "N/A"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {qr ? (
                  <>
                    <div className="aspect-square bg-white p-4 rounded-lg border">
                      <img
                        src={qr.qr_code_url || ""}
                        alt={`QR code for ${entity.name}`}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePreview(qr, entity)}
                        className="flex-1"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(qr, entity)}
                        className="flex-1"
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => generateQRMutation.mutate(entity.id)}
                      disabled={generateQRMutation.isPending}
                      className="w-full"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Regenerate
                    </Button>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center border-2 border-dashed">
                      <QrCode className="w-12 h-12 text-gray-400" />
                    </div>
                    <Button
                      size="sm"
                      onClick={() => generateQRMutation.mutate(entity.id)}
                      disabled={generateQRMutation.isPending}
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-600"
                    >
                      {generateQRMutation.isPending ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <QrCode className="w-3 h-3 mr-1" />
                      )}
                      Generate QR
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>QR Code Preview</DialogTitle>
            <DialogDescription>
              {selectedQR && getEntityById(selectedQR.entity_id)?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedQR && (
            <div className="space-y-4">
              <div className="bg-white p-6 rounded-lg border">
                <img
                  src={selectedQR.qr_code_url || ""}
                  alt="QR code preview"
                  className="w-full"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    const entity = getEntityById(selectedQR.entity_id);
                    if (entity) handleDownload(selectedQR, entity);
                  }}
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <p>
                  Created:{" "}
                  {new Date(selectedQR.created_at).toLocaleDateString()}
                </p>
                <p>
                  Last Updated:{" "}
                  {new Date(selectedQR.updated_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QRCodeManagement;
