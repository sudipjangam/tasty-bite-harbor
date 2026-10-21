import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useFranchise } from "@/contexts/FranchiseContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowRightLeft,
  Truck,
  CheckCircle2,
  Clock,
  Plus,
  AlertCircle,
  FileCheck2,
  Loader2,
  Package,
  XCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface TransferItem {
  id?: string;
  item_name: string;
  category?: string;
  unit: string;
  requested_quantity: number;
  dispatched_quantity?: number;
  received_quantity?: number;
  damaged_quantity?: number;
  unit_cost?: number;
}

interface TransferRequest {
  id: string;
  organization_id: string;
  request_number: string;
  source_branch_id: string;
  destination_branch_id: string;
  status: "requested" | "approved" | "dispatched" | "partially_received" | "completed" | "cancelled";
  expected_delivery_date: string | null;
  dispatched_at: string | null;
  received_at: string | null;
  notes: string | null;
  created_at: string;
  source_branch?: { id: string; name: string };
  destination_branch?: { id: string; name: string };
  items?: TransferItem[];
}

const statusBadgeStyles = {
  requested: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  approved: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  dispatched: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  partially_received: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export const StockTransfers: React.FC = () => {
  const { allBranches, org, demoMode } = useFranchise();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<TransferRequest | null>(null);
  const [isGrnOpen, setIsGrnOpen] = useState(false);
  const [grnInputs, setGrnInputs] = useState<Record<string, { received: number; damaged: number }>>({});

  // Form state
  const [sourceBranch, setSourceBranch] = useState("");
  const [destBranch, setDestBranch] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [newItems, setNewItems] = useState<TransferItem[]>([
    { item_name: "", unit: "kg", requested_quantity: 10 },
  ]);

  // Fetch transfers
  const { data: transfers = [], isLoading, refetch } = useQuery({
    queryKey: ["branch_transfers", org?.id],
    enabled: !!org?.id && !demoMode,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branch_transfer_requests" as any)
        .select(`
          *,
          source_branch:restaurants!source_branch_id(id, name),
          destination_branch:restaurants!destination_branch_id(id, name),
          items:branch_transfer_items(*)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as TransferRequest[];
    },
  });

  // Create Indent Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!sourceBranch || !destBranch) throw new Error("Select source and destination branches");
      if (sourceBranch === destBranch) throw new Error("Source and destination must be different");
      const validItems = newItems.filter((i) => i.item_name.trim().length > 0 && i.requested_quantity > 0);
      if (validItems.length === 0) throw new Error("Add at least one item with quantity");

      const reqNumber = `IND-${Date.now().toString().slice(-6)}`;

      const { data: reqData, error: reqErr } = await supabase
        .from("branch_transfer_requests" as any)
        .insert({
          organization_id: org?.id,
          request_number: reqNumber,
          source_branch_id: sourceBranch,
          destination_branch_id: destBranch,
          requested_by: user?.id,
          status: "requested",
          expected_delivery_date: expectedDate ? new Date(expectedDate).toISOString() : null,
          notes,
        })
        .select()
        .single();

      if (reqErr) throw reqErr;

      const itemsToInsert = validItems.map((item) => ({
        transfer_id: (reqData as any).id,
        item_name: item.item_name.trim(),
        category: item.category || "General",
        unit: item.unit || "units",
        requested_quantity: item.requested_quantity,
        dispatched_quantity: 0,
        received_quantity: 0,
        damaged_quantity: 0,
      }));

      const { error: itemsErr } = await supabase
        .from("branch_transfer_items" as any)
        .insert(itemsToInsert);

      if (itemsErr) throw itemsErr;
    },
    onSuccess: () => {
      toast({ title: "Indent Created", description: "Stock request submitted successfully." });
      setIsCreateOpen(false);
      setNewItems([{ item_name: "", unit: "kg", requested_quantity: 10 }]);
      setNotes("");
      queryClient.invalidateQueries({ queryKey: ["branch_transfers"] });
    },
    onError: (err: any) => {
      toast({ title: "Failed to create", description: err.message, variant: "destructive" });
    },
  });

  // Dispatch Action
  const dispatchMutation = useMutation({
    mutationFn: async (transfer: TransferRequest) => {
      const { error } = await supabase
        .from("branch_transfer_requests" as any)
        .update({
          status: "dispatched",
          dispatched_at: new Date().toISOString(),
        })
        .eq("id", transfer.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Dispatched", description: "Transfer marked as dispatched in-transit." });
      refetch();
    },
  });

  // GRN Receive Mutation
  const grnMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTransfer) return;

      for (const item of selectedTransfer.items || []) {
        const input = grnInputs[item.id!] || { received: item.requested_quantity, damaged: 0 };

        // 1. Update transfer item counts
        await supabase
          .from("branch_transfer_items" as any)
          .update({
            received_quantity: input.received,
            damaged_quantity: input.damaged,
          })
          .eq("id", item.id);

        // 2. Add received quantity to destination branch inventory
        if (input.received > 0) {
          const { data: existingDestItem } = await supabase
            .from("inventory_items")
            .select("id, quantity")
            .eq("restaurant_id", selectedTransfer.destination_branch_id)
            .ilike("name", item.item_name)
            .maybeSingle();

          if (existingDestItem) {
            await supabase
              .from("inventory_items")
              .update({ quantity: (existingDestItem.quantity || 0) + input.received })
              .eq("id", existingDestItem.id);
          } else {
            await supabase.from("inventory_items").insert({
              restaurant_id: selectedTransfer.destination_branch_id,
              name: item.item_name,
              quantity: input.received,
              unit: item.unit,
              category: item.category || "General",
            });
          }
        }
      }

      // Mark request completed
      await supabase
        .from("branch_transfer_requests" as any)
        .update({
          status: "completed",
          received_at: new Date().toISOString(),
        })
        .eq("id", selectedTransfer.id);
    },
    onSuccess: () => {
      toast({ title: "GRN Completed", description: "Goods received and destination stock updated!" });
      setIsGrnOpen(false);
      setSelectedTransfer(null);
      refetch();
    },
  });

  const handleOpenGRN = (transfer: TransferRequest) => {
    setSelectedTransfer(transfer);
    const defaults: Record<string, { received: number; damaged: number }> = {};
    (transfer.items || []).forEach((it) => {
      defaults[it.id!] = {
        received: it.dispatched_quantity || it.requested_quantity,
        damaged: 0,
      };
    });
    setGrnInputs(defaults);
    setIsGrnOpen(true);
  };

  // Stats
  const totalCount = transfers.length;
  const inTransitCount = transfers.filter((t) => t.status === "dispatched").length;
  const pendingCount = transfers.filter((t) => t.status === "requested" || t.status === "approved").length;
  const completedCount = transfers.filter((t) => t.status === "completed").length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ArrowRightLeft className="h-6 w-6 text-violet-600" />
            Stock Transfers &amp; Indents
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Central kitchen indents, dispatch tracking, and Goods Received Notes (GRN).
          </p>
        </div>

        <Button
          onClick={() => {
            if (allBranches.length >= 2) {
              setSourceBranch(allBranches[0].id);
              setDestBranch(allBranches[1].id);
            }
            setIsCreateOpen(true);
          }}
          className="bg-violet-600 hover:bg-violet-700 text-white flex items-center gap-2 rounded-xl"
        >
          <Plus className="h-4 w-4" />
          Create Indent Request
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <p className="text-xs font-medium text-gray-500">Total Indents</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{totalCount}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <p className="text-xs font-medium text-amber-600 flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> Pending Approval
          </p>
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1">{pendingCount}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <p className="text-xs font-medium text-blue-600 flex items-center gap-1">
            <Truck className="h-3.5 w-3.5" /> In-Transit / Dispatched
          </p>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-400 mt-1">{inTransitCount}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <p className="text-xs font-medium text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Received &amp; Stocked
          </p>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">{completedCount}</p>
        </div>
      </div>

      {/* Transfer Requests Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-white text-base">All Inter-Branch Indents</h2>
        </div>

        {isLoading ? (
          <div className="p-12 flex justify-center items-center">
            <Loader2 className="h-8 w-8 text-violet-600 animate-spin" />
          </div>
        ) : transfers.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Package className="h-10 w-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
            <p className="font-medium">No indent requests found</p>
            <p className="text-xs text-gray-400 mt-1">Create an indent to request ingredients from Central Kitchen or another branch.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-xs font-medium text-gray-500 dark:text-gray-400">
                  <th className="text-left px-5 py-3">Indent #</th>
                  <th className="text-left px-4 py-3">From (Supplier / CK)</th>
                  <th className="text-left px-4 py-3">To (Outlet)</th>
                  <th className="text-left px-4 py-3">Items</th>
                  <th className="text-center px-4 py-3">Status</th>
                  <th className="text-right px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {transfers.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-5 py-4 font-mono font-medium text-gray-900 dark:text-white">
                      {t.request_number}
                    </td>
                    <td className="px-4 py-4 text-gray-700 dark:text-gray-300">
                      {t.source_branch?.name || "Central Kitchen"}
                    </td>
                    <td className="px-4 py-4 font-semibold text-gray-800 dark:text-white">
                      {t.destination_branch?.name || "Outlet"}
                    </td>
                    <td className="px-4 py-4 text-gray-600 dark:text-gray-400">
                      {(t.items || []).length} item{(t.items || []).length === 1 ? "" : "s"}
                      <span className="text-xs text-gray-400 ml-1">
                        ({(t.items || []).map((i) => `${i.item_name} ${i.requested_quantity}${i.unit}`).slice(0, 2).join(", ")}
                        {(t.items || []).length > 2 ? "..." : ""})
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium capitalize", statusBadgeStyles[t.status])}>
                        {t.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {t.status === "requested" && (
                        <Button
                          size="sm"
                          onClick={() => dispatchMutation.mutate(t)}
                          className="bg-amber-600 hover:bg-amber-700 text-white text-xs rounded-lg flex items-center gap-1"
                        >
                          <Truck className="h-3.5 w-3.5" /> Dispatch
                        </Button>
                      )}
                      {t.status === "dispatched" && (
                        <Button
                          size="sm"
                          onClick={() => handleOpenGRN(t)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg flex items-center gap-1"
                        >
                          <FileCheck2 className="h-3.5 w-3.5" /> Receive GRN
                        </Button>
                      )}
                      {t.status === "completed" && (
                        <span className="text-xs text-emerald-600 font-medium inline-flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4" /> Received
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Indent Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-violet-600" />
              New Inter-Branch Stock Indent
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                  Source (Supplying Branch / CK)
                </label>
                <select
                  value={sourceBranch}
                  onChange={(e) => setSourceBranch(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-xl dark:bg-gray-800"
                >
                  {allBranches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                  Destination (Requesting Outlet)
                </label>
                <select
                  value={destBranch}
                  onChange={(e) => setDestBranch(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-xl dark:bg-gray-800"
                >
                  {allBranches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                Expected Delivery Date
              </label>
              <Input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
              />
            </div>

            {/* Items list */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                  Requested Items
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setNewItems([...newItems, { item_name: "", unit: "kg", requested_quantity: 10 }])
                  }
                  className="text-xs h-7"
                >
                  + Add Item
                </Button>
              </div>

              <div className="space-y-2">
                {newItems.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Input
                      placeholder="Item name (e.g. Biryani Gravy, Chicken)"
                      value={item.item_name}
                      onChange={(e) => {
                        const copy = [...newItems];
                        copy[idx].item_name = e.target.value;
                        setNewItems(copy);
                      }}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Qty"
                      min={1}
                      value={item.requested_quantity}
                      onChange={(e) => {
                        const copy = [...newItems];
                        copy[idx].requested_quantity = Number(e.target.value);
                        setNewItems(copy);
                      }}
                      className="w-24"
                    />
                    <select
                      value={item.unit}
                      onChange={(e) => {
                        const copy = [...newItems];
                        copy[idx].unit = e.target.value;
                        setNewItems(copy);
                      }}
                      className="px-2 py-2 text-xs border rounded-lg dark:bg-gray-800"
                    >
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="l">l</option>
                      <option value="ml">ml</option>
                      <option value="units">units</option>
                      <option value="packets">packets</option>
                    </select>
                    {newItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setNewItems(newItems.filter((_, i) => i !== idx))}
                        className="text-gray-400 hover:text-red-600 p-1"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                Dispatch Notes / Transport details
              </label>
              <Input
                placeholder="e.g. Transport via Van #MH12-9988, freeze container"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Submit Indent Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* GRN Receive Dialog */}
      <Dialog open={isGrnOpen} onOpenChange={setIsGrnOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-emerald-600" />
              Goods Received Note (GRN) — {selectedTransfer?.request_number}
            </DialogTitle>
          </DialogHeader>

          <p className="text-xs text-gray-500">
            Verify actual received items vs dispatch quantities. Accepted quantities will automatically be added to your branch inventory.
          </p>

          <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
            {(selectedTransfer?.items || []).map((item) => (
              <div key={item.id} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border space-y-2">
                <div className="flex justify-between items-center text-sm font-semibold">
                  <span>{item.item_name}</span>
                  <span className="text-xs text-gray-500">
                    Requested: {item.requested_quantity} {item.unit}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-emerald-700 dark:text-emerald-400 font-medium block mb-1">
                      Accepted Qty ({item.unit})
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={grnInputs[item.id!]?.received ?? item.requested_quantity}
                      onChange={(e) => {
                        setGrnInputs({
                          ...grnInputs,
                          [item.id!]: {
                            ...grnInputs[item.id!],
                            received: Number(e.target.value),
                            damaged: grnInputs[item.id!]?.damaged || 0,
                          },
                        });
                      }}
                    />
                  </div>

                  <div>
                    <label className="text-xs text-red-600 font-medium block mb-1">
                      Damaged / Transit Loss ({item.unit})
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={grnInputs[item.id!]?.damaged ?? 0}
                      onChange={(e) => {
                        setGrnInputs({
                          ...grnInputs,
                          [item.id!]: {
                            ...grnInputs[item.id!],
                            received: grnInputs[item.id!]?.received || 0,
                            damaged: Number(e.target.value),
                          },
                        });
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGrnOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => grnMutation.mutate()}
              disabled={grnMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {grnMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Confirm Acceptance &amp; Update Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StockTransfers;
