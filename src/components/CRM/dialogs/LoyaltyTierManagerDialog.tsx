import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Crown, Plus, Edit2, Trash2 } from "lucide-react";
import type { LoyaltyTier } from "@/types/customer";

interface LoyaltyTierManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loyaltyTiers: LoyaltyTier[];
  editingTier: LoyaltyTier | null;
  setEditingTier: (tier: LoyaltyTier | null) => void;
  onSaveTier: (tier: LoyaltyTier) => void;
  onDeleteTier: (tierId: string) => void;
  isSaving: boolean;
  restaurantId: string | null;
}

export const LoyaltyTierManagerDialog: React.FC<LoyaltyTierManagerDialogProps> = ({
  open,
  onOpenChange,
  loyaltyTiers,
  editingTier,
  setEditingTier,
  onSaveTier,
  onDeleteTier,
  isSaving,
  restaurantId,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-xl text-white shadow-md">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                Manage Loyalty Tiers
              </DialogTitle>
              <DialogDescription className="text-xs">
                Create and customize membership tiers with custom point multipliers
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {editingTier ? (
          /* Tier Edit Form */
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Tier Name</Label>
                <Input
                  value={editingTier.name}
                  onChange={(e) =>
                    setEditingTier({
                      ...editingTier,
                      name: e.target.value,
                    })
                  }
                  placeholder="e.g. Gold, VIP"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Points Required</Label>
                <Input
                  type="number"
                  value={editingTier.points_required}
                  onChange={(e) =>
                    setEditingTier({
                      ...editingTier,
                      points_required: Number(e.target.value),
                    })
                  }
                  min="0"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Min Total Spend (₹)</Label>
                <Input
                  type="number"
                  value={editingTier.min_spent}
                  onChange={(e) =>
                    setEditingTier({
                      ...editingTier,
                      min_spent: Number(e.target.value),
                    })
                  }
                  min="0"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Min Visits</Label>
                <Input
                  type="number"
                  value={editingTier.min_visits}
                  onChange={(e) =>
                    setEditingTier({
                      ...editingTier,
                      min_visits: Number(e.target.value),
                    })
                  }
                  min="0"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Points Multiplier</Label>
                <Input
                  type="number"
                  value={editingTier.points_multiplier}
                  onChange={(e) =>
                    setEditingTier({
                      ...editingTier,
                      points_multiplier: Number(e.target.value),
                    })
                  }
                  min="1"
                  step="0.1"
                  className="rounded-xl"
                />
                <p className="text-[11px] text-gray-500">
                  Higher-tier customers earn more points per order
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Color Badge</Label>
                <Select
                  value={editingTier.color}
                  onValueChange={(v) =>
                    setEditingTier({ ...editingTier, color: v })
                  }
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bg-amber-500">Gold (Amber)</SelectItem>
                    <SelectItem value="bg-purple-500">Diamond (Purple)</SelectItem>
                    <SelectItem value="bg-slate-400">Silver (Slate)</SelectItem>
                    <SelectItem value="bg-amber-700">Bronze (Brown)</SelectItem>
                    <SelectItem value="bg-emerald-500">Emerald (Green)</SelectItem>
                    <SelectItem value="bg-blue-500">Sapphire (Blue)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Display Order</Label>
                <Input
                  type="number"
                  value={editingTier.display_order}
                  onChange={(e) =>
                    setEditingTier({
                      ...editingTier,
                      display_order: Number(e.target.value),
                    })
                  }
                  min="0"
                  className="rounded-xl"
                />
              </div>
            </div>

            {/* Benefits */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">
                Benefits (comma-separated)
              </Label>
              <Input
                value={(editingTier.benefits || []).join(", ")}
                onChange={(e) =>
                  setEditingTier({
                    ...editingTier,
                    benefits: e.target.value
                      .split(",")
                      .map((b) => b.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="e.g. 10% discount, Free dessert on birthday, Priority seating"
                className="rounded-xl"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setEditingTier(null)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={() => onSaveTier(editingTier)}
                disabled={!editingTier.name || isSaving}
                className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-md"
              >
                {isSaving
                  ? "Saving..."
                  : editingTier.id
                  ? "Update Tier"
                  : "Create Tier"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          /* Tier List */
          <ScrollArea className="max-h-[55vh] py-2">
            <div className="space-y-3">
              {loyaltyTiers.length === 0 && (
                <p className="text-center text-gray-500 py-6 text-sm">
                  No tiers configured yet. Add your first tier below.
                </p>
              )}
              {loyaltyTiers.map((tier) => (
                <div
                  key={tier.id}
                  className="flex items-center justify-between p-4 bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3.5 h-3.5 rounded-full ${tier.color}`} />
                    <div>
                      <p className="font-semibold text-sm">{tier.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        ₹{tier.min_spent} min spend · {tier.min_visits} visits ·{" "}
                        {tier.points_multiplier}× points
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingTier(tier)}
                      className="rounded-lg h-8 w-8 p-0"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-lg h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                      onClick={() => onDeleteTier(tier.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                className="w-full gap-2 border-dashed rounded-2xl py-5 text-sm font-semibold"
                onClick={() =>
                  setEditingTier({
                    id: "",
                    restaurant_id: restaurantId || "",
                    name: "",
                    points_required: 0,
                    min_spent: 0,
                    min_visits: 0,
                    points_multiplier: 1,
                    benefits: [],
                    color: "bg-gray-500",
                    display_order: loyaltyTiers.length,
                    created_at: "",
                    updated_at: "",
                  })
                }
              >
                <Plus className="h-4 w-4" />
                Add New Tier
              </Button>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LoyaltyTierManagerDialog;
