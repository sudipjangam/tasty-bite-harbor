
import React, { useState } from 'react';
import { useCurrencyContext } from '@/contexts/CurrencyContext';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Download, Search, ChevronDown, ChevronUp } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  loyalty_points: number;
  total_spent: number;
  visit_count: number;
  last_visit_date: string | null;
  birthday?: string | null;
}

interface CustomerSegmentsProps {
  customers: Customer[];
}

const THIRTY_DAYS_MS = 30 * 24 * 3600 * 1000;

const isInactive = (c: Customer): boolean => {
  if (!c.last_visit_date) return true;
  return Date.now() - new Date(c.last_visit_date).getTime() > THIRTY_DAYS_MS;
};

const isAtRisk = (c: Customer): boolean => {
  // Previously active (>5 visits) but now inactive
  if ((c.visit_count || 0) < 5) return false;
  return isInactive(c);
};

const hasBirthdaySoon = (c: Customer): boolean => {
  if (!c.birthday) return false;
  try {
    const now = new Date();
    const bday = new Date(c.birthday);
    const thisYearBday = new Date(now.getFullYear(), bday.getMonth(), bday.getDate());
    if (thisYearBday < now) thisYearBday.setFullYear(thisYearBday.getFullYear() + 1);
    const daysUntil = (thisYearBday.getTime() - now.getTime()) / (1000 * 3600 * 24);
    return daysUntil >= 0 && daysUntil <= 30;
  } catch { return false; }
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
  const { toast } = useToast();
  const [expandedSegments, setExpandedSegments] = useState<Set<number>>(new Set([0, 1]));
  const [searchQuery, setSearchQuery] = useState('');

  const loyalCustomers = customers.filter(c => (c.loyalty_points || 0) > 1000);
  const newCustomers = customers.filter(c => (c.visit_count || 0) <= 2);
  const highValueCustomers = customers.filter(c => (c.total_spent || 0) > 5000);
  const inactiveCustomers = customers.filter(isInactive);
  const frequentVisitors = customers.filter(c => (c.visit_count || 0) >= 10);
  const atRiskCustomers = customers.filter(isAtRisk);
  const birthdaySoon = customers.filter(hasBirthdaySoon);

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
      title: 'Frequent Visitors',
      description: '10+ visits — your regulars',
      customers: frequentVisitors,
      emoji: '🔄',
      topBar: 'bg-gradient-to-r from-violet-500 to-purple-400',
      iconBg: 'bg-violet-500/15 border border-violet-500/30',
      countColor: 'text-foreground',
    },
    {
      title: 'Birthday Soon 🎂',
      description: 'Birthdays in the next 30 days',
      customers: birthdaySoon,
      emoji: '🎉',
      topBar: 'bg-gradient-to-r from-pink-500 to-rose-400',
      iconBg: 'bg-pink-500/15 border border-pink-500/30',
      countColor: 'text-foreground',
    },
    {
      title: 'At Risk',
      description: 'Frequent visitors who stopped coming',
      customers: atRiskCustomers,
      emoji: '⚠️',
      topBar: 'bg-gradient-to-r from-orange-500 to-red-400',
      iconBg: 'bg-orange-500/15 border border-orange-500/30',
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

  const toggleSegment = (index: number) => {
    setExpandedSegments(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const exportSegmentCSV = (seg: SegmentConfig) => {
    if (seg.customers.length === 0) {
      toast({ title: 'No data', description: 'This segment has no customers to export.' });
      return;
    }
    const headers = ['Name', 'Phone', 'Email', 'Total Spent', 'Visits', 'Loyalty Points', 'Last Visit'];
    const rows = seg.customers.map(c => [
      c.name || '',
      c.phone || '',
      c.email || '',
      (c.total_spent || 0).toString(),
      (c.visit_count || 0).toString(),
      (c.loyalty_points || 0).toString(),
      c.last_visit_date || 'Never',
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(f => `"${f}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${seg.title.toLowerCase().replace(/\s+/g, '_')}_customers.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: `${seg.customers.length} customers exported to CSV.` });
  };

  // Filter customers within segments by search
  const filterCustomers = (segCustomers: Customer[]) => {
    if (!searchQuery) return segCustomers;
    const q = searchQuery.toLowerCase();
    return segCustomers.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    );
  };

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search customers across all segments..."
          className="pl-9 rounded-xl border-black/[0.08] dark:border-white/[0.08] bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl"
        />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {segments.slice(0, 7).map((seg, i) => (
          <button
            key={i}
            onClick={() => toggleSegment(i)}
            className={`
              group relative rounded-2xl border overflow-hidden text-left
              bg-white/60 dark:bg-white/[0.04]
              border-black/[0.07] dark:border-white/[0.08]
              backdrop-blur-xl p-5
              transition-all duration-200
              hover:-translate-y-0.5
              hover:border-purple-400/30 dark:hover:border-purple-500/30
              hover:shadow-[0_10px_30px_rgba(124,58,237,0.12)]
              ${expandedSegments.has(i) ? 'ring-2 ring-purple-400/40' : ''}
            `}
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
          </button>
        ))}
      </div>

      {/* Expanded segment lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {segments.map((seg, i) => {
          if (!expandedSegments.has(i)) return null;
          const filtered = filterCustomers(seg.customers);

          return (
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
                <span className="ml-auto flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground/60">
                    {filtered.length} total
                  </span>
                  {/* Action buttons */}
                  <button
                    onClick={() => exportSegmentCSV(seg)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center border border-black/[0.08] dark:border-white/[0.1] bg-black/[0.03] dark:bg-white/[0.05] text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 transition-all"
                    title="Export to CSV"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => toggleSegment(i)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center border border-black/[0.08] dark:border-white/[0.1] bg-black/[0.03] dark:bg-white/[0.05] text-muted-foreground hover:text-foreground transition-all"
                    title="Collapse"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                </span>
              </div>

              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6 opacity-60">
                  {searchQuery ? 'No matching customers' : 'No customers in this segment'}
                </p>
              ) : (
                <div className="space-y-0 max-h-72 overflow-y-auto pr-1">
                  {filtered.slice(0, 15).map((customer) => {
                    const contact = customer.email || customer.phone || null;
                    // Show overlap badges
                    const overlaps: string[] = [];
                    if (seg.title !== 'Loyal Customers' && (customer.loyalty_points || 0) > 1000) overlaps.push('⭐');
                    if (seg.title !== 'High Value' && (customer.total_spent || 0) > 5000) overlaps.push('💎');
                    if (seg.title !== 'Frequent Visitors' && (customer.visit_count || 0) >= 10) overlaps.push('🔄');
                    if (seg.title !== 'Birthday Soon 🎂' && hasBirthdaySoon(customer)) overlaps.push('🎂');

                    return (
                      <div
                        key={customer.id}
                        className="flex items-center justify-between py-3 border-b border-black/[0.05] dark:border-white/[0.06] last:border-0"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-foreground">{customer.name}</p>
                            {overlaps.length > 0 && (
                              <span className="text-[10px]" title="Also in other segments">
                                {overlaps.join('')}
                              </span>
                            )}
                          </div>
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
                  {filtered.length > 15 && (
                    <p className="text-xs text-muted-foreground text-center pt-3">
                      +{filtered.length - 15} more customers
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CustomerSegments;
