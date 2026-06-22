import React, { useState, useMemo } from 'react';
import { useCurrencyContext } from '@/contexts/CurrencyContext';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Download, Search, ChevronDown, ChevronUp, Users, Calendar, ArrowUpRight, ShieldAlert } from 'lucide-react';

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
  if (amount >= 10000) return 'from-purple-600 to-violet-500 shadow-[0_2px_8px_rgba(147,51,234,0.2)]';
  if (amount >= 5000) return 'from-amber-500 to-orange-400 shadow-[0_2px_8px_rgba(245,158,11,0.2)]';
  if (amount >= 2000) return 'from-teal-500 to-emerald-400 shadow-[0_2px_8px_rgba(20,184,166,0.2)]';
  if (amount >= 1000) return 'from-blue-500 to-cyan-400 shadow-[0_2px_8px_rgba(59,130,246,0.2)]';
  return 'from-rose-500 to-pink-400 shadow-[0_2px_8px_rgba(244,63,94,0.2)]';
};

interface SegmentConfig {
  title: string;
  description: string;
  customers: Customer[];
  emoji: string;
  gradient: string;
  iconBg: string;
  colorHex: string;
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
      gradient: 'from-amber-500 to-orange-400',
      iconBg: 'bg-amber-500/15 border border-amber-500/20 text-amber-600 dark:text-amber-400',
      colorHex: '#f59e0b',
    },
    {
      title: 'New Customers',
      description: 'Customers with 2 or fewer visits',
      customers: newCustomers,
      emoji: '👋',
      gradient: 'from-emerald-500 to-teal-400',
      iconBg: 'bg-emerald-500/15 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
      colorHex: '#10b981',
    },
    {
      title: 'High Value',
      description: `Customers who spent ${currencySymbol}5000+`,
      customers: highValueCustomers,
      emoji: '💎',
      gradient: 'from-blue-500 to-cyan-400',
      iconBg: 'bg-blue-500/15 border border-blue-500/20 text-blue-600 dark:text-blue-400',
      colorHex: '#3b82f6',
    },
    {
      title: 'Frequent Visitors',
      description: '10+ visits — your regulars',
      customers: frequentVisitors,
      emoji: '🔄',
      gradient: 'from-violet-500 to-purple-400',
      iconBg: 'bg-violet-500/15 border border-violet-500/20 text-violet-600 dark:text-violet-400',
      colorHex: '#8b5cf6',
    },
    {
      title: 'Birthday Soon 🎂',
      description: 'Birthdays in the next 30 days',
      customers: birthdaySoon,
      emoji: '🎉',
      gradient: 'from-pink-500 to-rose-400',
      iconBg: 'bg-pink-500/15 border border-pink-500/20 text-pink-600 dark:text-pink-400',
      colorHex: '#ec4899',
    },
    {
      title: 'At Risk',
      description: 'Frequent visitors who stopped coming',
      customers: atRiskCustomers,
      emoji: '⚠️',
      gradient: 'from-orange-500 to-red-400',
      iconBg: 'bg-orange-500/15 border border-orange-500/20 text-orange-600 dark:text-orange-400',
      colorHex: '#f97316',
    },
    {
      title: 'Inactive',
      description: 'No visits in the last 30 days',
      customers: inactiveCustomers,
      emoji: '😴',
      gradient: 'from-rose-500 to-pink-400',
      iconBg: 'bg-rose-500/15 border border-rose-500/20 text-rose-600 dark:text-rose-400',
      colorHex: '#f43f5e',
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
      {/* ── Search Bar ── */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search customers across all segments..."
          className="pl-9 h-10 rounded-xl border-black/[0.08] dark:border-white/[0.08] bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl focus:border-purple-500/50"
        />
      </div>

      {/* ── Summary Cards Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {segments.map((seg, i) => {
          const isExpanded = expandedSegments.has(i);
          return (
            <button
              key={i}
              onClick={() => toggleSegment(i)}
              className={`
                group relative rounded-2xl border text-left overflow-hidden p-5
                bg-white/60 dark:bg-white/[0.04]
                border-black/[0.06] dark:border-white/[0.08]
                backdrop-blur-xl
                transition-all duration-300
                hover:-translate-y-1
                hover:shadow-[0_12px_36px_rgba(0,0,0,0.05)]
                ${isExpanded
                  ? 'border-purple-500/40 dark:border-purple-500/40 bg-purple-500/[0.02] shadow-sm'
                  : 'hover:border-purple-500/20'
                }
              `}
              style={isExpanded ? { boxShadow: `0 0 16px ${seg.colorHex}10`, borderColor: `${seg.colorHex}40` } : undefined}
            >
              {/* top shimmering accent line */}
              <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${seg.gradient} rounded-t-2xl`} />

              <div className="flex items-center justify-between mb-3.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${seg.iconBg}`}>
                  {seg.emoji}
                </div>
                <Badge variant="outline" className="text-[10px] font-bold opacity-60 border-none bg-black/[0.03] dark:bg-white/[0.03]">
                  Segment
                </Badge>
              </div>

              <p className="text-3xl font-black text-gray-900 dark:text-white leading-none mb-1">
                {seg.customers.length}
              </p>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-0.5">{seg.title}</p>
              <p className="text-[10.5px] text-muted-foreground leading-tight">{seg.description}</p>
            </button>
          );
        })}
      </div>

      {/* ── Expanded segment lists ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {segments.map((seg, i) => {
          if (!expandedSegments.has(i)) return null;
          const filtered = filterCustomers(seg.customers);

          return (
            <div
              key={i}
              className="
                relative rounded-2xl border overflow-hidden p-5
                bg-white/60 dark:bg-white/[0.04]
                border-black/[0.06] dark:border-white/[0.08]
                backdrop-blur-xl
              "
              style={{ borderLeft: `3px solid ${seg.colorHex}` }}
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

              <div className="flex items-center justify-between mb-4 border-b border-black/[0.04] dark:border-white/[0.06] pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-base">{seg.emoji}</span>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                    {seg.title}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-muted-foreground bg-black/[0.03] dark:bg-white/[0.04] px-1.5 py-0.5 rounded-md">
                    {filtered.length} total
                  </span>
                  
                  {/* CSV Export */}
                  <button
                    onClick={() => exportSegmentCSV(seg)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03] text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 hover:border-emerald-500/20 transition-all"
                    title="Export to CSV"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  
                  {/* Collapse Segment */}
                  <button
                    onClick={() => toggleSegment(i)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03] text-muted-foreground hover:text-foreground transition-all"
                    title="Collapse"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-muted-foreground">
                  <Users className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="font-semibold">
                    {searchQuery ? 'No matching customers' : 'No customers in this segment'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                  {filtered.slice(0, 20).map((customer) => {
                    const contact = customer.phone || customer.email || null;
                    const overlaps: string[] = [];
                    if (seg.title !== 'Loyal Customers' && (customer.loyalty_points || 0) > 1000) overlaps.push('⭐');
                    if (seg.title !== 'High Value' && (customer.total_spent || 0) > 5000) overlaps.push('💎');
                    if (seg.title !== 'Frequent Visitors' && (customer.visit_count || 0) >= 10) overlaps.push('🔄');
                    if (seg.title !== 'Birthday Soon 🎂' && hasBirthdaySoon(customer)) overlaps.push('🎂');

                    return (
                      <div
                        key={customer.id}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-transparent hover:border-black/[0.03] dark:hover:border-white/[0.03] hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-all gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Avatar Initials with Segment Colors */}
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                            style={{ background: `linear-gradient(135deg, ${seg.colorHex}dd, ${seg.colorHex})`, boxShadow: `0 2px 6px ${seg.colorHex}25` }}
                          >
                            {(customer.name || "?").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">
                                {customer.name}
                              </p>
                              {overlaps.length > 0 && (
                                <span className="text-[10px]" title="Also overlaps with other segments">
                                  {overlaps.join('')}
                                </span>
                              )}
                            </div>
                            {contact && (
                              <p className="text-[10.5px] text-muted-foreground font-mono leading-none mt-0.5">
                                {contact}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-black text-white bg-gradient-to-r ${spendBadgeGradient(customer.total_spent || 0)}`}>
                            {currencySymbol}{(customer.total_spent || 0).toLocaleString()}
                          </span>
                          <p className="text-[9.5px] text-muted-foreground mt-0.5 font-bold">
                            {customer.visit_count || 0} {customer.visit_count === 1 ? 'visit' : 'visits'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {filtered.length > 20 && (
                    <div className="text-center pt-2">
                      <Badge variant="secondary" className="text-[10px] px-2 py-0.5 font-bold border-none">
                        +{filtered.length - 20} more customers
                      </Badge>
                    </div>
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
