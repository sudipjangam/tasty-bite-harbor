import React, { useState } from "react";
import { X, CalendarCheck, CheckCircle2, Sparkles, Building, Phone, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSandbox } from "../context/SandboxContext";

export const SandboxBookingModal: React.FC = () => {
  const { bookingDialogOpen, setBookingDialogOpen, triggerToast } = useSandbox();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [outletName, setOutletName] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!bookingDialogOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    triggerToast("🎉 Setup request submitted! Our onboarding team will call you within 15 minutes.");
    setTimeout(() => {
      setSubmitted(false);
      setBookingDialogOpen(false);
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full shadow-2xl p-6 sm:p-8 relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={() => setBookingDialogOpen(false)}
          className="absolute right-5 top-5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1"
        >
          <X className="h-5 w-5" />
        </button>

        {submitted ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto" />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              You're All Set!
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
              Our engineering lead will connect with you in 15 minutes to configure your hardware and menu migration.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
                <Sparkles className="h-4 w-4" />
                <span>15-Minute Free Setup</span>
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                Get Swadeshi RMS for Your Restaurant
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Zero setup fees. Keep all the features you just tested live.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="relative">
                <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="Your Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="relative">
                <Phone className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="tel"
                  required
                  placeholder="WhatsApp Mobile Number (+91)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="relative">
                <Building className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="Restaurant / Cloud Kitchen Name"
                  value={outletName}
                  onChange={(e) => setOutletName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-slate-950 font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-500/20 mt-2"
            >
              <CalendarCheck className="h-4 w-4 mr-2" />
              Confirm 15-Min Onboarding
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};
