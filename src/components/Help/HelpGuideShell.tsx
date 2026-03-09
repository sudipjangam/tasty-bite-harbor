import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HelpCircle, Sparkles } from "lucide-react";

// ─── Gradient Presets ────────────────────────────────────────────────────────
export const GUIDE_GRADIENTS = {
  indigo: "from-indigo-600 via-purple-600 to-pink-500",
  emerald: "from-emerald-600 via-teal-600 to-cyan-500",
  amber: "from-amber-500 via-orange-500 to-rose-500",
  blue: "from-blue-600 via-indigo-600 to-violet-500",
  rose: "from-rose-500 via-pink-500 to-fuchsia-500",
  violet: "from-violet-600 via-purple-600 to-indigo-500",
  teal: "from-teal-500 via-emerald-500 to-green-500",
  sky: "from-sky-500 via-blue-500 to-indigo-500",
  orange: "from-orange-500 via-amber-500 to-yellow-500",
  pink: "from-pink-500 via-rose-500 to-red-500",
  slate: "from-slate-600 via-gray-600 to-zinc-500",
} as const;

export type GradientKey = keyof typeof GUIDE_GRADIENTS;

// ─── Tab definition ──────────────────────────────────────────────────────────
export interface GuideTab {
  value: string;
  label: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
}

// ─── Feature Card ────────────────────────────────────────────────────────────
interface FeatureItem {
  title: string;
  icon: React.ReactNode;
  description: string;
  steps: string[];
}

export const FeatureCard = ({
  feature,
  gradient,
}: {
  feature: FeatureItem;
  gradient: GradientKey;
}) => (
  <div className="group relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-white/40 dark:border-gray-700/40 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
    {/* Top accent line */}
    <div
      className={`h-1 w-full bg-gradient-to-r ${GUIDE_GRADIENTS[gradient]}`}
    />
    <div className="p-5">
      <div className="flex items-start gap-4">
        <div
          className={`p-2.5 rounded-xl bg-gradient-to-br ${GUIDE_GRADIENTS[gradient]} text-white shadow-lg shadow-${gradient}-500/20 flex-shrink-0`}
        >
          {feature.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 dark:text-white text-base mb-1">
            {feature.title}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">
            {feature.description}
          </p>
          <div className="space-y-2">
            {feature.steps.map((step, i) => (
              <div
                key={i}
                className="flex items-start gap-3 text-sm group/step"
              >
                <span
                  className={`flex-shrink-0 w-6 h-6 rounded-lg bg-gradient-to-br ${GUIDE_GRADIENTS[gradient]} text-white flex items-center justify-center text-xs font-bold shadow-sm`}
                >
                  {i + 1}
                </span>
                <span className="text-gray-700 dark:text-gray-300 leading-relaxed pt-0.5">
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ─── Info Callout Box ────────────────────────────────────────────────────────
export const InfoCallout = ({
  icon,
  title,
  children,
  gradient,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  gradient: GradientKey;
}) => (
  <div
    className={`relative overflow-hidden rounded-xl border border-white/30 dark:border-gray-700/30`}
  >
    <div
      className={`absolute inset-0 bg-gradient-to-br ${GUIDE_GRADIENTS[gradient]} opacity-[0.07]`}
    />
    <div
      className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${GUIDE_GRADIENTS[gradient]}`}
    />
    <div className="relative p-4 pl-5">
      <h4 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-2 text-sm">
        {icon}
        {title}
      </h4>
      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
        {children}
      </p>
    </div>
  </div>
);

// ─── Overview Content Card ───────────────────────────────────────────────────
export const OverviewCard = ({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) => (
  <div className="space-y-4">
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-white/40 dark:border-gray-700/40 shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
        {description}
      </p>
    </div>
    {children}
  </div>
);

// ─── Main Shell ──────────────────────────────────────────────────────────────
interface HelpGuideShellProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  gradient: GradientKey;
  tabs: GuideTab[];
}

const HelpGuideShell = ({
  icon,
  title,
  subtitle,
  gradient,
  tabs,
}: HelpGuideShellProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="group relative overflow-hidden bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-fuchsia-500/10 hover:from-violet-500/20 hover:via-purple-500/20 hover:to-fuchsia-500/20 text-gray-700 dark:text-gray-200 border-violet-200/50 dark:border-violet-500/30 backdrop-blur-sm rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/10 hover:-translate-y-0.5"
        >
          <HelpCircle className="w-4 h-4 mr-2 text-violet-500" />
          <span className="font-medium text-sm">Help & Guide</span>
          <Sparkles className="w-3 h-3 ml-1.5 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0 border-0 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950 rounded-2xl shadow-2xl">
        {/* ── Premium Gradient Header ── */}
        <div className="relative overflow-hidden">
          <div
            className={`absolute inset-0 bg-gradient-to-r ${GUIDE_GRADIENTS[gradient]}`}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />

          <div className="relative px-6 py-5 flex items-center gap-4">
            <div className="p-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl shadow-lg">
              <div className="text-white">{icon}</div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight drop-shadow-sm">
                {title}
              </h2>
              {subtitle && (
                <p className="text-white/80 text-sm mt-0.5 font-medium">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <div
            className={`h-1 bg-gradient-to-r from-white/40 via-white/20 to-white/40`}
          />
        </div>

        {/* ── Content with Tabs ── */}
        <div className="px-6 py-5 overflow-y-auto max-h-[calc(90vh-120px)]">
          <Tabs defaultValue={tabs[0]?.value} className="w-full">
            <TabsList
              className={`grid w-full grid-cols-${tabs.length} bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm p-1.5 rounded-xl border border-gray-200/50 dark:border-gray-700/50 mb-5`}
            >
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className={`flex items-center gap-2 text-sm font-semibold rounded-lg py-2.5 transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:${GUIDE_GRADIENTS[gradient]} data-[state=active]:text-white data-[state=active]:shadow-lg`}
                >
                  {tab.icon}
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {tabs.map((tab) => (
              <TabsContent
                key={tab.value}
                value={tab.value}
                className="space-y-4 mt-0"
              >
                {tab.content}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HelpGuideShell;
