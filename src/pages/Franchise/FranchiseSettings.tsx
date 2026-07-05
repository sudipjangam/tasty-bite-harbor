import React, { useState } from "react";
import { useFranchise } from "@/contexts/FranchiseContext";
import { Button } from "@/components/ui/button";
import { Building2, Utensils, CreditCard, Save, History, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// Mock Audit Logs
const MOCK_AUDIT_LOGS = [
  { id: "log-1", user: "Rajesh Kumar", action: "Pushed Menu Item", details: "Paneer Tikka price updated to ₹280 across all branches", date: "2026-06-28 11:34 PM" },
  { id: "log-2", user: "Sonal Mehta", action: "Staff Assignment Changed", details: "Ravi Kumar (Chef) assigned secondary access to Pune Branch", date: "2026-06-28 09:12 PM" },
  { id: "log-3", user: "Rajesh Kumar", action: "Stock Transfer Executed", details: "Moved 15kg Basmati Rice from Mumbai HQ to Nashik Branch", date: "2026-06-28 04:45 PM" },
  { id: "log-4", user: "Rajesh Kumar", action: "Settings Update", details: "Franchise menu mode changed to Master Menu", date: "2026-06-28 10:20 AM" },
];

const FranchiseSettings: React.FC = () => {
  const { org, allBranches } = useFranchise();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"settings" | "audit">("settings");
  const [orgName, setOrgName] = useState(org.name);
  const [menuMode, setMenuMode] = useState(org.menuMode);
  const [saved, setSaved] = useState(false);

  // WhatsApp digest config
  const [digestEnabled, setDigestEnabled] = useState(true);
  const [digestRecipients, setDigestRecipients] = useState<string[]>(["owner", "t2"]); // Owner & Regional Manager (Sonal)
  const [deliveryTime, setDeliveryTime] = useState("21:30");

  const handleSave = () => {
    setSaved(true);
    toast({
      title: "Settings Saved",
      description: "Franchise settings and WhatsApp Digest preferences have been updated.",
    });
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSendTestDigest = () => {
    toast({
      title: "Test Digest Sent",
      description: `Dispatched daily performance summary to: ${digestRecipients.join(", ")} via WhatsApp.`,
    });
  };

  const toggleRecipient = (id: string) => {
    if (digestRecipients.includes(id)) {
      setDigestRecipients(digestRecipients.filter((r) => r !== id));
    } else {
      setDigestRecipients([...digestRecipients, id]);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings &amp; Logs</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configure franchise options and track activity logs</p>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-gray-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab("settings")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
            activeTab === "settings"
              ? "border-violet-600 text-violet-600 dark:text-violet-400 dark:border-violet-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
          )}
        >
          General Settings
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5",
            activeTab === "audit"
              ? "border-violet-600 text-violet-600 dark:text-violet-400 dark:border-violet-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
          )}
        >
          <History className="h-4 w-4" /> Audit Activity Logs
        </button>
      </div>

      {activeTab === "settings" ? (
        <div className="space-y-6">
          {/* Org Details */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                <Building2 className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Organization Details</h2>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Organization Name</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Franchise Type</label>
                <input
                  type="text"
                  value="Franchise"
                  disabled
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm text-gray-500 dark:text-gray-500 cursor-not-allowed"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Owner</label>
                  <input
                    type="text"
                    value={org.ownerName}
                    disabled
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm text-gray-500 dark:text-gray-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Total Branches</label>
                  <input
                    type="text"
                    value={`${allBranches.length} / ${org.maxBranches}`}
                    disabled
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm text-gray-500 dark:text-gray-500 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Menu Mode */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <Utensils className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Menu Mode</h2>
            </div>
            <div className="p-5 space-y-3">
              {[
                { value: "independent", label: "Independent", desc: "Each branch manages its own menu completely" },
                { value: "master", label: "Master Menu", desc: "HQ creates master items, branches can customize prices" },
                { value: "shared", label: "Shared", desc: "All branches use the exact same menu, no customization" },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                    menuMode === opt.value
                      ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20"
                      : "border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="menuMode"
                    value={opt.value}
                    checked={menuMode === opt.value}
                    onChange={() => setMenuMode(opt.value as any)}
                    className="mt-0.5 accent-violet-600"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{opt.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Subscription */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <CreditCard className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Subscription</h2>
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{org.plan} Plan</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Up to {org.maxBranches} branches · Active
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-violet-600 to-purple-600 text-white">
                  {org.plan}
                </span>
              </div>
            </div>
          </div>

          {/* WhatsApp Daily Digest */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <MessageSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">WhatsApp Daily Digest</h2>
                  <p className="text-[11px] text-gray-400">Send daily sales, orders & P&L summaries via WhatsApp</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={digestEnabled}
                  onChange={(e) => setDigestEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-650 peer-checked:bg-violet-600"></div>
              </label>
            </div>
            {digestEnabled && (
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-2">Recipient Subscribers</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 dark:border-gray-750 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750/30 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={digestRecipients.includes("owner")}
                        onChange={() => toggleRecipient("owner")}
                        className="accent-violet-600 w-4 h-4 rounded"
                      />
                      <div className="flex-1">
                        <span className="font-semibold text-gray-900 dark:text-white">{org.ownerName}</span>
                        <span className="ml-1.5 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-violet-100 text-violet-850 dark:bg-violet-900/30 dark:text-violet-400">Owner</span>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 dark:border-gray-750 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750/30 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={digestRecipients.includes("t2")}
                        onChange={() => toggleRecipient("t2")}
                        className="accent-violet-600 w-4 h-4 rounded"
                      />
                      <div className="flex-1">
                        <span className="font-semibold text-gray-900 dark:text-white">Sonal Mehta</span>
                        <span className="ml-1.5 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-blue-100 text-blue-850 dark:bg-blue-900/30 dark:text-blue-400">Regional Manager</span>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 dark:border-gray-750 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750/30 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={digestRecipients.includes("t3")}
                        onChange={() => toggleRecipient("t3")}
                        className="accent-violet-600 w-4 h-4 rounded"
                      />
                      <div className="flex-1">
                        <span className="font-semibold text-gray-900 dark:text-white">Deepak Sharma</span>
                        <span className="ml-1.5 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-blue-100 text-blue-850 dark:bg-blue-900/30 dark:text-blue-400">Regional Manager</span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Scheduled Time</label>
                    <input
                      type="time"
                      value={deliveryTime}
                      onChange={(e) => setDeliveryTime(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs text-gray-950 dark:text-white"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={handleSendTestDigest}
                      variant="outline"
                      type="button"
                      className="w-full text-xs py-1.5 h-auto border-violet-600 text-violet-600 hover:bg-violet-50 dark:border-violet-400 dark:text-violet-400 dark:hover:bg-violet-900/10"
                    >
                      🚀 Send Test Digest
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Button
            onClick={handleSave}
            className="gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-500/25"
          >
            <Save className="h-4 w-4" />
            {saved ? "Saved!" : "Save Changes"}
          </Button>
        </div>
      ) : (
        /* Audit Log */
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Franchise Activity &amp; Audit Trail</h2>
          <div className="relative border-l border-gray-200 dark:border-gray-700 ml-3 pl-5 space-y-5">
            {MOCK_AUDIT_LOGS.map(log => (
              <div key={log.id} className="relative">
                {/* Bullet */}
                <div className="absolute -left-[26px] top-1 w-3 h-3 rounded-full bg-violet-600 border-2 border-white dark:border-gray-800 shadow" />
                <div className="text-xs text-gray-400">{log.date}</div>
                <div className="font-bold text-sm text-gray-900 dark:text-white mt-0.5">{log.action}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono bg-gray-50 dark:bg-gray-900 p-2 rounded-lg border border-gray-100 dark:border-gray-800">
                  {log.details}
                </div>
                <div className="text-[10px] text-gray-400 mt-1">Initiator: <span className="font-semibold text-gray-600 dark:text-gray-300">{log.user}</span></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FranchiseSettings;
