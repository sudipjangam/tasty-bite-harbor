import React, { useState, useEffect } from "react";
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
  Scissors,
  Users,
  Utensils,
  Armchair,
  CheckCircle2,
  Plus,
  ArrowRight,
} from "lucide-react";
import { FloorTable, SplitCheck, SplitCheckItem } from "@/types/tableFloorPlan";

interface TableSplitBillDialogProps {
  isOpen: boolean;
  onClose: () => void;
  table: FloorTable | null;
  onSettleSplitBill: (params: {
    orderId: string;
    tableId: string;
    checks: SplitCheck[];
  }) => void;
  isSettling?: boolean;
}

export const TableSplitBillDialog: React.FC<TableSplitBillDialogProps> = ({
  isOpen,
  onClose,
  table,
  onSettleSplitBill,
  isSettling,
}) => {
  const [splitMode, setSplitMode] = useState<"equal" | "itemized" | "seats">("equal");
  const [paxCount, setPaxCount] = useState<number>(2);

  // Equal Split Payments
  const [equalPayments, setEqualPayments] = useState<
    Array<{ guestName: string; method: "cash" | "upi" | "card"; isPaid: boolean }>
  >([
    { guestName: "Guest 1", method: "upi", isPaid: false },
    { guestName: "Guest 2", method: "cash", isPaid: false },
  ]);

  // Itemized Checks State
  const [itemizedChecks, setItemizedChecks] = useState<SplitCheck[]>([]);

  // Seat Checks State
  const [seatChecks, setSeatChecks] = useState<SplitCheck[]>([]);

  const order = table?.activeOrder;
  const grandTotal = order?.total || 1850;
  const items = order?.items || [
    { id: "1", name: "Butter Chicken", quantity: 2, price: 340 },
    { id: "2", name: "Garlic Naan", quantity: 4, price: 60 },
    { id: "3", name: "Chicken Dum Biryani", quantity: 2, price: 320 },
    { id: "4", name: "Mango Lassi", quantity: 3, price: 90 },
  ];

  // Initialize Equal Split state when paxCount changes
  useEffect(() => {
    setEqualPayments(
      Array.from({ length: paxCount }, (_, idx) => ({
        guestName: `Guest ${idx + 1}`,
        method: idx % 2 === 0 ? "upi" : "cash",
        isPaid: false,
      })),
    );
  }, [paxCount]);

  // Initialize Itemized & Seat Checks when table opens
  useEffect(() => {
    if (order && items.length > 0) {
      const mid = Math.ceil(items.length / 2);
      const check1Items: SplitCheckItem[] = items.slice(0, mid).map((i) => ({
        itemId: i.id,
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.price,
        totalPrice: i.price * i.quantity,
      }));
      const check2Items: SplitCheckItem[] = items.slice(mid).map((i) => ({
        itemId: i.id,
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.price,
        totalPrice: i.price * i.quantity,
      }));

      const c1Sub = check1Items.reduce((s, i) => s + i.totalPrice, 0);
      const c2Sub = check2Items.reduce((s, i) => s + i.totalPrice, 0);

      setItemizedChecks([
        {
          id: "check-1",
          checkNumber: 1,
          guestName: "Check A (Guest 1)",
          items: check1Items,
          subtotal: c1Sub,
          taxAmount: Math.round(c1Sub * 0.05),
          discountAmount: 0,
          totalAmount: Math.round(c1Sub * 1.05),
          paymentMethod: "upi",
          isPaid: false,
        },
        {
          id: "check-2",
          checkNumber: 2,
          guestName: "Check B (Guest 2)",
          items: check2Items,
          subtotal: c2Sub,
          taxAmount: Math.round(c2Sub * 0.05),
          discountAmount: 0,
          totalAmount: Math.round(c2Sub * 1.05),
          paymentMethod: "cash",
          isPaid: false,
        },
      ]);

      // Initialize Seat-level checks based on table capacity
      const cap = Math.max(2, Math.min(table?.capacity || 4, 6));
      const sChecks: SplitCheck[] = [];
      for (let s = 1; s <= cap; s++) {
        const seatItems = items.filter((_, idx) => idx % cap === s - 1).map((i) => ({
          itemId: i.id,
          name: i.name,
          quantity: 1,
          unitPrice: i.price,
          totalPrice: i.price,
        }));
        const sSub = seatItems.reduce((sum, it) => sum + it.totalPrice, 0);
        sChecks.push({
          id: `seat-${s}`,
          checkNumber: s,
          guestName: `Seat ${s}`,
          items: seatItems,
          subtotal: sSub,
          taxAmount: Math.round(sSub * 0.05),
          discountAmount: 0,
          totalAmount: Math.round(sSub * 1.05),
          paymentMethod: s % 2 === 1 ? "upi" : "card",
          isPaid: false,
        });
      }
      setSeatChecks(sChecks);
    }
  }, [order, items, table]);

  const equalPerPerson = Math.round(grandTotal / paxCount);

  // Settle Handlers
  const handleSettleEqual = () => {
    if (!table || !order) return;
    const checks: SplitCheck[] = equalPayments.map((p, idx) => ({
      id: `equal-check-${idx + 1}`,
      checkNumber: idx + 1,
      guestName: p.guestName,
      items: [],
      subtotal: equalPerPerson,
      taxAmount: 0,
      discountAmount: 0,
      totalAmount: equalPerPerson,
      paymentMethod: p.method,
      isPaid: true,
      paidAt: new Date().toISOString(),
    }));

    onSettleSplitBill({ orderId: order.orderId, tableId: table.id, checks });
    onClose();
  };

  const handleSettleItemized = () => {
    if (!table || !order) return;
    onSettleSplitBill({
      orderId: order.orderId,
      tableId: table.id,
      checks: itemizedChecks.map((c) => ({ ...c, isPaid: true })),
    });
    onClose();
  };

  const handleSettleSeats = () => {
    if (!table || !order) return;
    onSettleSplitBill({
      orderId: order.orderId,
      tableId: table.id,
      checks: seatChecks.map((c) => ({ ...c, isPaid: true })),
    });
    onClose();
  };

  const handleAddCheck = () => {
    const nextNum = itemizedChecks.length + 1;
    setItemizedChecks((prev) => [
      ...prev,
      {
        id: `check-${nextNum}`,
        checkNumber: nextNum,
        guestName: `Check ${String.fromCharCode(64 + nextNum)}`,
        items: [],
        subtotal: 0,
        taxAmount: 0,
        discountAmount: 0,
        totalAmount: 0,
        paymentMethod: "upi",
        isPaid: false,
      },
    ]);
  };

  const handleMoveItem = (fromCheckId: string, toCheckId: string, itemIdx: number) => {
    setItemizedChecks((prev) => {
      const fromCheck = prev.find((c) => c.id === fromCheckId);
      const toCheck = prev.find((c) => c.id === toCheckId);
      if (!fromCheck || !toCheck || !fromCheck.items[itemIdx]) return prev;

      const itemToMove = fromCheck.items[itemIdx];
      const newFromItems = fromCheck.items.filter((_, idx) => idx !== itemIdx);
      const newToItems = [...toCheck.items, itemToMove];

      return prev.map((c) => {
        if (c.id === fromCheckId) {
          const sub = newFromItems.reduce((s, i) => s + i.totalPrice, 0);
          return {
            ...c,
            items: newFromItems,
            subtotal: sub,
            taxAmount: Math.round(sub * 0.05),
            totalAmount: Math.round(sub * 1.05),
          };
        }
        if (c.id === toCheckId) {
          const sub = newToItems.reduce((s, i) => s + i.totalPrice, 0);
          return {
            ...c,
            items: newToItems,
            subtotal: sub,
            taxAmount: Math.round(sub * 0.05),
            totalAmount: Math.round(sub * 1.05),
          };
        }
        return c;
      });
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl text-white">
                <Scissors className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Split Bill — Table {table?.name || "01"}
                </h3>
                <p className="text-xs text-gray-500">
                  Total Check: <span className="font-bold text-emerald-600">₹{grandTotal}</span>
                </p>
              </div>
            </div>

            <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-bold">
              {table?.capacity || 4} Guests Max
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Tabs for Split Mode */}
        <Tabs value={splitMode} onValueChange={(v: any) => setSplitMode(v)} className="space-y-4">
          <TabsList className="grid grid-cols-3 bg-gray-100 dark:bg-gray-800 rounded-2xl p-1">
            <TabsTrigger
              value="equal"
              className="rounded-xl text-xs font-bold py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm"
            >
              <Users className="h-4 w-4 mr-1.5" />
              Equal (By Pax)
            </TabsTrigger>
            <TabsTrigger
              value="itemized"
              className="rounded-xl text-xs font-bold py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm"
            >
              <Utensils className="h-4 w-4 mr-1.5" />
              Itemized Checks
            </TabsTrigger>
            <TabsTrigger
              value="seats"
              className="rounded-xl text-xs font-bold py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm"
            >
              <Armchair className="h-4 w-4 mr-1.5" />
              Seat-Level Billing
            </TabsTrigger>
          </TabsList>

          {/* Mode 1: Equal Split */}
          <TabsContent value="equal" className="space-y-4">
            <div className="bg-purple-50/60 dark:bg-purple-950/20 p-4 rounded-2xl border border-purple-100 dark:border-purple-900/40 flex items-center justify-between">
              <div>
                <span className="text-xs text-purple-700 dark:text-purple-300 font-bold block">
                  Number of Paying Guests:
                </span>
                <span className="text-[11px] text-gray-500">
                  Total ₹{grandTotal} split into {paxCount} parts
                </span>
              </div>

              <div className="flex items-center gap-2">
                {[2, 3, 4, 5, 6].map((num) => (
                  <Button
                    key={num}
                    size="sm"
                    variant={paxCount === num ? "default" : "outline"}
                    onClick={() => setPaxCount(num)}
                    className={`h-8 w-8 p-0 rounded-xl text-xs font-bold ${
                      paxCount === num
                        ? "bg-purple-600 hover:bg-purple-700 text-white"
                        : "border-purple-200"
                    }`}
                  >
                    {num}
                  </Button>
                ))}
              </div>
            </div>

            {/* List of Equal Splits */}
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {equalPayments.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 font-bold flex items-center justify-center text-[11px]">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">{p.guestName}</p>
                      <span className="text-[10px] text-gray-400">Equal Share</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm text-gray-900 dark:text-white">
                      ₹{equalPerPerson}
                    </span>

                    <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 p-0.5 bg-gray-50 dark:bg-gray-900 text-[11px]">
                      {(["cash", "upi", "card"] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() =>
                            setEqualPayments((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, method: m } : item)),
                            )
                          }
                          className={`px-2 py-0.5 rounded-md font-semibold uppercase ${
                            p.method === m
                              ? "bg-purple-600 text-white shadow-xs"
                              : "text-gray-500 hover:text-gray-800"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Mode 2: Itemized Split */}
          <TabsContent value="itemized" className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                Sub-Checks ({itemizedChecks.length})
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddCheck}
                className="rounded-xl text-xs h-7 gap-1"
              >
                <Plus className="h-3 w-3" /> Add Check
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
              {itemizedChecks.map((check) => (
                <div
                  key={check.id}
                  className="bg-gray-50/80 dark:bg-gray-800/80 p-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-3"
                >
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-bold text-xs text-gray-900 dark:text-white">
                      {check.guestName}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-bold">
                      ₹{check.totalAmount}
                    </Badge>
                  </div>

                  <div className="space-y-1.5 min-h-20 max-h-32 overflow-y-auto">
                    {check.items.length === 0 ? (
                      <p className="text-[11px] text-gray-400 text-center py-4">No items on this check</p>
                    ) : (
                      check.items.map((item, itemIdx) => (
                        <div
                          key={item.itemId || itemIdx}
                          className="flex items-center justify-between text-[11px] bg-white dark:bg-gray-900 p-1.5 rounded-lg border border-gray-100 dark:border-gray-800"
                        >
                          <span className="font-medium text-gray-800 dark:text-gray-200">
                            {item.quantity}x {item.name}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold">₹{item.totalPrice}</span>
                            {itemizedChecks.length > 1 && (
                              <button
                                type="button"
                                title="Move to other check"
                                onClick={() => {
                                  const other = itemizedChecks.find((c) => c.id !== check.id);
                                  if (other) handleMoveItem(check.id, other.id, itemIdx);
                                }}
                                className="text-purple-600 hover:text-purple-800"
                              >
                                <ArrowRight className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t text-xs">
                    <span className="text-[10px] text-gray-400">Payment:</span>
                    <div className="flex gap-1">
                      {(["cash", "upi", "card"] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() =>
                            setItemizedChecks((prev) =>
                              prev.map((c) => (c.id === check.id ? { ...c, paymentMethod: m } : c)),
                            )
                          }
                          className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                            check.paymentMethod === m
                              ? "bg-indigo-600 text-white"
                              : "bg-gray-200 dark:bg-gray-700 text-gray-600"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Mode 3: Seat-Level Billing */}
          <TabsContent value="seats" className="space-y-4">
            <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 text-xs">
              <p className="font-semibold text-indigo-900 dark:text-indigo-300">
                Seat-Level Itemized Breakdown ({seatChecks.length} Seats Assigned)
              </p>
              <p className="text-[11px] text-gray-500">
                Each diner at Table {table?.name} pays strictly for what was ordered at their seat.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
              {seatChecks.map((seat) => (
                <div
                  key={seat.id}
                  className="bg-white dark:bg-gray-800 p-3 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-2.5 shadow-xs"
                >
                  <div className="flex items-center justify-between border-b pb-1.5">
                    <span className="font-extrabold text-xs text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                      <Armchair className="h-3.5 w-3.5" />
                      {seat.guestName}
                    </span>
                    <span className="font-extrabold text-xs text-emerald-600">
                      ₹{seat.totalAmount}
                    </span>
                  </div>

                  <div className="space-y-1 max-h-24 overflow-y-auto text-[11px]">
                    {seat.items.length === 0 ? (
                      <p className="text-gray-400 text-center py-2">No items ordered</p>
                    ) : (
                      seat.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-gray-700 dark:text-gray-300">
                          <span>{item.name}</span>
                          <span className="font-semibold">₹{item.totalPrice}</span>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t text-[11px]">
                    <span className="text-gray-400">Tender:</span>
                    <div className="flex gap-1">
                      {(["cash", "upi", "card"] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() =>
                            setSeatChecks((prev) =>
                              prev.map((s) => (s.id === seat.id ? { ...s, paymentMethod: m } : s)),
                            )
                          }
                          className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold ${
                            seat.paymentMethod === m
                              ? "bg-purple-600 text-white"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-500"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex items-center justify-between border-t pt-4 gap-2">
          <Button variant="outline" onClick={onClose} className="rounded-xl text-xs">
            Cancel
          </Button>

          <Button
            onClick={
              splitMode === "equal"
                ? handleSettleEqual
                : splitMode === "itemized"
                ? handleSettleItemized
                : handleSettleSeats
            }
            disabled={isSettling}
            className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 text-white font-bold text-xs gap-1.5 shadow-md"
          >
            <CheckCircle2 className="h-4 w-4" />
            Settle & Close Table (₹{grandTotal})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
