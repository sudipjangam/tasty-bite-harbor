import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DeliveryRiderTicket } from "@/hooks/useRiderTracking";
import {
  ShieldCheck,
  Bike,
  CheckCircle2,
  Phone,
  Clock,
  MapPin,
  PackageCheck,
  Flame,
  Delete,
  X,
} from "lucide-react";

interface RiderHandshakeModalProps {
  ticket: DeliveryRiderTicket | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmHandoff: (ticketId: string, otp: string, sealVerified: boolean) => { success: boolean; message: string };
}

export const RiderHandshakeModal: React.FC<RiderHandshakeModalProps> = ({
  ticket,
  isOpen,
  onClose,
  onConfirmHandoff,
}) => {
  const [otpInput, setOtpInput] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [itemsCheck, setItemsCheck] = useState(true);
  const [sealCheck, setSealCheck] = useState(true);
  const [temperatureCheck, setTemperatureCheck] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setOtpInput("");
      setErrorMessage("");
      setItemsCheck(true);
      setSealCheck(true);
      setTemperatureCheck(true);
    }
  }, [isOpen, ticket]);

  if (!ticket) return null;

  const handleKeypadPress = (val: string) => {
    if (otpInput.length < 4) {
      setOtpInput((prev) => prev + val);
      setErrorMessage("");
    }
  };

  const handleBackspace = () => {
    setOtpInput((prev) => prev.slice(0, -1));
    setErrorMessage("");
  };

  const handleClear = () => {
    setOtpInput("");
    setErrorMessage("");
  };

  const handleSubmit = () => {
    if (otpInput.length !== 4) {
      setErrorMessage("Please enter complete 4-digit OTP.");
      return;
    }

    const allChecked = itemsCheck && sealCheck && temperatureCheck;
    const res = onConfirmHandoff(ticket.id, otpInput, allChecked);
    if (res.success) {
      onClose();
    } else {
      setErrorMessage(res.message);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-slate-900 border border-slate-700 text-white rounded-3xl p-6 shadow-2xl">
        <DialogHeader className="space-y-1 text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <DialogTitle className="text-lg font-black text-white">
                Rider Handshake & OTP Handoff
              </DialogTitle>
            </div>
            <Badge
              className={`capitalize text-xs font-bold ${
                ticket.channel === "in_house"
                  ? "bg-emerald-600 text-white"
                  : ticket.channel === "swiggy"
                  ? "bg-orange-600 text-white"
                  : "bg-red-600 text-white"
              }`}
            >
              {ticket.channel === "in_house" ? "In-House Delivery" : ticket.channel}
            </Badge>
          </div>
          <DialogDescription className="text-xs text-gray-400">
            Verify 4-digit code provided by driver to confirm food bag dispatch.
          </DialogDescription>
        </DialogHeader>

        {/* Rider Profile & Vehicle Card */}
        <div className="mt-4 p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-700 border-2 border-emerald-500">
                {ticket.rider.photoUrl ? (
                  <img src={ticket.rider.photoUrl} alt={ticket.rider.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-white">
                    {ticket.rider.name.charAt(0)}
                  </div>
                )}
              </div>
              <span className="absolute -bottom-1 -right-1 p-0.5 bg-emerald-500 rounded-full text-white">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-sm font-black text-white">{ticket.rider.name}</h4>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-600/40">
                  Verified
                </span>
              </div>
              <p className="text-xs text-gray-300 font-medium">
                {ticket.rider.vehicleModel} • <strong className="text-cyan-300">{ticket.rider.vehicleNumber}</strong>
              </p>
              <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                <Phone className="w-2.5 h-2.5" /> {ticket.rider.phone}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-black text-cyan-400">{ticket.displayOrderId}</span>
            <div className="text-[10px] text-gray-400">{ticket.itemCount} items</div>
            <div className="text-xs font-extrabold text-emerald-400">₹{ticket.totalAmount}</div>
          </div>
        </div>

        {/* 4-Digit OTP Display Cells */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-gray-300">Enter Driver Handshake OTP</span>
            <span className="text-[10px] text-gray-400">Sample for Demo: <strong className="text-emerald-400">{ticket.otp}</strong></span>
          </div>

          <div className="grid grid-cols-4 gap-2.5">
            {[0, 1, 2, 3].map((idx) => {
              const digit = otpInput[idx] || "";
              const isActive = otpInput.length === idx;
              return (
                <div
                  key={idx}
                  className={`h-14 rounded-2xl flex items-center justify-center text-2xl font-black transition-all ${
                    digit
                      ? "bg-slate-800 border-2 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/20"
                      : isActive
                      ? "bg-slate-800 border-2 border-cyan-400 text-white animate-pulse"
                      : "bg-slate-800/50 border border-slate-700 text-gray-600"
                  }`}
                >
                  {digit || (isActive ? "•" : "")}
                </div>
              );
            })}
          </div>

          {errorMessage && (
            <p className="text-xs text-rose-400 font-bold mt-1.5 text-center">{errorMessage}</p>
          )}
        </div>

        {/* 3x4 On-Screen Numeric Touch Keypad */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeypadPress(num)}
              className="h-11 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-white font-black text-lg transition-all border border-slate-700/60 shadow-xs"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-11 rounded-xl bg-slate-800/80 hover:bg-rose-950/40 text-rose-400 font-bold text-xs transition-all border border-slate-700/60"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => handleKeypadPress("0")}
            className="h-11 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-white font-black text-lg transition-all border border-slate-700/60 shadow-xs"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-11 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-gray-300 flex items-center justify-center font-bold transition-all border border-slate-700/60"
            title="Backspace"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Quality Seal Checklist */}
        <div className="mt-4 p-3 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-2">
          <span className="text-[11px] font-black uppercase text-gray-400 tracking-wider">
            Seal Verification Checklist
          </span>
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs text-gray-200 cursor-pointer">
              <Checkbox checked={itemsCheck} onCheckedChange={(v) => setItemsCheck(!!v)} />
              <span>1. Items & Bill Receipt Attached</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-200 cursor-pointer">
              <Checkbox checked={sealCheck} onCheckedChange={(v) => setSealCheck(!!v)} />
              <span>2. Food Bag Tamper Security Seal Attached</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-200 cursor-pointer">
              <Checkbox checked={temperatureCheck} onCheckedChange={(v) => setTemperatureCheck(!!v)} />
              <span>3. Hot / Cold Items Separated</span>
            </label>
          </div>
        </div>

        {/* Big Action Confirm Button */}
        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 rounded-2xl h-11 border-slate-700 text-gray-300 hover:bg-slate-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={otpInput.length !== 4}
            className="flex-2 rounded-2xl h-11 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-sm shadow-lg shadow-emerald-500/25 transition-all"
          >
            <CheckCircle2 className="w-4 h-4 mr-1.5" />
            Confirm Handoff & Dispatch
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RiderHandshakeModal;
