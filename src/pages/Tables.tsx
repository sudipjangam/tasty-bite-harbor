import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Calendar,
  Users,
  Utensils,
  QrCode,
  Layers,
  LayoutGrid,
  TrendingUp,
  Clock,
  Sparkles,
  Scissors,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import TableCard, { TableData } from "@/components/Tables/TableCard";
import TableDialog from "@/components/Tables/TableDialog";
import { TableBookingDialog } from "@/components/Tables/TableBookingDialog";
import ReservationsList from "@/components/Tables/ReservationsList";
import { useReservations } from "@/hooks/useReservations";
import QRCodeManagement from "@/components/QR/QRCodeManagement";
import HelpProvider from "@/components/Help/HelpProvider";
import { FeatureLock } from "@/components/Auth/FeatureLock";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useTableFloorPlan } from "@/hooks/useTableFloorPlan";
import { FloorPlanCanvas } from "@/components/Tables/FloorPlanCanvas";
import { TableActionModal } from "@/components/Tables/TableActionModal";
import { TableSplitBillDialog } from "@/components/Tables/TableSplitBillDialog";
import { TableMergeTransferDialog } from "@/components/Tables/TableMergeTransferDialog";
import { FloorTable } from "@/types/tableFloorPlan";

const Tables: React.FC = () => {
  const { restaurantName } = useRestaurantId();
  const [viewMode, setViewMode] = useState<"floorplan" | "grid" | "reservations" | "qr">("floorplan");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isReservationDialogOpen, setIsReservationDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<TableData | null>(null);
  const [selectedTableForReservation, setSelectedTableForReservation] = useState<TableData | null>(null);

  // Dialog State for Floor Plan
  const [actionTable, setActionTable] = useState<FloorTable | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isSplitBillOpen, setIsSplitBillOpen] = useState(false);
  const [isMergeTransferOpen, setIsMergeTransferOpen] = useState(false);

  const {
    reservations,
    isLoading: reservationsLoading,
    createReservation,
    updateReservationStatus,
    deleteReservation,
  } = useReservations();

  const {
    tables,
    allTables,
    sections,
    activeSection,
    setActiveSection,
    stats,
    isLoading: isLoadingFloor,
    updateTableLayout,
    isSavingLayout,
    createTable,
    updateTable,
    deleteTable,
    setTableStatus,
    transferTable,
    fireCourse,
    settleSplitBill,
    isSettlingBill,
    architecturalElements,
    saveArchitecturalElements,
    addArchitecturalElement,
    deleteArchitecturalElement,
    rotateArchitecturalElement,
    resizeArchitecturalElement,
  } = useTableFloorPlan();

  const handleTableClick = (table: FloorTable) => {
    setActionTable(table);
    setIsActionModalOpen(true);
  };

  const handleTableCardEdit = (tableData: TableData) => {
    setEditingTable(tableData);
    setIsAddDialogOpen(true);
  };

  return (
    <FeatureLock feature="tables.grid">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/20 to-blue-50/20 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950 p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Top Header & Metrics Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-5 rounded-3xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-2xl shadow-lg shadow-purple-500/20">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 bg-clip-text text-transparent">
                Table Floor Plan & Bill Splitting
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                Visual 2D floor management, live turn times, KOT course firing & check splitting
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3">
            <div className="bg-purple-50 dark:bg-purple-950/40 px-3.5 py-2 rounded-2xl border border-purple-100 dark:border-purple-900/40 text-center">
              <span className="text-[10px] text-gray-400 font-semibold block">OCCUPANCY</span>
              <span className="text-base font-extrabold text-purple-700 dark:text-purple-300">
                {stats.occupancyRate}% ({stats.occupiedTables}/{stats.totalTables})
              </span>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-950/40 px-3.5 py-2 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 text-center">
              <span className="text-[10px] text-gray-400 font-semibold block">LIVE GUESTS</span>
              <span className="text-base font-extrabold text-emerald-700 dark:text-emerald-300">
                {stats.currentGuests} / {stats.totalCapacity} Pax
              </span>
            </div>

            <Button
              size="sm"
              onClick={() => setIsReservationDialogOpen(true)}
              className="rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 text-white font-bold text-xs shadow-md gap-1.5 h-10 px-4"
            >
              <Calendar className="h-4 w-4" />
              New Booking
            </Button>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)} className="space-y-6">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-2 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-md">
            <TabsList className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-transparent h-auto p-0">
              <TabsTrigger
                value="floorplan"
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white font-bold text-xs shadow-sm transition-all"
              >
                <Layers className="h-4 w-4" />
                <span>Visual 2D Floor Plan</span>
              </TabsTrigger>

              <TabsTrigger
                value="grid"
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white font-bold text-xs shadow-sm transition-all"
              >
                <LayoutGrid className="h-4 w-4" />
                <span>Card Grid View</span>
              </TabsTrigger>

              <TabsTrigger
                value="reservations"
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white font-bold text-xs shadow-sm transition-all"
              >
                <Calendar className="h-4 w-4" />
                <span>Reservations</span>
                {reservations.length > 0 && (
                  <Badge className="ml-1 bg-white text-purple-600 text-[10px] px-1.5 py-0">
                    {reservations.length}
                  </Badge>
                )}
              </TabsTrigger>

              <TabsTrigger
                value="qr"
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white font-bold text-xs shadow-sm transition-all"
              >
                <QrCode className="h-4 w-4" />
                <span>QR Codes</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab 1: Visual 2D Floor Plan */}
          <TabsContent value="floorplan">
            <FloorPlanCanvas
              tables={tables}
              sections={sections}
              activeSection={activeSection}
              onSelectSection={setActiveSection}
              onTableClick={handleTableClick}
              onSaveLayout={updateTableLayout}
              onCreateTable={createTable}
              onDeleteTable={deleteTable}
              isSaving={isSavingLayout}
              architecturalElements={architecturalElements}
              onAddArchitecturalElement={addArchitecturalElement}
              onDeleteArchitecturalElement={deleteArchitecturalElement}
              onRotateArchitecturalElement={rotateArchitecturalElement}
              onResizeArchitecturalElement={resizeArchitecturalElement}
              onSaveArchitecturalElements={saveArchitecturalElements}
            />
          </TabsContent>

          {/* Tab 2: Traditional Grid View */}
          <TabsContent value="grid" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm text-gray-700 dark:text-gray-300">
                All Tables ({allTables.length})
              </h3>
              <Button
                size="sm"
                onClick={() => {
                  setEditingTable(null);
                  setIsAddDialogOpen(true);
                }}
                className="rounded-xl text-xs font-bold gap-1 bg-purple-600 text-white"
              >
                <Plus className="h-4 w-4" /> Add Table
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {allTables.map((t) => (
                <TableCard
                  key={t.id}
                  table={{
                    id: t.id,
                    name: t.name,
                    capacity: t.capacity,
                    status: t.status,
                    restaurant_id: t.restaurant_id,
                    created_at: t.created_at || "",
                    updated_at: t.updated_at || "",
                  }}
                  onEdit={handleTableCardEdit}
                  onDelete={deleteTable}
                  onReserve={(tbl) => {
                    setSelectedTableForReservation(tbl);
                    setIsReservationDialogOpen(true);
                  }}
                />
              ))}
            </div>
          </TabsContent>

          {/* Tab 3: Reservations */}
          <TabsContent value="reservations">
            <ReservationsList
              reservations={reservations as any}
              isLoading={reservationsLoading}
              onUpdateStatus={updateReservationStatus}
              onDelete={deleteReservation}
            />
          </TabsContent>

          {/* Tab 4: QR Management */}
          <TabsContent value="qr">
            <QRCodeManagement />
          </TabsContent>
        </Tabs>

        {/* Action Drawer Modal */}
        <TableActionModal
          isOpen={isActionModalOpen}
          onClose={() => setIsActionModalOpen(false)}
          table={actionTable}
          onOpenSplitBill={() => setIsSplitBillOpen(true)}
          onOpenMergeTransfer={() => setIsMergeTransferOpen(true)}
          onFireCourse={(course) => {
            if (actionTable?.activeOrder) {
              fireCourse({
                orderId: actionTable.activeOrder.orderId,
                courseName: course,
                tableName: actionTable.name,
              });
            }
          }}
          onSetStatus={(status) => {
            if (actionTable) {
              setTableStatus({ tableId: actionTable.id, status });
              setIsActionModalOpen(false);
            }
          }}
        />

        {/* Split Bill Modal */}
        <TableSplitBillDialog
          isOpen={isSplitBillOpen}
          onClose={() => setIsSplitBillOpen(false)}
          table={actionTable}
          onSettleSplitBill={settleSplitBill}
          isSettling={isSettlingBill}
        />

        {/* Merge / Transfer Modal */}
        <TableMergeTransferDialog
          isOpen={isMergeTransferOpen}
          onClose={() => setIsMergeTransferOpen(false)}
          sourceTable={actionTable}
          availableTables={allTables}
          onTransfer={transferTable}
        />

        {/* Table Add / Edit Dialog */}
        <TableDialog
          isOpen={isAddDialogOpen}
          onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) setEditingTable(null);
          }}
          editingTable={editingTable}
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const name = formData.get("name") as string;
            const capacity = parseInt(formData.get("capacity") as string) || 4;
            const status = (formData.get("status") as any) || "available";

            if (editingTable) {
              updateTable({
                id: editingTable.id,
                name,
                capacity,
                status,
              });
            } else {
              createTable({
                name,
                capacity,
                shape: "rectangle",
                section: activeSection === "All" ? "Main Dining" : activeSection,
              });
            }
            setIsAddDialogOpen(false);
            setEditingTable(null);
          }}
        />

        {/* Table Booking Modal */}
        <TableBookingDialog
          isOpen={isReservationDialogOpen}
          onClose={() => {
            setIsReservationDialogOpen(false);
            setSelectedTableForReservation(null);
          }}
          onSubmit={async (data) => {
            await createReservation({ ...data, type: "table" });
            setIsReservationDialogOpen(false);
          }}
          tables={allTables.map((t) => ({ id: t.id, name: t.name, capacity: t.capacity }))}
          defaultTableId={selectedTableForReservation?.id}
        />
      </div>
    </FeatureLock>
  );
};

export default Tables;
