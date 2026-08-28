import React from "react";
import { Printer, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSandbox } from "../context/SandboxContext";
import { formatCurrency } from "@/utils/formatters";

export const SandboxKOTModal: React.FC = () => {
  const { printedKOT, setPrintedKOT, branch } = useSandbox();

  if (!printedKOT) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white text-slate-900 rounded-2xl max-w-sm w-full shadow-2xl p-6 space-y-4 font-mono border-2 border-slate-300 relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={() => setPrintedKOT(null)}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 p-1"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Thermal Slip Simulation */}
        <div className="text-center border-b-2 border-dashed border-slate-400 pb-3 space-y-1">
          <p className="font-extrabold text-sm uppercase tracking-wider">
            *** KITCHEN ORDER TICKET (KOT) ***
          </p>
          <p className="text-xs font-bold">{branch}</p>
          <p className="text-[11px] text-slate-600">
            Order: {printedKOT.id} • {printedKOT.channel}
          </p>
          <p className="text-[11px] text-slate-600 font-bold">
            Destination: {printedKOT.tableOrRef}
          </p>
          <p className="text-[10px] text-slate-500">
            Time: {new Date().toLocaleTimeString()}
          </p>
        </div>

        {/* Items */}
        <div className="space-y-2 py-2 border-b-2 border-dashed border-slate-400 text-xs">
          <div className="flex justify-between font-bold text-[11px] border-b pb-1">
            <span>QTY / ITEM</span>
            <span>STATION</span>
          </div>
          {printedKOT.items.map((item, idx) => (
            <div key={idx} className="flex justify-between items-start">
              <div>
                <span className="font-extrabold text-sm mr-2">{item.qty}x</span>
                <span className="font-bold">{item.name}</span>
              </div>
              <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-bold border">
                {item.station}
              </span>
            </div>
          ))}
        </div>

        <div className="flex justify-between text-xs font-bold pt-1">
          <span>TOTAL ESTIMATE:</span>
          <span>{formatCurrency(printedKOT.total)}</span>
        </div>

        <p className="text-[10px] text-center text-slate-400 italic">
          [Printed via Swadeshi RMS 80mm ESC/POS Driver]
        </p>

        <div className="pt-2 flex gap-2">
          <Button
            onClick={() => setPrintedKOT(null)}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs h-9"
          >
            <Printer className="h-3.5 w-3.5 mr-1.5" />
            Dismiss Slip
          </Button>
        </div>
      </div>
    </div>
  );
};
