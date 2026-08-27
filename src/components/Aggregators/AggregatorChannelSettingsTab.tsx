import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Key,
  Copy,
  Check,
  Globe,
  Settings,
  Clock,
  Percent,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { AggregatorStore } from "@/types/aggregators";
import { useToast } from "@/hooks/use-toast";
import { FeatureLock } from "@/components/Auth/FeatureLock";

interface AggregatorChannelSettingsTabProps {
  stores: AggregatorStore[];
  onSaveStoreSettings: (store: Partial<AggregatorStore>) => void;
}

const CHANNELS = [
  {
    id: "swiggy",
    name: "Swiggy Partner Integration",
    featureKey: "aggregators.swiggy",
    color: "from-orange-500 to-amber-600",
    docsUrl: "https://partner.swiggy.com",
  },
  {
    id: "zomato",
    name: "Zomato Merchant Integration",
    featureKey: "aggregators.zomato",
    color: "from-rose-600 to-red-700",
    docsUrl: "https://www.zomato.com/for-restaurants",
  },
  {
    id: "magicpin",
    name: "magicpin Merchant Integration",
    featureKey: "aggregators.magicpin",
    color: "from-blue-600 to-indigo-700",
    docsUrl: "https://merchant.magicpin.in",
  },
  {
    id: "urbanpiper",
    name: "UrbanPiper Unified Hub (Atlas / Hub API)",
    featureKey: "aggregators.urbanpiper",
    color: "from-purple-600 to-violet-700",
    docsUrl: "https://urbanpiper.com",
  },
];

export const AggregatorChannelSettingsTab: React.FC<AggregatorChannelSettingsTabProps> = ({
  stores,
  onSaveStoreSettings,
}) => {
  const { toast } = useToast();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const webhookUrl = `${window.location.origin}/api/aggregators/webhook`;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    toast({ title: "Copied to clipboard!", description: text });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Webhook Endpoint Banner */}
      <Card className="rounded-3xl border-2 border-indigo-100 dark:border-indigo-900/40 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
              <Globe className="h-5 w-5 text-indigo-600" />
              Universal Webhook URL (For Swiggy / Zomato / UrbanPiper)
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Provide this webhook endpoint to your platform account manager or UrbanPiper portal.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded-2xl border border-gray-200 dark:border-gray-700 max-w-lg w-full">
            <code className="text-xs font-mono text-indigo-600 dark:text-indigo-400 flex-1 truncate px-2">
              {webhookUrl}
            </code>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => copyToClipboard(webhookUrl, "webhook")}
              className="h-8 px-3 rounded-xl text-xs"
            >
              {copiedKey === "webhook" ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-gray-400" />
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Channel Configurations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {CHANNELS.map((ch) => {
          const store = stores.find((s) => s.provider === ch.id);

          return (
            <FeatureLock key={ch.id} feature={ch.featureKey}>
              <Card className="rounded-3xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-lg bg-white dark:bg-gray-800">
                <div className={`h-2 w-full bg-gradient-to-r ${ch.color}`} />
                <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-700/60 flex flex-row items-center justify-between">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Key className="h-4 w-4 text-gray-500" />
                    {ch.name}
                  </CardTitle>
                  <a
                    href={ch.docsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-indigo-600 hover:underline flex items-center gap-1 font-medium"
                  >
                    Portal <ExternalLink className="h-3 w-3" />
                  </a>
                </CardHeader>

                <CardContent className="p-5 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Store ID / Restaurant Outlet ID
                    </label>
                    <Input
                      defaultValue={store?.store_id || `${ch.id.toUpperCase()}-STORE-01`}
                      placeholder="e.g. 1928472"
                      className="rounded-xl text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Merchant API Secret / Webhook Secret
                    </label>
                    <Input
                      type="password"
                      defaultValue={store?.api_secret || "••••••••••••••••"}
                      placeholder="Enter Partner API Key"
                      className="rounded-xl text-xs font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-gray-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Default Prep Time (Mins)
                      </label>
                      <Input
                        type="number"
                        defaultValue={store?.default_prep_time_minutes || 15}
                        className="rounded-xl text-xs h-8"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-gray-500 flex items-center gap-1">
                        <Percent className="h-3 w-3" /> Commission Rate (%)
                      </label>
                      <Input
                        type="number"
                        defaultValue={store?.commission_percentage || 18}
                        className="rounded-xl text-xs h-8"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                        Auto-Accept Incoming Orders
                      </span>
                    </div>
                    <Switch defaultChecked={store?.auto_accept_orders ?? true} />
                  </div>

                  <Button
                    size="sm"
                    className="w-full rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold text-xs mt-2"
                  >
                    Save {ch.name.split(" ")[0]} Credentials
                  </Button>
                </CardContent>
              </Card>
            </FeatureLock>
          );
        })}
      </div>
    </div>
  );
};
