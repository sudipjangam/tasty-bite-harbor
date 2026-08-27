import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Layers, Sparkles, LayoutGrid } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RestaurantSimulation } from "@/components/Simulation/RestaurantSimulation";
import { FloorPlanCanvas } from "@/components/Tables/FloorPlanCanvas";
import { TableActionModal } from "@/components/Tables/TableActionModal";
import { TableSplitBillDialog } from "@/components/Tables/TableSplitBillDialog";
import { TableMergeTransferDialog } from "@/components/Tables/TableMergeTransferDialog";
import { useTableFloorPlan } from "@/hooks/useTableFloorPlan";
import { FloorTable } from "@/types/tableFloorPlan";
import { FeatureLock } from "@/components/Auth/FeatureLock";

export const DigitalTwin: React.FC = () => {
  const [activeTab, setActiveTab] = useState("live-floor");
  const [actionTable, setActionTable] = useState<FloorTable | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isSplitBillOpen, setIsSplitBillOpen] = useState(false);
  const [isMergeTransferOpen, setIsMergeTransferOpen] = useState(false);

  const {
    tables,
    allTables,
    sections,
    activeSection,
    setActiveSection,
    stats,
    updateTableLayout,
    isSavingLayout,
    createTable,
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

  return (
    <FeatureLock feature="tables.digital_twin">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/20 to-blue-50/20 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950 p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-5 rounded-3xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-600 to-indigo-700 text-white rounded-2xl shadow-lg shadow-purple-500/20">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 bg-clip-text text-transparent">
                Digital Twin — Live Outlet Blueprint
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                Synchronized 2D floor map with real-time POS table states and AI traffic simulation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-purple-50 dark:bg-purple-950/40 px-3.5 py-2 rounded-2xl border border-purple-100 dark:border-purple-900/40 text-center text-xs">
              <span className="text-[10px] text-gray-400 font-semibold block">LIVE CAPACITY</span>
              <span className="font-extrabold text-purple-700 dark:text-purple-300">
                {stats.occupiedTables}/{stats.totalTables} Tables Occupied
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-2 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-md">
            <TabsList className="grid grid-cols-2 gap-2 bg-transparent h-auto p-0">
              <TabsTrigger
                value="live-floor"
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white font-bold text-xs shadow-sm transition-all"
              >
                <Layers className="h-4 w-4" />
                <span>Live 2D Floor Plan</span>
              </TabsTrigger>

              <TabsTrigger
                value="simulation"
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white font-bold text-xs shadow-sm transition-all"
              >
                <Sparkles className="h-4 w-4" />
                <span>AI Traffic & Revenue Simulation</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="live-floor">
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

          <TabsContent value="simulation">
            <RestaurantSimulation />
          </TabsContent>
        </Tabs>

        {/* Action Modal */}
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
      </div>
    </FeatureLock>
  );
};

export default DigitalTwin;
