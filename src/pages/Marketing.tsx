import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMarketingData } from "@/hooks/useMarketingData";
import CampaignsList from "@/components/Marketing/CampaignsList";
import CreateCampaignDialog from "@/components/Marketing/CreateCampaignDialog";
import CustomerSegments from "@/components/Marketing/CustomerSegments";
import MarketingAnalytics from "@/components/Marketing/MarketingAnalytics";
import WhatsAppCampaigns from "@/components/Marketing/WhatsAppCampaigns";
import { FeatureLock } from "@/components/Auth/FeatureLock";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { Target, Users, MessageSquare, TrendingUp, Coins, Plus } from "lucide-react";

const statCards = [
  {
    key: "activeCampaigns",
    label: "Active Campaigns",
    icon: "🎯",
    accent: "violet",
  },
  {
    key: "totalCustomers",
    label: "Total Customers",
    icon: "👥",
    accent: "teal",
  },
  {
    key: "messagesSent",
    label: "Messages Sent",
    icon: "💬",
    accent: "blue",
  },
  {
    key: "revenueImpact",
    label: "Revenue Impact",
    icon: "💰",
    accent: "amber",
    isCurrency: true,
  },
];

const accentStyles: Record<string, { orb: string; label: string; val: string }> = {
  violet: {
    orb: "bg-gradient-to-br from-violet-600 to-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.5)]",
    label: "text-purple-400 dark:text-purple-400",
    val: "text-foreground",
  },
  teal: {
    orb: "bg-gradient-to-br from-teal-600 to-teal-400 shadow-[0_0_20px_rgba(20,184,166,0.4)]",
    label: "text-teal-400 dark:text-teal-400",
    val: "text-foreground",
  },
  blue: {
    orb: "bg-gradient-to-br from-blue-600 to-blue-400 shadow-[0_0_20px_rgba(96,165,250,0.4)]",
    label: "text-blue-400 dark:text-blue-400",
    val: "text-foreground",
  },
  amber: {
    orb: "bg-gradient-to-br from-amber-600 to-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)]",
    label: "text-amber-400 dark:text-amber-400",
    val: "bg-gradient-to-r from-amber-500 to-orange-400 bg-clip-text text-transparent",
  },
};

const tabs = [
  { id: "campaigns", label: "🎯 Campaigns", feature: "marketing.campaigns" },
  { id: "whatsapp", label: "💬 WhatsApp", feature: "marketing.whatsapp" },
  { id: "segments", label: "👤 Customer Segments", feature: "marketing.segments" },
  { id: "analytics", label: "📈 Analytics", feature: "marketing.analytics" },
];

const Marketing = () => {
  const { user } = useAuth();
  const { campaigns, customers, analytics, isLoading } = useMarketingData();
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("campaigns");
  const { symbol: currencySymbol } = useCurrencyContext();

  const activeCampaigns = campaigns.filter((c) => {
    if (c.status !== "active") return false;
    return new Date(c.end_date) >= new Date();
  }).length;

  const totalCustomers = customers.filter(
    (c) => !(/^table\s/i.test(c.name || ""))
  ).length;

  const statValues: Record<string, string | number> = {
    activeCampaigns,
    totalCustomers,
    messagesSent: analytics.messagesSent,
    revenueImpact: `${currencySymbol}${analytics.revenueImpact.toLocaleString()}`,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 rounded-full border-2 border-transparent border-t-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6 bg-gradient-to-br from-slate-50 via-purple-50/30 to-slate-50 dark:from-[#080B14] dark:via-[#0C0F1C] dark:to-[#080B14]">

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-violet-600 via-pink-500 to-amber-400 bg-clip-text text-transparent">
            Marketing Center
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create campaigns, analyze customer data, and drive business growth
          </p>
        </div>
      </div>

      {/* ── Stat Strip ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const s = accentStyles[card.accent];
          return (
            <div
              key={card.key}
              className="
                group relative rounded-2xl p-4 md:p-5 border cursor-default overflow-hidden
                bg-white/60 dark:bg-white/[0.04]
                border-black/[0.06] dark:border-white/[0.08]
                backdrop-blur-xl
                transition-all duration-200
                hover:-translate-y-1
                hover:border-purple-400/30 dark:hover:border-purple-500/30
                hover:shadow-[0_12px_40px_rgba(124,58,237,0.12)]
              "
            >
              {/* top shimmer line */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3 ${s.orb}`}>
                {card.icon}
              </div>

              <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${s.label}`}>
                {card.label}
              </p>
              <p className={`text-3xl font-bold leading-none ${s.val}`}>
                {statValues[card.key]}
              </p>
            </div>
          );
        })}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 w-fit p-1 rounded-2xl border bg-white/50 dark:bg-white/[0.05] border-black/[0.06] dark:border-white/[0.08] backdrop-blur-xl flex-wrap">
        {tabs.map((tab) => (
          <FeatureLock key={tab.id} feature={tab.feature} interceptClicks={true}>
            <button
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap
                ${activeTab === tab.id
                  ? "bg-gradient-to-r from-violet-600 to-purple-500 text-white font-bold shadow-[0_4px_20px_rgba(168,85,247,0.4)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                }
              `}
            >
              {tab.label}
            </button>
          </FeatureLock>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {activeTab === "campaigns" && (
          <div className="space-y-5">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-foreground">Marketing Campaigns</h2>
              <button
                onClick={() => setOpenCreateDialog(true)}
                className="
                  flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white
                  bg-gradient-to-r from-violet-600 to-purple-500
                  shadow-[0_4px_20px_rgba(168,85,247,0.4)]
                  hover:shadow-[0_8px_28px_rgba(168,85,247,0.5)]
                  hover:-translate-y-0.5
                  transition-all duration-200
                "
              >
                <Plus className="h-4 w-4" />
                Create Campaign
              </button>
            </div>
            <CampaignsList campaigns={campaigns} />
          </div>
        )}

        {activeTab === "whatsapp" && <WhatsAppCampaigns />}
        {activeTab === "segments" && <CustomerSegments customers={customers} />}
        {activeTab === "analytics" && <MarketingAnalytics analytics={analytics} />}
      </div>

      <CreateCampaignDialog open={openCreateDialog} onOpenChange={setOpenCreateDialog} />
    </div>
  );
};

export default Marketing;
