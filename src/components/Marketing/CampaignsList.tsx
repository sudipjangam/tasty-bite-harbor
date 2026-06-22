import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import {
  Calendar,
  Users,
  Coins,
  Edit,
  Trash2,
  Play,
  Pause,
  Search,
  Copy,
  MessageSquare,
  Filter,
  Percent,
  Clock,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrencyContext } from '@/contexts/CurrencyContext';
import EditCampaignDialog from './EditCampaignDialog';
import { useRestaurantId } from '@/hooks/useRestaurantId';

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

const statusConfig: Record<string, { badge: string; dot: string; glow: string }> = {
  active: {
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none font-bold',
    dot: 'bg-emerald-500',
    glow: 'border-l-4 border-l-emerald-500 hover:shadow-[0_8px_32px_rgba(16,185,129,0.1)]',
  },
  scheduled: {
    badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-none font-bold',
    dot: 'bg-blue-500',
    glow: 'border-l-4 border-l-blue-500 hover:shadow-[0_8px_32px_rgba(59,130,246,0.1)]',
  },
  paused: {
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-none font-bold',
    dot: 'bg-amber-500',
    glow: 'border-l-4 border-l-amber-500 hover:shadow-[0_8px_32px_rgba(245,158,11,0.1)]',
  },
  expired: {
    badge: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-none font-bold',
    dot: 'bg-slate-500',
    glow: 'border-l-4 border-l-slate-400 opacity-75 hover:shadow-none',
  },
  draft: {
    badge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-none font-bold',
    dot: 'bg-purple-500',
    glow: 'border-l-4 border-l-purple-500 hover:shadow-[0_8px_32px_rgba(168,85,247,0.1)]',
  },
};

type StatusFilter = 'all' | 'active' | 'expired' | 'paused' | 'scheduled';

const CampaignsList: React.FC<CampaignsListProps> = ({ campaigns }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { symbol: currencySymbol } = useCurrencyContext();
  const { restaurantId } = useRestaurantId();
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<Campaign | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Track campaign reach: WhatsApp sends + promo code redemptions from orders
  const { data: reachData = { sends: {}, redemptions: {} } } = useQuery({
    queryKey: ['campaign-reach', campaigns.map(c => c.id).join(',')],
    queryFn: async () => {
      if (!campaigns.length) return { sends: {}, redemptions: {} };

      // 1. WhatsApp sends count
      const { data: sendData } = await supabase
        .from('sent_promotions')
        .select('promotion_campaign_id')
        .in('promotion_campaign_id', campaigns.map(c => c.id));

      const sends: Record<string, number> = {};
      (sendData || []).forEach((row: any) => {
        const id = row.promotion_campaign_id;
        if (id) sends[id] = (sends[id] || 0) + 1;
      });

      // 2. Promo code redemptions from orders
      const codesMap = campaigns
        .filter(c => c.promotion_code || c.name)
        .map(c => ({
          id: c.id,
          code: (c.promotion_code || '').toLowerCase(),
          name: (c.name || '').toLowerCase(),
        }));

      const redemptions: Record<string, number> = {};

      if (codesMap.length > 0) {
        const { data: orders } = await supabase
          .from('orders')
          .select('discount_notes')
          .eq('restaurant_id', restaurantId)
          .not('discount_notes', 'is', null);

        (orders || []).forEach((order: any) => {
          const notes = (order.discount_notes || '').toLowerCase();
          codesMap.forEach(({ id, code, name }) => {
            const codeMatch = code && notes.includes(code);
            const nameMatch = name && name.length >= 3 && notes.includes(name);
            if (codeMatch || nameMatch) {
              redemptions[id] = (redemptions[id] || 0) + 1;
            }
          });
        });
      }

      return { sends, redemptions };
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
      toast({ title: nextActive ? 'Activated ✅' : 'Paused ⏸️', description: `${campaign.name} is now ${nextActive ? 'active' : 'paused'}.` });
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
      toast({ title: 'Campaign duplicated ✅', description: `"${campaign.name}" cloned as draft.` });
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
      toast({ title: 'Deleted 🗑️', description: `${deleteTarget.name} removed.` });
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

  const statusCounts = campaigns.reduce((acc, c) => {
    const s = getDerivedStatus(c);
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <>
      {/* ── Search & Filter Bar ── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search campaigns by name description or code..."
            className="pl-9 h-10 rounded-xl border-black/[0.08] dark:border-white/[0.08] bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl focus:border-purple-500/50"
          />
        </div>

        {/* Tab-styled filter group */}
        <div 
          className="flex p-0.5 rounded-xl border bg-black/[0.03] dark:bg-white/[0.02] border-black/[0.06] dark:border-white/[0.08] overflow-x-auto flex-nowrap w-full sm:w-auto scrollbar-none"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {(['all', 'active', 'expired', 'paused', 'scheduled'] as StatusFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5
                ${statusFilter === f
                  ? 'bg-white dark:bg-white/[0.1] text-gray-900 dark:text-white shadow-sm font-bold'
                  : 'text-muted-foreground hover:text-foreground'
                }
              `}
            >
              <span>{f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}</span>
              <span className="text-[9px] bg-black/[0.04] dark:bg-white/[0.06] px-1 rounded-md text-muted-foreground">
                {f === 'all' ? campaigns.length : statusCounts[f] || 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Campaigns Feed Content ── */}
      {filteredCampaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl bg-black/[0.01] dark:bg-white/[0.01] border border-dashed border-black/[0.08] dark:border-white/[0.08]">
          <span className="text-4xl mb-3 opacity-30">🎯</span>
          <p className="text-sm font-bold text-gray-700 dark:text-gray-300">No campaigns found</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
            {campaigns.length === 0
              ? 'Create your first marketing campaign to boost restaurant sales!'
              : 'No campaigns match your active search filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCampaigns.map((campaign) => {
            const derivedStatus = getDerivedStatus(campaign);
            const isActive = campaign.is_active || campaign.status === 'active';
            const sendCount = reachData.sends[campaign.id] || 0;
            const redemptionCount = reachData.redemptions[campaign.id] || 0;
            const sc = statusConfig[derivedStatus] || statusConfig.expired;

            const daysLeft = derivedStatus === 'active'
              ? Math.max(0, Math.ceil((new Date(campaign.end_date).getTime() - Date.now()) / (1000 * 3600 * 24)))
              : null;

            // Redemption Rate percentage logic
            const redemptionRate = sendCount > 0 ? Math.round((redemptionCount / sendCount) * 100) : 0;

            return (
              <div
                key={campaign.id}
                className={`
                  group relative rounded-2xl border overflow-hidden p-5 transition-all duration-300 bg-white/40 dark:bg-white/[0.02] border-black/[0.06] dark:border-white/[0.08]
                  backdrop-blur-xl ${sc.glow}
                `}
              >
                {/* top shimmer decoration */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                {/* Left status badge glow strip */}
                {derivedStatus === 'active' && (
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-emerald-400 to-green-500 animate-pulse" />
                )}

                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* Left Column: Title and Details */}
                  <div className="flex-1 space-y-3 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-extrabold text-gray-900 dark:text-gray-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                        {campaign.name}
                      </h3>

                      <Badge className={`${sc.badge} text-[10px] px-2 py-0.5 border-none font-bold flex items-center gap-1`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} ${derivedStatus === 'active' ? 'animate-ping' : ''}`} />
                        {derivedStatus}
                      </Badge>

                      {campaign.promotion_code && (
                        <Badge className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-none text-[10px] font-extrabold font-mono px-2">
                          CODE: {campaign.promotion_code}
                        </Badge>
                      )}

                      {daysLeft !== null && daysLeft <= 7 && (
                        <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-none text-[10px] font-bold">
                          ⏰ {daysLeft} days remaining
                        </Badge>
                      )}
                    </div>

                    {campaign.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                        {campaign.description}
                      </p>
                    )}

                    {/* Metrics grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-purple-500" /> Start Date
                        </span>
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                          {format(new Date(campaign.start_date), 'MMM dd, yyyy')}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-purple-500" /> End Date
                        </span>
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                          {format(new Date(campaign.end_date), 'MMM dd, yyyy')}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1">
                          <Percent className="h-3 w-3 text-orange-500" /> Offer Benefit
                        </span>
                        <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                          {campaign.discount_percentage > 0
                            ? `${campaign.discount_percentage}% discount`
                            : campaign.discount_amount > 0
                              ? `${currencySymbol}${campaign.discount_amount.toLocaleString()} flat off`
                              : 'No benefits'}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-blue-500" /> Reach & Usage
                        </span>
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                          {redemptionCount} redeemed {sendCount > 0 ? `(${sendCount} sent)` : ''}
                        </p>
                      </div>
                    </div>

                    {/* Mini progress bar for redemption rate */}
                    {sendCount > 0 && (
                      <div className="pt-2 max-w-sm space-y-1">
                        <div className="flex items-center justify-between text-[9.5px] font-bold text-muted-foreground">
                          <span>Redemption rate:</span>
                          <span className="text-emerald-500">{redemptionRate}%</span>
                        </div>
                        <Progress value={redemptionRate} className="h-1 bg-black/[0.05] dark:bg-white/[0.05]" />
                      </div>
                    )}
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex sm:flex-row md:flex-col items-center gap-1.5 shrink-0 self-end md:self-start bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.05] dark:border-white/[0.05] p-1 rounded-xl">
                    <button
                      onClick={() => openEdit(campaign)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-purple-600 dark:hover:text-purple-400 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all"
                      title="Edit campaign details"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleToggle(campaign)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-emerald-500 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all"
                      title={isActive ? 'Pause campaign' : 'Resume campaign'}
                    >
                      {isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={() => handleDuplicate(campaign)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-blue-500 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all"
                      title="Duplicate as Draft"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(campaign)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                      title="Delete campaign"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Footer created stamp */}
                <div className="flex items-center justify-between border-t border-black/[0.03] dark:border-white/[0.03] mt-4 pt-3.5 text-[10px] text-muted-foreground/50 font-medium">
                  <span>Created: {format(new Date(campaign.created_at), 'MMM dd, yyyy')}</span>
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
        <AlertDialogContent className="rounded-3xl border border-black/[0.08] dark:border-white/[0.08] bg-white/95 dark:bg-[#0c0f1c]/95 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-bold text-lg">Delete Campaign</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Are you sure you want to delete "{deleteTarget?.name}"? All related configurations will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-700 hover:to-rose-600 text-white rounded-xl shadow-md shadow-red-500/20 border-none"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CampaignsList;
