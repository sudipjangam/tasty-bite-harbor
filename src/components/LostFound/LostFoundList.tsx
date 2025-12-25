import React, { useState } from "react";
import { format, differenceInDays } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useLostFound,
  LostFoundItem,
  CATEGORY_OPTIONS,
} from "@/hooks/useLostFound";
import LostFoundDialog from "./LostFoundDialog";
import {
  Package,
  Plus,
  RefreshCw,
  Loader2,
  Search,
  MoreVertical,
  Trash2,
  MapPin,
  Calendar,
  Archive,
  CheckCircle,
  User,
  Phone,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
  stored: { label: "Stored", color: "bg-blue-100 text-blue-700" },
  claimed: { label: "Claimed", color: "bg-emerald-100 text-emerald-700" },
  disposed: { label: "Disposed", color: "bg-gray-100 text-gray-700" },
  transferred: { label: "Transferred", color: "bg-purple-100 text-purple-700" },
};

const LostFoundList: React.FC = () => {
  const {
    items,
    isLoading,
    refetch,
    stats,
    claimItem,
    updateStatus,
    deleteItem,
  } = useLostFound();

  const [openDialog, setOpenDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [claimDialogItem, setClaimDialogItem] = useState<LostFoundItem | null>(
    null
  );
  const [claimName, setClaimName] = useState("");
  const [claimPhone, setClaimPhone] = useState("");

  const filteredItems = items.filter((item) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.item_name.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query) ||
      item.found_location?.toLowerCase().includes(query)
    );
  });

  const getCategoryInfo = (category: string | null) => {
    return (
      CATEGORY_OPTIONS.find((c) => c.value === category) || {
        icon: "📦",
        label: "Other",
      }
    );
  };

  const getDaysStored = (foundDate: string) => {
    return differenceInDays(new Date(), new Date(foundDate));
  };

  const handleClaim = () => {
    if (claimDialogItem && claimName) {
      claimItem({
        itemId: claimDialogItem.id,
        guestName: claimName,
        guestPhone: claimPhone || undefined,
      });
      setClaimDialogItem(null);
      setClaimName("");
      setClaimPhone("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl shadow-lg">
            <Package className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
              Lost & Found
            </h1>
            <p className="text-gray-500 text-sm">Track lost items</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={() => setOpenDialog(true)}
            className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            Log Item
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-700">
              {stats.stored}
            </div>
            <div className="text-xs text-blue-600">Stored</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/20">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-emerald-700">
              {stats.claimed}
            </div>
            <div className="text-xs text-emerald-600">Claimed</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-gray-50 to-gray-100">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-700">
              {stats.disposed}
            </div>
            <div className="text-xs text-gray-600">Disposed</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-violet-50 to-violet-100">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-violet-700">
              {stats.total}
            </div>
            <div className="text-xs text-violet-600">Total</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search items..."
          className="pl-10"
        />
      </div>

      {/* Items List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No items found</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredItems.map((item) => {
                  const categoryInfo = getCategoryInfo(item.category);
                  const statusConfig = STATUS_CONFIG[item.status];
                  const daysStored = getDaysStored(item.found_date);

                  return (
                    <div
                      key={item.id}
                      className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{categoryInfo.icon}</span>
                            <span className="font-semibold text-gray-800 dark:text-gray-200">
                              {item.item_name}
                            </span>
                            <Badge
                              className={cn("text-xs", statusConfig.color)}
                            >
                              {statusConfig.label}
                            </Badge>
                            {item.status === "stored" && daysStored > 60 && (
                              <Badge className="text-xs bg-red-100 text-red-700">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                {daysStored} days
                              </Badge>
                            )}
                          </div>

                          {item.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {item.description}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                            {(item.rooms?.name || item.found_location) && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {item.rooms?.name || item.found_location}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Found:{" "}
                              {format(new Date(item.found_date), "MMM d, yyyy")}
                            </span>
                            {item.storage_location && (
                              <span className="flex items-center gap-1">
                                <Archive className="h-3 w-3" />
                                {item.storage_location}
                              </span>
                            )}
                            {item.status === "claimed" && item.guest_name && (
                              <span className="flex items-center gap-1 text-emerald-600">
                                <CheckCircle className="h-3 w-3" />
                                Claimed by {item.guest_name}
                              </span>
                            )}
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {item.status === "stored" && (
                              <DropdownMenuItem
                                onClick={() => setClaimDialogItem(item)}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Mark as Claimed
                              </DropdownMenuItem>
                            )}
                            {item.status === "stored" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  updateStatus({
                                    itemId: item.id,
                                    status: "disposed",
                                  })
                                }
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Mark as Disposed
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => deleteItem(item.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Log Dialog */}
      <LostFoundDialog open={openDialog} onOpenChange={setOpenDialog} />

      {/* Claim Dialog */}
      <Dialog
        open={!!claimDialogItem}
        onOpenChange={() => setClaimDialogItem(null)}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Claim Item</DialogTitle>
            <DialogDescription>
              Record who is claiming "{claimDialogItem?.item_name}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                Guest Name *
              </Label>
              <Input
                value={claimName}
                onChange={(e) => setClaimName(e.target.value)}
                placeholder="Full name"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                Phone (Optional)
              </Label>
              <Input
                value={claimPhone}
                onChange={(e) => setClaimPhone(e.target.value)}
                placeholder="Phone number"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClaimDialogItem(null)}>
              Cancel
            </Button>
            <Button onClick={handleClaim} disabled={!claimName}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirm Claim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LostFoundList;
