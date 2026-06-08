
import React from 'react';
import { useCurrencyContext } from '@/contexts/CurrencyContext';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { DateRange } from '@/hooks/useMarketingData';

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
      redemptions?: number;
      promoCode?: string | null;
    }>;
    messageGrowth?: number;
    revenueGrowth?: number;
    avgOrderValue?: number;
    repeatCustomerRate?: number;
    customerLifetimeValue?: number;
    churnRate?: number;
    channelStats?: {
      whatsapp: { sent: number; delivered: number; failed: number };
      sms: { sent: number; delivered: number; failed: number };
      email: { sent: number; delivered: number; failed: number };
    };
    totalRedemptions?: number;
    upcomingBirthdays?: number;
  };
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

const GlassCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`relative rounded-2xl border bg-white/60 dark:bg-white/[0.04] border-black/[0.07] dark:border-white/[0.08] backdrop-blur-xl p-5 overflow-hidden ${className}`}>
    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
    {children}
  </div>
);

const dateRangeLabels: Record<DateRange, string> = {
  '7d': '7 Days',
  '30d': '30 Days',
  '90d': '90 Days',
  'all': 'All Time',
};

const MarketingAnalytics: React.FC<MarketingAnalyticsProps> = ({ analytics, dateRange, onDateRangeChange }) => {
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
    channelStats,
    totalRedemptions = 0,
    upcomingBirthdays = 0,
  } = analytics;
  const { symbol: currencySymbol } = useCurrencyContext();

  // Calculate real channel rates from data
  const channels = channelStats ? [
    {
      name: 'WhatsApp',
      sent: channelStats.whatsapp.sent,
      rate: channelStats.whatsapp.sent > 0
        ? Math.round((channelStats.whatsapp.delivered / channelStats.whatsapp.sent) * 100)
        : 0,
      barClass: 'bg-gradient-to-r from-emerald-500 to-teal-400',
    },
    {
      name: 'SMS',
      sent: channelStats.sms.sent,
      rate: channelStats.sms.sent > 0
        ? Math.round((channelStats.sms.delivered / channelStats.sms.sent) * 100)
        : 0,
      barClass: 'bg-gradient-to-r from-amber-500 to-orange-400',
    },
    {
      name: 'Email',
      sent: channelStats.email.sent,
      rate: channelStats.email.sent > 0
        ? Math.round((channelStats.email.delivered / channelStats.email.sent) * 100)
        : 0,
      barClass: 'bg-gradient-to-r from-blue-500 to-cyan-400',
    },
  ] : [];

  const totalChannelSent = channels.reduce((s, c) => s + c.sent, 0);

  const GrowthChip: React.FC<{ value: number }> = ({ value }) => (
    <span className={`flex items-center gap-1 text-xs font-semibold ${value >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
      {value >= 0
        ? <TrendingUp className="h-3 w-3" />
        : <TrendingDown className="h-3 w-3" />}
      {value >= 0 ? '+' : ''}{value.toFixed(1)}% from last period
    </span>
  );

  return (
    <div className="space-y-5">
      {/* Date Range Selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground mr-1">📅 Period:</span>
        {(['7d', '30d', '90d', 'all'] as DateRange[]).map(range => (
          <button
            key={range}
            onClick={() => onDateRangeChange(range)}
            className={`
              px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
              ${dateRange === range
                ? 'bg-violet-600 text-white shadow-sm'
                : 'bg-black/[0.04] dark:bg-white/[0.06] text-muted-foreground hover:text-foreground'
              }
            `}
          >
            {dateRangeLabels[range]}
          </button>
        ))}
      </div>

      {/* Key metrics strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          <p className="text-[10px] text-muted-foreground/50 mt-1">Promo-code-linked orders</p>
        </GlassCard>

        <GlassCard>
          <p className="text-[10px] font-bold uppercase tracking-widest text-purple-400 mb-2 flex items-center gap-1.5">
            🎟️ Redemptions
          </p>
          <p className="text-3xl font-bold text-foreground leading-none mb-1.5">
            {totalRedemptions.toLocaleString()}
          </p>
          <p className="text-xs font-semibold text-purple-500 flex items-center gap-1">
            Promo codes used in orders
          </p>
        </GlassCard>

        <GlassCard>
          <p className="text-[10px] font-bold uppercase tracking-widest text-teal-400 mb-2 flex items-center gap-1.5">
            🎂 Upcoming Birthdays
          </p>
          <p className="text-3xl font-bold text-foreground leading-none mb-1.5">
            {upcomingBirthdays}
          </p>
          <p className="text-xs font-semibold text-teal-500 flex items-center gap-1">
            In the next 30 days
          </p>
        </GlassCard>
      </div>

      {/* Campaign Performance */}
      <GlassCard>
        <div className="flex items-center gap-2.5 mb-5">
          <span className="text-lg">📊</span>
          <h3 className="text-base font-bold text-foreground">Campaign Performance</h3>
          <span className="text-xs text-muted-foreground/50 ml-auto">
            {campaignPerformance.length} campaigns total
          </span>
        </div>

        {campaignPerformance.filter(c => c.sent > 0 || (c.redemptions || 0) > 0).length === 0 ? (
          <div className="rounded-xl border border-dashed border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] p-10 text-center">
            <div className="text-3xl mb-2 opacity-30">📈</div>
            <p className="text-sm font-semibold text-muted-foreground">No campaign data available yet</p>
            <p className="text-xs text-muted-foreground/50 mt-1">Run your first campaign to see performance metrics here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Header row */}
            <div className="grid grid-cols-6 gap-4 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
              <span className="col-span-2">Campaign</span>
              <span>Sent</span>
              <span>Redeemed</span>
              <span>Revenue</span>
              <span>ROI</span>
            </div>

            {campaignPerformance
              .filter(c => c.sent > 0 || (c.redemptions || 0) > 0)
              .map((campaign) => {
                const cost = campaign.cost || 0;
                const roi = cost > 0 ? ((campaign.revenue - cost) / cost * 100) : 0;
                const roiPositive = roi >= 0;
                const conversionRate = campaign.sent > 0
                  ? Math.round(((campaign.redemptions || 0) / campaign.sent) * 100)
                  : 0;

                return (
                  <div
                    key={campaign.id}
                    className="grid grid-cols-6 gap-4 items-center p-4 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.05] dark:border-white/[0.05]"
                  >
                    <div className="col-span-2">
                      <h4 className="text-sm font-semibold text-foreground mb-0.5">{campaign.name}</h4>
                      {campaign.promoCode && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 font-bold">
                          {campaign.promoCode}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">
                      {campaign.sent}
                    </span>
                    <div>
                      <span className="text-sm font-bold text-foreground">{campaign.redemptions || 0}</span>
                      {campaign.sent > 0 && (
                        <span className="text-[10px] text-muted-foreground/50 ml-1">
                          ({conversionRate}%)
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {currencySymbol}{campaign.revenue.toLocaleString()}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border inline-flex items-center w-fit ${
                      roiPositive
                        ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-500 border-rose-500/30'
                    }`}>
                      {cost > 0 ? `${roiPositive ? '+' : ''}${roi.toFixed(0)}%` : '—'}
                    </span>
                  </div>
                );
              })}
          </div>
        )}
      </GlassCard>

      {/* Channels + Engagement */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Real Channel Performance */}
        <GlassCard>
          <div className="flex items-center gap-2 mb-5">
            <span className="text-lg">📡</span>
            <h3 className="text-base font-bold text-foreground">Channel Performance</h3>
          </div>

          {totalChannelSent === 0 ? (
            <div className="rounded-xl border border-dashed border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] p-8 text-center">
              <p className="text-sm text-muted-foreground">No messages sent yet</p>
              <p className="text-xs text-muted-foreground/50 mt-1">Send your first campaign to see channel stats.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {channels.map((ch) => (
                <div key={ch.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-muted-foreground">{ch.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground/50">
                        {ch.sent} sent
                      </span>
                      <span className="text-sm font-bold text-foreground">
                        {ch.rate}% delivered
                      </span>
                    </div>
                  </div>
                  <div className="h-2.5 rounded-full bg-black/[0.06] dark:bg-white/[0.07] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${ch.barClass} transition-all duration-700`}
                      style={{ width: `${ch.rate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-[10px] text-muted-foreground/40 text-center mt-4">
            Based on actual send data
          </p>
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
              { label: 'Repeat Customer Rate', value: `${repeatCustomerRate.toFixed(1)}%`, accent: repeatCustomerRate > 50 ? 'text-emerald-500' : '' },
              { label: 'Customer Lifetime Value', value: `${currencySymbol}${customerLifetimeValue.toLocaleString()}`, accent: '' },
              { label: 'Churn Rate', value: `${churnRate.toFixed(1)}%`, accent: churnRate > 50 ? 'text-rose-500' : churnRate > 25 ? 'text-amber-500' : 'text-emerald-500' },
              { label: 'Special Occasions', value: `${specialOccasions}`, accent: '' },
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
