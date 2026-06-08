
import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Calendar, Users, Coins, Edit, Trash2, Play, Pause, Search, Copy, MessageSquare, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrencyContext } from '@/contexts/CurrencyContext';
import EditCampaignDialog from './EditCampaignDialog';

interface Campaign {
  id: string;
  name: string;
  description: string;
  status: string;
  start_date: string;
  end_date: string;
  discount_percentage: number;
  discount_amount: number;
  created_at: string;
  promotion_code?: string | null;
  is_active?: boolean | null;
}

interface CampaignsListProps {
  campaigns: Campaign[];
}

const getDerivedStatus = (campaign: Campaign): string => {
  const now = new Date();
  const endDate = new Date(campaign.end_date);
  const startDate = new Date(campaign.start_date);
  if (endDate < now && campaign.status === 'active') return 'expired';
  if (startDate > now && campaign.status === 'active') return 'scheduled';
  return campaign.status || (campaign.is_active ? 'active' : 'paused');
};

const statusConfig: Record<string, { badge: string; dot: string }> = {
  active: {
    badge: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    dot: 'bg-emerald-400',
  },
  scheduled: {
    badge: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
    dot: 'bg-blue-400',
  },
  paused: {
    badge: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    dot: 'bg-amber-400',
  },
  expired: {
    badge: 'bg-slate-500/15 text-slate-400 border border-slate-500/30',
    dot: 'bg-slate-400',
  },
  draft: {
    badge: 'bg-gray-500/15 text-gray-400 border border-gray-500/30',
    dot: 'bg-gray-400',
  },
};

type StatusFilter = 'all' | 'active' | 'expired' | 'paused' | 'scheduled';

const CampaignsList: React.FC<CampaignsListProps> = ({ campaigns }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { symbol: currencySymbol } = useCurrencyContext();
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<Campaign | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Fix: Use useQuery instead of useMemo for async data fetch (React rules)
  const { data: reach = {} } = useQuery({
    queryKey: ['campaign-reach', campaigns.map(c => c.id).join(',')],
    queryFn: async () => {
      if (!campaigns.length) return {};
      const { data } = await supabase
        .from('sent_promotions')
        .select('promotion_campaign_id')
        .in('promotion_campaign_id', campaigns.map(c => c.id));
      if (!data) return {};
      const counts: Record<string, number> = {};
      data.forEach((row: any) => {
        const id = row.promotion_campaign_id;
        if (id) counts[id] = (counts[id] || 0) + 1;
      });
      return counts;
    },
    enabled: campaigns.length > 0,
  });

  // Filter campaigns
  const filteredCampaigns = campaigns.filter(campaign => {
    const derivedStatus = getDerivedStatus(campaign);
    if (statusFilter !== 'all' && derivedStatus !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        campaign.name.toLowerCase().includes(q) ||
        (campaign.description || '').toLowerCase().includes(q) ||
        (campaign.promotion_code || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleToggle = async (campaign: Campaign) => {
    try {
      const nextActive = !(campaign.is_active ?? campaign.status === 'active');
      const nextStatus = nextActive ? 'active' : 'paused';
      const { error } = await supabase
        .from('promotion_campaigns')
        .update({ is_active: nextActive, status: nextStatus })
        .eq('id', campaign.id);
      if (error) throw error;
      toast({ title: nextActive ? 'Activated' : 'Paused', description: `${campaign.name} ${nextActive ? 'is now active' : 'has been paused'}.` });
      queryClient.invalidateQueries({ queryKey: ['promotion-campaigns'] });
    } catch (e) {
      console.error(e);
      toast({ title: 'Update failed', variant: 'destructive' });
    }
  };

  const handleDuplicate = async (campaign: Campaign) => {
    try {
      const newEndDate = new Date();
      newEndDate.setDate(newEndDate.getDate() + 30);
      const { error } = await supabase
        .from('promotion_campaigns')
        .insert([{
          name: `${campaign.name} (Copy)`,
          description: campaign.description,
          discount_percentage: campaign.discount_percentage,
          discount_amount: campaign.discount_amount,
          start_date: new Date().toISOString().split('T')[0],
          end_date: newEndDate.toISOString().split('T')[0],
          promotion_code: campaign.promotion_code ? `${campaign.promotion_code}_COPY` : null,
          restaurant_id: (campaign as any).restaurant_id,
          status: 'draft',
          is_active: false,
        }]);
      if (error) throw error;
      toast({ title: 'Campaign duplicated', description: `"${campaign.name}" cloned as draft.` });
      queryClient.invalidateQueries({ queryKey: ['promotion-campaigns'] });
    } catch (e) {
      console.error(e);
      toast({ title: 'Duplicate failed', variant: 'destructive' });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase
        .from('promotion_campaigns')
        .delete()
        .eq('id', deleteTarget.id);
      if (error) throw error;
      toast({ title: 'Deleted', description: `${deleteTarget.name} removed` });
      queryClient.invalidateQueries({ queryKey: ['promotion-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-analytics'] });
    } catch (e) {
      console.error(e);
      toast({ title: 'Delete failed', variant: 'destructive' });
    } finally {
      setDeleteTarget(null);
    }
  };

  const openEdit = (campaign: Campaign) => {
    setSelected(campaign);
    setEditOpen(true);
  };

  // Count by status for filter badges
  const statusCounts = campaigns.reduce((acc, c) => {
    const s = getDerivedStatus(c);
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <>
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search campaigns by name, code..."
            className="pl-9 rounded-xl border-black/[0.08] dark:border-white/[0.08] bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(['all', 'active', 'expired', 'paused', 'scheduled'] as StatusFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                ${statusFilter === f
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-black/[0.04] dark:bg-white/[0.06] text-muted-foreground hover:text-foreground'
                }
              `}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              {f !== 'all' && statusCounts[f] ? ` (${statusCounts[f]})` : f === 'all' ? ` (${campaigns.length})` : ''}
            </button>
          ))}
        </div>
      </div>

      {filteredCampaigns.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/10 dark:border-white/10 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl p-12 text-center">
          <div className="text-4xl mb-3 opacity-40">🎯</div>
          <p className="text-base font-semibold text-muted-foreground mb-1">
            {campaigns.length === 0 ? 'No campaigns yet' : 'No matching campaigns'}
          </p>
          <p className="text-sm text-muted-foreground/60">
            {campaigns.length === 0
              ? 'Create your first marketing campaign to engage customers.'
              : 'Try adjusting your search or filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCampaigns.map((campaign) => {
            const derivedStatus = getDerivedStatus(campaign);
            const isActive = campaign.is_active || campaign.status === 'active';
            const reachCount = reach[campaign.id] || 0;
            const sc = statusConfig[derivedStatus] || statusConfig.expired;

            // Days remaining for active campaigns
            const daysLeft = derivedStatus === 'active'
              ? Math.max(0, Math.ceil((new Date(campaign.end_date).getTime() - Date.now()) / (1000 * 3600 * 24)))
              : null;

            return (
              <div
                key={campaign.id}
                className="
                  group relative rounded-2xl border overflow-hidden
                  bg-white/60 dark:bg-white/[0.04]
                  border-black/[0.07] dark:border-white/[0.08]
                  backdrop-blur-xl
                  transition-all duration-200
                  hover:-translate-y-0.5
                  hover:border-purple-400/30 dark:hover:border-purple-500/30
                  hover:shadow-[0_8px_32px_rgba(124,58,237,0.12)]
                "
              >
                {/* shimmer top */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

                <div className="p-5">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5 flex-wrap flex-1">
                      <h3 className="text-base font-bold text-foreground">{campaign.name}</h3>

                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${sc.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} ${derivedStatus === 'active' ? 'animate-pulse' : ''}`} />
                        {derivedStatus.charAt(0).toUpperCase() + derivedStatus.slice(1)}
                      </span>

                      {campaign.promotion_code && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30">
                          Code: {campaign.promotion_code}
                        </span>
                      )}

                      {daysLeft !== null && daysLeft <= 7 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                          ⏰ {daysLeft}d left
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => openEdit(campaign)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center border border-black/[0.08] dark:border-white/[0.1] bg-black/[0.03] dark:bg-white/[0.05] text-muted-foreground hover:text-foreground hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-all"
                        aria-label="Edit"
                        title="Edit campaign"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggle(campaign)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center border border-black/[0.08] dark:border-white/[0.1] bg-black/[0.03] dark:bg-white/[0.05] text-muted-foreground hover:text-foreground hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-all"
                        aria-label="Toggle"
                        title={isActive ? 'Pause' : 'Activate'}
                      >
                        {isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={() => handleDuplicate(campaign)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center border border-black/[0.08] dark:border-white/[0.1] bg-black/[0.03] dark:bg-white/[0.05] text-muted-foreground hover:text-foreground hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-all"
                        aria-label="Duplicate"
                        title="Duplicate campaign"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(campaign)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center border border-black/[0.08] dark:border-white/[0.1] bg-black/[0.03] dark:bg-white/[0.05] text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/30 transition-all"
                        aria-label="Delete"
                        title="Delete campaign"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  {campaign.description && (
                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                      {campaign.description}
                    </p>
                  )}

                  {/* Meta grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { icon: "📅", label: "Start Date", value: format(new Date(campaign.start_date), 'MMM dd, yyyy') },
                      { icon: "📅", label: "End Date", value: format(new Date(campaign.end_date), 'MMM dd, yyyy') },
                      {
                        icon: "💸",
                        label: "Discount",
                        value: campaign.discount_percentage > 0
                          ? `${campaign.discount_percentage}%`
                          : campaign.discount_amount > 0
                            ? `${currencySymbol}${campaign.discount_amount.toLocaleString()}`
                            : 'None',
                      },
                      {
                        icon: "🎯",
                        label: "Reach",
                        value: `${reachCount} ${reachCount === 1 ? 'customer' : 'customers'}`,
                      },
                    ].map((meta) => (
                      <div key={meta.label}>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1 flex items-center gap-1">
                          <span>{meta.icon}</span> {meta.label}
                        </p>
                        <p className="text-sm font-semibold text-foreground">{meta.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-black/[0.06] dark:border-white/[0.06]">
                    <span className="text-xs text-muted-foreground/50">
                      Created {format(new Date(campaign.created_at), 'MMM dd, yyyy')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <EditCampaignDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        campaign={selected}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['promotion-campaigns'] });
          queryClient.invalidateQueries({ queryKey: ['marketing-analytics'] });
        }}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Delete "{deleteTarget?.name}"? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CampaignsList;
