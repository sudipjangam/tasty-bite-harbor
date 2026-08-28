import React from "react";
import { Settings, Printer, Globe, MessageSquare, Shield, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const SandboxSettingsView: React.FC = () => {
  const integrations = [
    {
      name: "Swiggy Direct Merchant API",
      status: "Connected & Live",
      type: "Online Delivery",
      icon: Globe,
    },
    {
      name: "Zomato Partner Webhook",
      status: "Connected & Live",
      type: "Online Delivery",
      icon: Globe,
    },
    {
      name: "Thermal KOT Printer (ESC/POS 80mm)",
      status: "USB / Bluetooth Active",
      type: "Hardware",
      icon: Printer,
    },
    {
      name: "WhatsApp Automated Receipts",
      status: "Verified Meta Cloud API",
      type: "Customer Engagement",
      icon: MessageSquare,
    },
  ];

  return (
    <div className="p-4 sm:p-8 space-y-6 pb-20">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="h-6 w-6 text-indigo-600" />
          Hardware & Omnichannel Integrations
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Native drivers for thermal printers, barcode scanners, and direct delivery partner bridges
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {integrations.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.name}
              className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl shadow-xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 rounded-2xl">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                      {item.name}
                    </h3>
                    <span className="text-xs text-slate-400">{item.type}</span>
                  </div>
                </div>

                <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 text-xs font-bold">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {item.status}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
