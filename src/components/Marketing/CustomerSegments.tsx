
import React from 'react';
import { useCurrencyContext } from '@/contexts/CurrencyContext';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  loyalty_points: number;
  total_spent: number;
  visit_count: number;
  last_visit_date: string | null;
}

interface CustomerSegmentsProps {
  customers: Customer[];
}

const THIRTY_DAYS_MS = 30 * 24 * 3600 * 1000;

const isInactive = (c: Customer): boolean => {
  if (!c.last_visit_date) return true;
  return Date.now() - new Date(c.last_visit_date).getTime() > THIRTY_DAYS_MS;
};

const spendBadgeGradient = (amount: number) => {
  if (amount >= 10000) return 'bg-gradient-to-r from-violet-600 to-purple-500';
  if (amount >= 5000) return 'bg-gradient-to-r from-amber-500 to-orange-400';
  if (amount >= 2000) return 'bg-gradient-to-r from-teal-500 to-emerald-400';
  if (amount >= 1000) return 'bg-gradient-to-r from-blue-500 to-cyan-400';
  return 'bg-gradient-to-r from-rose-500 to-pink-400';
};

interface SegmentConfig {
  title: string;
  description: string;
  customers: Customer[];
  emoji: string;
  topBar: string;
  iconBg: string;
  countColor: string;
}

const CustomerSegments: React.FC<CustomerSegmentsProps> = ({ customers }) => {
  const { symbol: currencySymbol } = useCurrencyContext();

  const loyalCustomers = customers.filter(c => (c.loyalty_points || 0) > 1000);
  const newCustomers = customers.filter(c => (c.visit_count || 0) <= 2);
  const highValueCustomers = customers.filter(c => (c.total_spent || 0) > 5000);
  const inactiveCustomers = customers.filter(isInactive);

  const segments: SegmentConfig[] = [
    {
      title: 'Loyal Customers',
      description: 'Customers with 1000+ loyalty points',
      customers: loyalCustomers,
      emoji: '⭐',
      topBar: 'bg-gradient-to-r from-amber-500 to-orange-400',
      iconBg: 'bg-amber-500/15 border border-amber-500/30',
      countColor: 'text-foreground',
    },
    {
      title: 'New Customers',
      description: 'Customers with 2 or fewer visits',
      customers: newCustomers,
      emoji: '👋',
      topBar: 'bg-gradient-to-r from-emerald-500 to-teal-400',
      iconBg: 'bg-emerald-500/15 border border-emerald-500/30',
      countColor: 'text-foreground',
    },
    {
      title: 'High Value',
      description: `Customers who spent ${currencySymbol}5000+`,
      customers: highValueCustomers,
      emoji: '💎',
      topBar: 'bg-gradient-to-r from-blue-500 to-cyan-400',
      iconBg: 'bg-blue-500/15 border border-blue-500/30',
      countColor: 'text-foreground',
    },
    {
      title: 'Inactive',
      description: 'No visits in the last 30 days',
      customers: inactiveCustomers,
      emoji: '😴',
      topBar: 'bg-gradient-to-r from-rose-500 to-pink-400',
      iconBg: 'bg-rose-500/15 border border-rose-500/30',
      countColor: 'text-foreground',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {segments.map((seg, i) => (
          <div
            key={i}
            className="
              group relative rounded-2xl border overflow-hidden
              bg-white/60 dark:bg-white/[0.04]
              border-black/[0.07] dark:border-white/[0.08]
              backdrop-blur-xl p-5
              transition-all duration-200
              hover:-translate-y-0.5
              hover:border-purple-400/30 dark:hover:border-purple-500/30
              hover:shadow-[0_10px_30px_rgba(124,58,237,0.12)]
            "
          >
            {/* coloured top bar */}
            <div className={`absolute top-0 left-0 right-0 h-[3px] ${seg.topBar} rounded-t-2xl`} />

            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3 ${seg.iconBg}`}>
              {seg.emoji}
            </div>
            <p className={`text-4xl font-extrabold leading-none mb-2 ${seg.countColor}`}>
              {seg.customers.length}
            </p>
            <p className="text-sm font-bold text-foreground mb-0.5">{seg.title}</p>
            <p className="text-xs text-muted-foreground">{seg.description}</p>
          </div>
        ))}
      </div>

      {/* Customer lists — all 4 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {segments.map((seg, i) => (
          <div
            key={i}
            className="
              relative rounded-2xl border overflow-hidden
              bg-white/60 dark:bg-white/[0.04]
              border-black/[0.07] dark:border-white/[0.08]
              backdrop-blur-xl p-5
            "
          >
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

            <div className="flex items-center gap-2.5 mb-4">
              <span className="text-lg">{seg.emoji}</span>
              <h3 className="text-base font-bold text-foreground">{seg.title}</h3>
              <span className="ml-auto text-xs font-semibold text-muted-foreground/60">
                {seg.customers.length} total
              </span>
            </div>

            {seg.customers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6 opacity-60">
                No customers in this segment
              </p>
            ) : (
              <div className="space-y-0 max-h-72 overflow-y-auto pr-1">
                {seg.customers.slice(0, 10).map((customer) => {
                  const contact = customer.email || customer.phone || null;
                  return (
                    <div
                      key={customer.id}
                      className="flex items-center justify-between py-3 border-b border-black/[0.05] dark:border-white/[0.06] last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{customer.name}</p>
                        {contact && (
                          <p className="text-xs text-muted-foreground/60">{contact}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold text-white ${spendBadgeGradient(customer.total_spent || 0)}`}>
                          {currencySymbol}{(customer.total_spent || 0).toLocaleString()}
                        </span>
                        <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                          {customer.visit_count || 0} {customer.visit_count === 1 ? 'visit' : 'visits'}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {seg.customers.length > 10 && (
                  <p className="text-xs text-muted-foreground text-center pt-3">
                    +{seg.customers.length - 10} more customers
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomerSegments;
