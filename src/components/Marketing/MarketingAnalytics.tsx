
import React from 'react';
import { useCurrencyContext } from '@/contexts/CurrencyContext';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MarketingAnalyticsProps {
  analytics: {
    messagesSent: number;
    revenueImpact: number;
    specialOccasions: number;
    campaignPerformance: Array<{
      id: string;
      name: string;
      sent: number;
      revenue: number;
      cost?: number;
    }>;
    messageGrowth?: number;
    revenueGrowth?: number;
    avgOrderValue?: number;
    repeatCustomerRate?: number;
    customerLifetimeValue?: number;
    churnRate?: number;
  };
}

const GlassCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`relative rounded-2xl border bg-white/60 dark:bg-white/[0.04] border-black/[0.07] dark:border-white/[0.08] backdrop-blur-xl p-5 overflow-hidden ${className}`}>
    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
    {children}
  </div>
);

const channels = [
  { name: 'WhatsApp', rate: 92, barClass: 'bg-gradient-to-r from-emerald-500 to-teal-400' },
  { name: 'SMS',      rate: 85, barClass: 'bg-gradient-to-r from-amber-500 to-orange-400' },
  { name: 'Email',    rate: 68, barClass: 'bg-gradient-to-r from-blue-500 to-cyan-400' },
];

const MarketingAnalytics: React.FC<MarketingAnalyticsProps> = ({ analytics }) => {
  const {
    messagesSent = 0,
    revenueImpact = 0,
    specialOccasions = 0,
    campaignPerformance = [],
    messageGrowth = 0,
    revenueGrowth = 0,
    avgOrderValue = 0,
    repeatCustomerRate = 0,
    customerLifetimeValue = 0,
    churnRate = 0,
  } = analytics;
  const { symbol: currencySymbol } = useCurrencyContext();

  const GrowthChip: React.FC<{ value: number }> = ({ value }) => (
    <span className={`flex items-center gap-1 text-xs font-semibold ${value >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
      {value >= 0
        ? <TrendingUp className="h-3 w-3" />
        : <TrendingDown className="h-3 w-3" />}
      {value >= 0 ? '+' : ''}{value.toFixed(1)}% from last month
    </span>
  );

  return (
    <div className="space-y-5">
      {/* Key metrics strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard>
          <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-2 flex items-center gap-1.5">
            💬 Messages Sent
          </p>
          <p className="text-3xl font-bold text-foreground leading-none mb-1.5">
            {messagesSent.toLocaleString()}
          </p>
          <GrowthChip value={messageGrowth} />
        </GlassCard>

        <GlassCard>
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-2 flex items-center gap-1.5">
            💰 Revenue Impact
          </p>
          <p className="text-3xl font-bold leading-none mb-1.5 bg-gradient-to-r from-amber-500 to-orange-400 bg-clip-text text-transparent">
            {currencySymbol}{revenueImpact.toLocaleString()}
          </p>
          <GrowthChip value={revenueGrowth} />
          <p className="text-[10px] text-muted-foreground/50 mt-1">Orders with discounts applied</p>
        </GlassCard>

        <GlassCard>
          <p className="text-[10px] font-bold uppercase tracking-widest text-teal-400 mb-2 flex items-center gap-1.5">
            📅 Special Occasions
          </p>
          <p className="text-3xl font-bold text-foreground leading-none mb-1.5">
            {specialOccasions.toLocaleString()}
          </p>
          <p className="text-xs font-semibold text-teal-500 flex items-center gap-1">
            🗓 Upcoming opportunities
          </p>
        </GlassCard>
      </div>

      {/* Campaign Performance */}
      <GlassCard>
        <div className="flex items-center gap-2.5 mb-5">
          <span className="text-lg">📊</span>
          <h3 className="text-base font-bold text-foreground">Campaign Performance</h3>
        </div>

        {campaignPerformance.filter(c => c.sent > 0).length === 0 ? (
          <div className="rounded-xl border border-dashed border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] p-10 text-center">
            <div className="text-3xl mb-2 opacity-30">📈</div>
            <p className="text-sm font-semibold text-muted-foreground">No campaign data available yet</p>
            <p className="text-xs text-muted-foreground/50 mt-1">Run your first campaign to see performance metrics here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {campaignPerformance.filter(c => c.sent > 0).map((campaign) => {
              const cost = campaign.cost || 0;
              const roi = cost > 0 ? ((campaign.revenue - cost) / cost * 100) : 0;
              const roiPositive = roi >= 0;
              return (
                <div
                  key={campaign.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.05] dark:border-white/[0.05]"
                >
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-foreground mb-1.5">{campaign.name}</h4>
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className="text-xs text-muted-foreground">💬 {campaign.sent} sent</span>
                      <span className="text-xs text-muted-foreground">
                        💰 {currencySymbol}{campaign.revenue.toLocaleString()} attributed
                      </span>
                      <span className="text-xs text-muted-foreground/50">
                        Cost: {currencySymbol}{cost.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <span className={`ml-4 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                    roiPositive
                      ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-500 border-rose-500/30'
                  }`}>
                    {roiPositive ? '+' : ''}{roi.toFixed(0)}% ROI
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>

      {/* Channels + Engagement */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top Performing Channels */}
        <GlassCard>
          <div className="flex items-center gap-2 mb-5">
            <span className="text-lg">📡</span>
            <h3 className="text-base font-bold text-foreground">Top Performing Channels</h3>
          </div>
          <div className="space-y-4">
            {channels.map((ch) => (
              <div key={ch.name} className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground w-20 shrink-0">{ch.name}</span>
                <div className="flex-1 h-2 rounded-full bg-black/[0.06] dark:bg-white/[0.07] overflow-hidden">
                  <div
                    className={`h-full rounded-full ${ch.barClass} transition-all duration-700`}
                    style={{ width: `${ch.rate}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-muted-foreground w-16 text-right shrink-0">
                  {ch.rate}% open
                </span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground/40 text-center mt-4">Industry benchmarks</p>
        </GlassCard>

        {/* Customer Engagement */}
        <GlassCard>
          <div className="flex items-center gap-2 mb-5">
            <span className="text-lg">🤝</span>
            <h3 className="text-base font-bold text-foreground">Customer Engagement</h3>
          </div>
          <div>
            {[
              { label: 'Average Order Value', value: `${currencySymbol}${avgOrderValue.toLocaleString()}`, accent: '' },
              { label: 'Repeat Customer Rate', value: `${repeatCustomerRate.toFixed(1)}%`, accent: '' },
              { label: 'Customer Lifetime Value', value: `${currencySymbol}${customerLifetimeValue.toLocaleString()}`, accent: '' },
              { label: 'Churn Rate', value: `${churnRate.toFixed(1)}%`, accent: churnRate > 15 ? 'text-rose-500' : 'text-amber-500' },
            ].map((row, i, arr) => (
              <div
                key={row.label}
                className={`flex items-center justify-between py-3 ${i < arr.length - 1 ? 'border-b border-black/[0.05] dark:border-white/[0.06]' : ''}`}
              >
                <span className="text-sm text-muted-foreground">{row.label}</span>
                <span className={`text-sm font-bold text-foreground ${row.accent}`}>{row.value}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default MarketingAnalytics;
