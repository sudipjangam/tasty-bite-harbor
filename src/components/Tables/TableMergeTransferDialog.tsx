import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRightLeft,
  Merge,
  Users,
  CheckCircle2,
  AlertCircle,
  MoveRight,
} from "lucide-react";
import { FloorTable } from "@/types/tableFloorPlan";

interface TableMergeTransferDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sourceTable: FloorTable | null;
  availableTables: FloorTable[];
  onTransfer: (params: { fromTable: FloorTable; toTable: FloorTable }) => void;
}

export const TableMergeTransferDialog: React.FC<TableMergeTransferDialogProps> = ({
  isOpen,
  onClose,
  sourceTable,
  availableTables,
  onTransfer,
}) => {
  const [selectedDestinationTableId, setSelectedDestinationTableId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"transfer" | "merge">("transfer");

  const destinationTable = availableTables.find((t) => t.id === selectedDestinationTableId);

  const handleExecuteTransfer = () => {
    if (!sourceTable || !destinationTable) return;
    onTransfer({ fromTable: sourceTable, toTable: destinationTable });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-base font-bold">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white">
              <ArrowRightLeft className="h-5 w-5" />
            </div>
            <span>Manage Table {sourceTable?.name}</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-4">
          <TabsList className="grid grid-cols-2 bg-gray-100 dark:bg-gray-800 rounded-2xl p-1">
            <TabsTrigger
              value="transfer"
              className="rounded-xl text-xs font-bold py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm"
            >
              <MoveRight className="h-4 w-4 mr-1.5" />
              Transfer Table
            </TabsTrigger>
            <TabsTrigger
              value="merge"
              className="rounded-xl text-xs font-bold py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm"
            >
              <Merge className="h-4 w-4 mr-1.5" />
              Merge Tables
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transfer" className="space-y-4 text-xs">
            <div className="p-3 bg-blue-50/60 dark:bg-blue-950/20 rounded-2xl border border-blue-100 dark:border-blue-900/40">
              <p className="font-semibold text-blue-900 dark:text-blue-300">
                Move active order & running KOT from Table {sourceTable?.name} to another table.
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Current order: {sourceTable?.activeOrder?.items?.length || 0} items (₹{sourceTable?.activeOrder?.total || 0})
              </p>
            </div>

            <div className="space-y-2">
              <label className="font-bold text-gray-700 dark:text-gray-300">
                Select Destination Table:
              </label>

              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                {availableTables
                  .filter((t) => t.id !== sourceTable?.id && t.status === "available")
                  .map((tbl) => (
                    <button
                      key={tbl.id}
                      type="button"
                      onClick={() => setSelectedDestinationTableId(tbl.id)}
                      className={`p-3 rounded-2xl border-2 text-center transition-all ${
                        selectedDestinationTableId === tbl.id
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-sm"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <p className="font-bold text-sm">{tbl.name}</p>
                      <span className="text-[10px] text-gray-500 flex items-center justify-center gap-1 mt-0.5">
                        <Users className="h-3 w-3" /> {tbl.capacity} Pax
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="merge" className="space-y-4 text-xs">
            <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 rounded-2xl border border-amber-100 dark:border-amber-900/40">
              <p className="font-semibold text-amber-900 dark:text-amber-300">
                Combine tables into a single dining session for large groups.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
              {availableTables
                .filter((t) => t.id !== sourceTable?.id)
                .map((tbl) => (
                  <button
                    key={tbl.id}
                    type="button"
                    onClick={() => setSelectedDestinationTableId(tbl.id)}
                    className={`p-3 rounded-2xl border-2 text-center transition-all ${
                      selectedDestinationTableId === tbl.id
                        ? "border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 shadow-sm"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <p className="font-bold text-sm">{tbl.name}</p>
                    <span className="text-[10px] text-gray-500 flex items-center justify-center gap-1 mt-0.5">
                      <Users className="h-3 w-3" /> {tbl.capacity} Pax
                    </span>
                  </button>
                ))}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex gap-2 border-t pt-4">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl text-xs">
            Cancel
          </Button>
          <Button
            onClick={handleExecuteTransfer}
            disabled={!selectedDestinationTableId}
            className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 text-white font-bold text-xs shadow-md"
          >
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            Confirm Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
