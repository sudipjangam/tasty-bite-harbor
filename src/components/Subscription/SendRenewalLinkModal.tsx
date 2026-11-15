/**
 * SendRenewalLinkModal
 * - Grouped plan selector (Restaurant / Hotel / Food Truck / All-in-One / Other)
 * - Generate Razorpay Payment Link (full or discounted, amount capped at plan price)
 * - Sticky send bar: WhatsApp + Email + Copy always visible after generation
 * - UPI Payment Card toggle
 * - Stale-generation guard via generationIdRef
 * - HTML-escaped email template
 * - Razorpay = auto-activate; UPI = manual UTR confirmation
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Link, Copy, Check, Loader2, MessageSquare, Mail,
  IndianRupee, Calendar, QrCode, ExternalLink,
  RefreshCw, ChevronDown, ChevronUp, AlertCircle,
  Tag, Percent,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePlatformPaymentConfig } from '@/hooks/usePlatformPaymentConfig';
import { UPIPaymentCard } from './UPIPaymentCard';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Restaurant {
  id: string; name: string;
  phone?: string | null; email?: string | null;
  owner_name?: string | null; owner_email?: string | null; owner_phone?: string | null;
}
interface Plan { id: string; name: string; price: number; interval: string; }
interface Subscription { plan_id?: string; current_period_end?: string; status?: string; }
interface LinkSnapshot {
  url: string;
  planId: string;
  planName: string;
  interval: string;
  amount: number;
  originalAmount?: number;
  discountAmount?: number;
  discountPercentage?: number;
}
type DiscountMode = 'none' | 'percentage' | 'cash' | 'fixed_price';

interface SendRenewalLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurant: Restaurant;
  subscription?: Subscription | null;
  plans: Plan[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const daysFromNow = (n: number) => {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
};
const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const intervalLabel = (s: string) =>
  ({ monthly: 'Monthly', quarterly: 'Quarterly', half_yearly: '6-Monthly', yearly: 'Yearly' }[s] || s);
const escHtml = (s: string) =>
  s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

/** Group plans into categories based on name prefix */
function groupPlans(plans: Plan[]) {
  const groups: Record<string, Plan[]> = {
    Restaurant: [],
    'Restaurant + Hotel': [],
    Hotel: [],
    'Food Truck': [],
    'All-in-One': [],
    Other: [],
  };
  for (const p of plans) {
    const n = p.name;
    if (n.startsWith('Restaurant + Hotel') || n.startsWith('Restaurant+Hotel')) groups['Restaurant + Hotel'].push(p);
    else if (n.startsWith('Restaurant'))  groups['Restaurant'].push(p);
    else if (n.startsWith('Hotel'))       groups['Hotel'].push(p);
    else if (n.startsWith('Food Truck'))  groups['Food Truck'].push(p);
    else if (n.startsWith('All-in-One'))  groups['All-in-One'].push(p);
    else                                  groups['Other'].push(p);
  }
  return Object.entries(groups).filter(([, ps]) => ps.length > 0);
}

/** Return display name: strip group prefix for non-compound groups */
function planDisplayName(planName: string, groupName: string) {
  if (groupName === 'Restaurant + Hotel') return planName; // keep full name
  const stripped = planName.startsWith(groupName + ' ')
    ? planName.slice(groupName.length + 1).trim()
    : planName;
  return stripped || planName;
}

/** Which group does a plan belong to? */
function planGroup(planName: string): string {
  if (planName.startsWith('Restaurant + Hotel') || planName.startsWith('Restaurant+Hotel')) return 'Restaurant + Hotel';
  if (planName.startsWith('Restaurant'))  return 'Restaurant';
  if (planName.startsWith('Hotel'))       return 'Hotel';
  if (planName.startsWith('Food Truck'))  return 'Food Truck';
  if (planName.startsWith('All-in-One'))  return 'All-in-One';
  return 'Other';
}

// ── Component ─────────────────────────────────────────────────────────────────
export const SendRenewalLinkModal: React.FC<SendRenewalLinkModalProps> = ({
  open, onOpenChange, restaurant, subscription, plans,
}) => {
  const { liveConfig: paymentConfig } = usePlatformPaymentConfig();
  const eligiblePlans = React.useMemo(() => plans.filter(p => p.price >= 100), [plans]);
  const currentPlan = eligiblePlans.find(p => p.id === subscription?.plan_id) ?? eligiblePlans[0];

  // Default expanded group = group that contains the current plan
  const defaultGroup = currentPlan ? planGroup(currentPlan.name) : 'Restaurant';
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set([defaultGroup]));

  const toggleGroup = (g: string) =>
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(g) ? next.delete(g) : next.add(g);
      return next;
    });

  const [selectedPlanId, setSelectedPlanId] = useState(currentPlan?.id ?? '');
  const [discountMode, setDiscountMode]     = useState<DiscountMode>('none');
  const [discountInputValue, setDiscountInputValue] = useState<string>('');
  const [expiresAt, setExpiresAt]           = useState(daysFromNow(3));
  const [customNote, setCustomNote]         = useState('');
  const [isGenerating, setIsGenerating]     = useState(false);
  const [linkSnapshot, setLinkSnapshot]     = useState<LinkSnapshot | null>(null);
  const [copiedLink, setCopiedLink]         = useState(false);
  const [copiedWaText, setCopiedWaText]     = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [showQr, setShowQr]                 = useState(false);
  const generationIdRef    = useRef(0);
  const resultRef          = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const selectedPlan = eligiblePlans.find(p => p.id === selectedPlanId) ?? currentPlan;
  const planPrice    = selectedPlan?.price ?? 0;

  // ── Live Discount & Pricing Calculation ──────────────────────────────────────
  const { finalPrice, discountAmount, discountPercentage, discountError, isDiscountActive } = useMemo(() => {
    if (!selectedPlan) {
      return {
        finalPrice: 0,
        discountAmount: 0,
        discountPercentage: 0,
        discountError: null,
        isDiscountActive: false,
      };
    }

    if (discountMode === 'none') {
      return {
        finalPrice: planPrice,
        discountAmount: 0,
        discountPercentage: 0,
        discountError: null,
        isDiscountActive: false,
      };
    }

    const val = parseFloat(discountInputValue);
    if (!discountInputValue || isNaN(val)) {
      return {
        finalPrice: planPrice,
        discountAmount: 0,
        discountPercentage: 0,
        discountError: 'Please enter a discount value',
        isDiscountActive: false,
      };
    }

    if (discountMode === 'percentage') {
      if (val <= 0 || val >= 100) {
        return {
          finalPrice: planPrice,
          discountAmount: 0,
          discountPercentage: 0,
          discountError: 'Percentage must be between 1% and 99%',
          isDiscountActive: false,
        };
      }
      const discAmt = Math.round((planPrice * val) / 100);
      const finalAmt = Math.max(1, planPrice - discAmt);
      return {
        finalPrice: finalAmt,
        discountAmount: planPrice - finalAmt,
        discountPercentage: Math.round(val * 10) / 10,
        discountError: null,
        isDiscountActive: true,
      };
    }

    if (discountMode === 'cash') {
      if (val <= 0) {
        return {
          finalPrice: planPrice,
          discountAmount: 0,
          discountPercentage: 0,
          discountError: 'Discount must be greater than ₹0',
          isDiscountActive: false,
        };
      }
      if (val >= planPrice) {
        return {
          finalPrice: planPrice,
          discountAmount: 0,
          discountPercentage: 0,
          discountError: `Discount must be less than ₹${planPrice.toLocaleString('en-IN')}`,
          isDiscountActive: false,
        };
      }
      const discAmt = Math.round(val);
      const finalAmt = Math.max(1, planPrice - discAmt);
      const pct = planPrice > 0 ? Math.round(((planPrice - finalAmt) / planPrice) * 1000) / 10 : 0;
      return {
        finalPrice: finalAmt,
        discountAmount: planPrice - finalAmt,
        discountPercentage: pct,
        discountError: null,
        isDiscountActive: true,
      };
    }

    if (discountMode === 'fixed_price') {
      const finalAmt = Math.round(val);
      if (isNaN(finalAmt) || finalAmt < 1) {
        return {
          finalPrice: planPrice,
          discountAmount: 0,
          discountPercentage: 0,
          discountError: 'Custom price must be at least ₹1',
          isDiscountActive: false,
        };
      }
      if (finalAmt > planPrice) {
        return {
          finalPrice: planPrice,
          discountAmount: 0,
          discountPercentage: 0,
          discountError: `Cannot exceed plan price (₹${planPrice.toLocaleString('en-IN')})`,
          isDiscountActive: false,
        };
      }
      const discAmt = planPrice - finalAmt;
      const pct = planPrice > 0 ? Math.round((discAmt / planPrice) * 1000) / 10 : 0;
      return {
        finalPrice: finalAmt,
        discountAmount: discAmt,
        discountPercentage: pct,
        discountError: null,
        isDiscountActive: discAmt > 0,
      };
    }

    return {
      finalPrice: planPrice,
      discountAmount: 0,
      discountPercentage: 0,
      discountError: null,
      isDiscountActive: false,
    };
  }, [discountMode, discountInputValue, planPrice, selectedPlan]);

  // Invalidate link and any in-flight generation when form inputs change or modal unmounts
  useEffect(() => {
    generationIdRef.current += 1;
    setIsGenerating(false);
    setLinkSnapshot(null);
    return () => {
      generationIdRef.current += 1;
      setIsGenerating(false);
    };
  }, [selectedPlanId, discountMode, discountInputValue, expiresAt]);

  // Reset on open
  useEffect(() => {
    if (open) {
      const cp = eligiblePlans.find(p => p.id === subscription?.plan_id) ?? eligiblePlans[0];
      setSelectedPlanId(cp?.id ?? '');
      setExpandedGroups(new Set([cp ? planGroup(cp.name) : 'Restaurant']));
      setDiscountMode('none');
      setDiscountInputValue('');
      setExpiresAt(daysFromNow(3));
      setCustomNote('');
      setLinkSnapshot(null);
      setCopiedLink(false);
      setCopiedWaText(false);
      setShowQr(false);
    }
  }, [open, eligiblePlans, subscription?.plan_id]);

  // Scroll to result after generation (scroll the inner container, not window)
  useEffect(() => {
    if (linkSnapshot) {
      setTimeout(() => {
        const container = scrollContainerRef.current;
        if (container) container.scrollTop = container.scrollHeight;
      }, 150);
    }
  }, [linkSnapshot]);

  // ── Generate ────────────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!selectedPlanId || !selectedPlan) { toast.error('Select an eligible plan'); return; }
    if (discountError) { toast.error(discountError); return; }

    const myId = ++generationIdRef.current;
    const snap = {
      plan: selectedPlan,
      finalAmount: finalPrice,
      originalAmount: planPrice,
      discountAmount,
      discountPercentage,
      mode: isDiscountActive ? discountMode : 'none',
      val: isDiscountActive
        ? (discountMode === 'fixed_price'
            ? finalPrice
            : discountMode === 'cash'
              ? discountAmount
              : parseFloat(discountInputValue) || 0)
        : 0,
    };

    setIsGenerating(true);
    setLinkSnapshot(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-discounted-payment-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          planId:       snap.plan.id,
          expiresAt:    new Date(expiresAt + 'T23:59:59').toISOString(),
          notes:        customNote || undefined,
          description:  isDiscountActive
            ? `Renewal (${snap.discountPercentage}% OFF): ${snap.plan.name} (${intervalLabel(snap.plan.interval)}) — ${restaurant.name}`
            : `Subscription Renewal: ${snap.plan.name} (${intervalLabel(snap.plan.interval)}) — ${restaurant.name}`,
          discountType:  snap.mode,
          discountValue: snap.val,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.paymentLink) {
        const detailStr = json.details ? ` (${typeof json.details === 'string' ? json.details : JSON.stringify(json.details)})` : '';
        throw new Error((json.error || 'Failed to generate link') + detailStr);
      }
      if (myId !== generationIdRef.current) return;

      const confirmedAmount =
        typeof json.discount?.discounted_price === 'number'
          ? json.discount.discounted_price
          : snap.finalAmount;

      const snap2: LinkSnapshot = {
        url: json.paymentLink,
        planId: snap.plan.id,
        planName: snap.plan.name,
        interval: snap.plan.interval,
        amount: confirmedAmount,
        originalAmount: typeof json.discount?.original_price === 'number' ? json.discount.original_price : snap.originalAmount,
        discountAmount: typeof json.discount?.discount_amount === 'number' ? json.discount.discount_amount : snap.discountAmount,
        discountPercentage: typeof json.discount?.discount_percentage === 'number' ? json.discount.discount_percentage : snap.discountPercentage,
      };
      setLinkSnapshot(snap2);

      // Auto-copy link to clipboard: show copied in toast only if resolved
      let copied = false;
      try {
        await navigator.clipboard.writeText(json.paymentLink);
        copied = true;
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 3000);
      } catch {
        copied = false;
      }
      toast.success(copied ? 'Payment link generated & copied!' : 'Payment link generated!');
    } catch (err: unknown) {
      if (myId !== generationIdRef.current) return;
      toast.error((err as Error).message || 'Failed');
    } finally {
      if (myId === generationIdRef.current) setIsGenerating(false);
    }
  }, [
    selectedPlanId, selectedPlan, finalPrice, planPrice, discountAmount,
    discountPercentage, discountError, isDiscountActive, discountMode,
    discountInputValue, expiresAt, customNote, restaurant,
  ]);

  // ── Copy Link ───────────────────────────────────────────────────────────────
  const handleCopy = async () => {
    if (!linkSnapshot?.url) return;
    try {
      await navigator.clipboard.writeText(linkSnapshot.url);
      setCopiedLink(true);
      toast.success('Link copied!');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error('Failed to copy link to clipboard');
    }
  };

  // ── Copy WhatsApp Text ──────────────────────────────────────────────────────
  const handleCopyWaText = async () => {
    const text = buildWaText();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedWaText(true);
      toast.success('WhatsApp text copied with emojis intact!');
      setTimeout(() => setCopiedWaText(false), 2500);
    } catch {
      toast.error('Failed to copy WhatsApp message');
    }
  };

  // ── WhatsApp message ────────────────────────────────────────────────────────
  const buildWaText = useCallback(() => {
    if (!linkSnapshot) return '';
    const hasDiscount = (linkSnapshot.discountAmount ?? 0) > 0;
    const origAmount = linkSnapshot.originalAmount ?? linkSnapshot.amount;

    return (
      `*Swadeshi Solutions — Subscription Renewal* ✨\n\n` +
      `Hi ${restaurant.owner_name || restaurant.name},\n\n` +
      `Your *${linkSnapshot.planName}* plan expires on *${fmtDate(subscription?.current_period_end)}*.\n` +
      `Renew now to keep your POS uninterrupted.\n\n` +
      (hasDiscount
        ? `🎉 *Special Renewal Discount Applied:*\n` +
          `• Original Price: ~₹${origAmount.toLocaleString('en-IN')}~\n` +
          `• Final Renewal Amount: *₹${linkSnapshot.amount.toLocaleString('en-IN')}* (₹${linkSnapshot.discountAmount?.toLocaleString('en-IN')} OFF)\n\n`
        : '') +
      `💳 *Pay via Razorpay (₹${linkSnapshot.amount.toLocaleString('en-IN')}):*\n${linkSnapshot.url}\n` +
      `_(Auto-activates subscription on payment)_\n\n` +
      `🏛️ *Or pay via UPI / Bank Transfer:*\n` +
      `UPI ID: *${paymentConfig.upi.upiId}*\n` +
      `Bank: ${paymentConfig.bank.bankName} | A/C: ${paymentConfig.bank.accountNumber} | IFSC: ${paymentConfig.bank.ifsc}\n` +
      `_(After UPI payment, share UTR to +91 83295 40398 for manual activation)_\n\n` +
      (customNote ? `📝 ${customNote}\n\n` : '') +
      `— Team Swadeshi Solutions`
    );
  }, [linkSnapshot, restaurant, subscription, paymentConfig, customNote]);

  const rawPhone = restaurant.owner_phone || restaurant.phone || '';
  const cleanPhone = rawPhone.replace(/\D/g, '');
  const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  const waUrl = formattedPhone && linkSnapshot
    ? `https://api.whatsapp.com/send/?phone=${formattedPhone}&text=${encodeURIComponent(buildWaText())}`
    : '#';

  // ── Send Email ──────────────────────────────────────────────────────────────
  const handleSendEmail = async () => {
    const email = restaurant.owner_email || restaurant.email;
    if (!email)        { toast.error('No email on record'); return; }
    if (!linkSnapshot) { toast.error('Generate link first'); return; }
    setIsSendingEmail(true);
    try {
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          to:      email,
          subject: `Action Required: Renew Your ${linkSnapshot.planName} Subscription — ${restaurant.name}`,
          html:    buildRenewalEmailHtml({
            restaurantName: restaurant.name,
            ownerName:      restaurant.owner_name || restaurant.name,
            planName:       linkSnapshot.planName,
            interval:       intervalLabel(linkSnapshot.interval),
            amount:         linkSnapshot.amount,
            originalAmount: linkSnapshot.originalAmount,
            discountAmount: linkSnapshot.discountAmount,
            discountPercentage: linkSnapshot.discountPercentage,
            expiryDate:     fmtDate(subscription?.current_period_end),
            invoiceNumber:  `RENEWAL-${restaurant.id.slice(0, 6).toUpperCase()}`,
            paymentLink:    linkSnapshot.url,
            upiId:          paymentConfig.upi.upiId,
            bankName:       paymentConfig.bank.bankName,
            accountNumber:  paymentConfig.bank.accountNumber,
            ifsc:           paymentConfig.bank.ifsc,
            accountName:    paymentConfig.bank.accountName,
            branch:         paymentConfig.bank.branch,
            phone:          paymentConfig.phone,
            email:          paymentConfig.email,
            note:           customNote,
          }),
          fromName:  'Sudip Jangam — Swadeshi Solutions',
          fromEmail: 'inquiry@swadeshisolutions.co.in',
        },
      });
      if (error) throw error;
      toast.success('Email sent!');
    } catch (e: unknown) { toast.error('Email failed: ' + (e as Error).message); }
    finally { setIsSendingEmail(false); }
  };

  const grouped = groupPlans(eligiblePlans);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* DialogContent already has max-h-[90vh] overflow-y-auto in the base component */}
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 !max-h-[92vh] flex flex-col">

        {/* ── Sticky header ── */}
        <DialogHeader className="p-5 pb-4 border-b bg-slate-50 dark:bg-slate-950 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
              <Link className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">Send Renewal Link</DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5">{restaurant.name}</p>
            </div>
          </div>
          {subscription?.current_period_end && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <Calendar className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
              <span className="text-xs text-amber-700 dark:text-amber-400">
                Expires: <strong>{fmtDate(subscription.current_period_end)}</strong>
              </span>
              <Badge variant="outline" className={`ml-auto text-[10px] px-1.5 py-0.5 ${
                subscription.status === 'active' ? 'border-green-300 text-green-700 bg-green-50' : 'border-red-300 text-red-700 bg-red-50'
              }`}>
                {subscription.status ?? 'unknown'}
              </Badge>
            </div>
          )}
        </DialogHeader>

        {/* ── Scrollable form ── */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-5">

          {/* Grouped plan selector — collapsible accordion */}
          <div>
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
              Plan to Renew
            </Label>
            <div className="space-y-1.5">
              {grouped.map(([groupName, groupPlans]) => {
                const isOpen = expandedGroups.has(groupName);
                const hasSelected = groupPlans.some(p => p.id === selectedPlanId);
                return (
                  <div key={groupName} className={`rounded-xl border overflow-hidden transition-colors ${
                    hasSelected ? 'border-orange-300 dark:border-orange-700' : 'border-slate-200 dark:border-slate-700'
                  }`}>
                    {/* Group header toggle */}
                    <button
                      type="button"
                      onClick={() => toggleGroup(groupName)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors ${
                        hasSelected
                          ? 'bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300'
                          : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                      }`}
                    >
                      <span className="text-[11px] font-bold uppercase tracking-widest">{groupName}</span>
                      <span className="flex items-center gap-1.5">
                        {hasSelected && (
                          <span className="text-[9px] font-semibold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/40 px-1.5 py-0.5 rounded-full">
                            selected
                          </span>
                        )}
                        {isOpen
                          ? <ChevronUp className="w-3.5 h-3.5 opacity-60" />
                          : <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                        }
                      </span>
                    </button>
                    {/* Group plans — only rendered when expanded */}
                    {isOpen && (
                      <div className="p-2 grid grid-cols-2 gap-1.5 bg-white dark:bg-slate-900">
                        {groupPlans.map(p => (
                          <button
                            key={p.id}
                            type="button"
                            disabled={isGenerating}
                            onClick={() => { setSelectedPlanId(p.id); setDiscountInputValue(''); }}
                            className={`text-left px-3 py-2 rounded-lg border text-xs transition-all ${isGenerating ? 'opacity-60 cursor-not-allowed ' : ''}${
                              selectedPlanId === p.id
                                ? 'border-orange-400 bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 ring-1 ring-orange-300'
                                : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            <div className="font-semibold leading-tight">{planDisplayName(p.name, groupName)}</div>
                            <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                              ₹{Number(p.price).toLocaleString('en-IN')} / {intervalLabel(p.interval)}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Plan Customization & Discount ── */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-orange-500" />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Plan Pricing &amp; Discount
                </span>
              </div>
              {isDiscountActive && (
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-[10px] px-2 py-0.5">
                  ₹{discountAmount.toLocaleString('en-IN')} OFF ({discountPercentage}%)
                </Badge>
              )}
            </div>

            {/* Discount Mode Selector Tabs */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-lg text-xs font-medium">
              <button
                type="button"
                disabled={isGenerating || !selectedPlan}
                onClick={() => { setDiscountMode('none'); setDiscountInputValue(''); }}
                className={`py-1.5 px-2 rounded-md transition-all text-[11px] ${
                  discountMode === 'none'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Full Price
              </button>
              <button
                type="button"
                disabled={isGenerating || !selectedPlan}
                onClick={() => { setDiscountMode('percentage'); setDiscountInputValue('10'); }}
                className={`py-1.5 px-2 rounded-md transition-all text-[11px] ${
                  discountMode === 'percentage'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                % Off
              </button>
              <button
                type="button"
                disabled={isGenerating || !selectedPlan}
                onClick={() => { setDiscountMode('cash'); setDiscountInputValue('1000'); }}
                className={`py-1.5 px-2 rounded-md transition-all text-[11px] ${
                  discountMode === 'cash'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                ₹ Flat Off
              </button>
              <button
                type="button"
                disabled={isGenerating || !selectedPlan}
                onClick={() => {
                  setDiscountMode('fixed_price');
                  setDiscountInputValue(String(Math.max(100, planPrice - 1000)));
                }}
                className={`py-1.5 px-2 rounded-md transition-all text-[11px] ${
                  discountMode === 'fixed_price'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Custom Price
              </button>
            </div>

            {/* Quick Presets & Custom Input */}
            {discountMode !== 'none' && (
              <div className="space-y-2 pt-0.5">
                {/* Percentage Presets */}
                {discountMode === 'percentage' && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-500 font-medium">Presets:</span>
                    {[5, 10, 15, 20, 25, 30].map(pct => (
                      <button
                        key={pct}
                        type="button"
                        disabled={isGenerating || !selectedPlan}
                        onClick={() => setDiscountInputValue(String(pct))}
                        className={`px-2 py-0.5 rounded text-[11px] border transition-colors ${
                          discountInputValue === String(pct)
                            ? 'bg-orange-500 text-white border-orange-500 font-semibold shadow-xs'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-orange-300'
                        }`}
                      >
                        {pct}% OFF
                      </button>
                    ))}
                  </div>
                )}

                {/* Flat Cash Presets */}
                {discountMode === 'cash' && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-500 font-medium">Presets:</span>
                    {[500, 1000, 1500, 2000, 3000].filter(amt => amt < planPrice).map(amt => (
                      <button
                        key={amt}
                        type="button"
                        disabled={isGenerating || !selectedPlan}
                        onClick={() => setDiscountInputValue(String(amt))}
                        className={`px-2 py-0.5 rounded text-[11px] border transition-colors ${
                          discountInputValue === String(amt)
                            ? 'bg-orange-500 text-white border-orange-500 font-semibold shadow-xs'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-orange-300'
                        }`}
                      >
                        ₹{amt.toLocaleString('en-IN')} OFF
                      </button>
                    ))}
                  </div>
                )}

                {/* Input with Icon */}
                <div>
                  <div className="relative">
                    {discountMode === 'percentage' ? (
                      <Percent className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    )}
                    <Input
                      type="number"
                      min={1}
                      disabled={isGenerating || !selectedPlan}
                      className={`pl-8 h-8 text-sm ${discountError ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                      placeholder={
                        discountMode === 'percentage' ? 'Discount % (e.g. 15)' :
                        discountMode === 'cash' ? 'Discount in ₹ (e.g. 1000)' :
                        'Final price in ₹ (e.g. 6999)'
                      }
                      value={discountInputValue}
                      onChange={e => setDiscountInputValue(e.target.value)}
                    />
                  </div>
                  {discountError && (
                    <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      {discountError}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Live Price Summary Box */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-xs">
              <div>
                <span className="text-slate-500 text-[10px] uppercase tracking-wider block font-semibold">
                  Customer Renewal Price
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-base font-extrabold text-[#2E4FA3] dark:text-blue-400">
                    ₹{finalPrice.toLocaleString('en-IN')}
                  </span>
                  {isDiscountActive && (
                    <span className="text-xs text-slate-400 line-through">
                      ₹{planPrice.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
              </div>
              {isDiscountActive && (
                <div className="text-right">
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold block">
                    Save ₹{discountAmount.toLocaleString('en-IN')} ({discountPercentage}%)
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Plan: ₹{planPrice.toLocaleString('en-IN')}{selectedPlan ? ` / ${intervalLabel(selectedPlan.interval)}` : ''}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Expiry + Note */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">Link Expires</Label>
              <Input type="date" disabled={isGenerating} className="h-9 text-sm" value={expiresAt} min={daysFromNow(1)} onChange={e => setExpiresAt(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">Message Note (optional)</Label>
              <Input disabled={isGenerating} className="h-9 text-sm" placeholder="e.g. Special offer valid this week" value={customNote} onChange={e => setCustomNote(e.target.value)} />
            </div>
          </div>

          {/* Generate */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !selectedPlanId || !selectedPlan || !!discountError}
            className="w-full bg-[#2E4FA3] hover:bg-[#1E3270] text-white gap-2 font-semibold"
          >
            {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" />Generating Link…</>
              : linkSnapshot ? <><RefreshCw className="w-4 h-4" />Regenerate Payment Link</>
              : <><Link className="w-4 h-4" />Generate Razorpay Payment Link</>}
          </Button>

          {/* ── RESULT ── */}
          {linkSnapshot && (
            <div ref={resultRef} className="space-y-3 pb-2">
              <Separator />

              {/* Amount chip */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs">
                <IndianRupee className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">
                  <strong className="text-blue-700 dark:text-blue-300">₹{linkSnapshot.amount.toLocaleString('en-IN')}</strong>
                  {' · '}{linkSnapshot.planName}{' · '}{intervalLabel(linkSnapshot.interval)}
                  {(linkSnapshot.discountAmount ?? 0) > 0 && (
                    <span className="ml-1.5 text-emerald-600 font-semibold">
                      (₹{linkSnapshot.discountAmount?.toLocaleString('en-IN')} OFF · {linkSnapshot.discountPercentage}%)
                    </span>
                  )}
                </span>
              </div>

              {/* Link row */}
              <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-green-600 dark:text-green-400 font-bold uppercase tracking-wide mb-0.5">Payment Link Ready ✅</p>
                  <a href={linkSnapshot.url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-600 dark:text-blue-400 underline truncate block font-mono">
                    {linkSnapshot.url}
                  </a>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <Button size="sm" variant="outline" onClick={handleCopy} className="h-7 px-2 gap-1 text-xs">
                    {copiedLink ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                    {copiedLink ? 'Copied!' : 'Copy'}
                  </Button>
                  <Button size="sm" variant="outline" asChild className="h-7 px-2">
                    <a href={linkSnapshot.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </Button>
                </div>
              </div>

              {/* Send label & Quick Copy Header */}
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Send to {restaurant.owner_name || restaurant.name}
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopyWaText}
                  className="h-6 px-2 text-[11px] text-green-700 dark:text-green-400 hover:text-green-800 hover:bg-green-100 dark:hover:bg-green-950/40 gap-1 font-semibold"
                  title="Copy full WhatsApp message with emojis directly to clipboard"
                >
                  {copiedWaText ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                  {copiedWaText ? 'Message Copied!' : 'Copy WhatsApp Text'}
                </Button>
              </div>

              {/* WhatsApp Buttons Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {rawPhone ? (
                  <Button
                    asChild
                    className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold h-9"
                  >
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => toast.success('Opening WhatsApp...')}
                    >
                      <MessageSquare className="w-4 h-4" />
                      Send via WhatsApp ({cleanPhone.slice(-10)})
                    </a>
                  </Button>
                ) : (
                  <Button
                    disabled
                    className="w-full gap-2 bg-slate-200 dark:bg-slate-800 text-slate-400 text-xs font-semibold h-9"
                  >
                    <MessageSquare className="w-4 h-4" />
                    No phone on record
                  </Button>
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopyWaText}
                  className="w-full gap-2 border-green-300 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950/30 text-xs font-semibold h-9"
                >
                  {copiedWaText ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  {copiedWaText ? 'Copied Message!' : 'Copy WhatsApp Message'}
                </Button>
              </div>

              {/* Email Button */}
              <Button
                onClick={handleSendEmail} disabled={isSendingEmail}
                className="w-full gap-2 bg-[#2E4FA3] hover:bg-[#1E3270] text-white text-xs font-semibold h-9"
              >
                {isSendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                {isSendingEmail ? 'Sending…' : `Send via Email ${restaurant.owner_email || restaurant.email ? `(${restaurant.owner_email || restaurant.email})` : '— no email on record'}`}
              </Button>

              {/* UPI QR toggle */}
              <button
                type="button" onClick={() => setShowQr(!showQr)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-dashed border-orange-300/60 text-orange-600 dark:text-orange-400 text-xs font-medium hover:bg-orange-50/40 dark:hover:bg-orange-950/20 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5" />
                  {showQr ? 'Hide' : 'Show'} UPI Payment Card (share / save as image)
                </span>
                {showQr ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showQr && (
                <UPIPaymentCard
                  company={paymentConfig}
                  planName={linkSnapshot.planName}
                  planPrice={linkSnapshot.amount}
                  invoiceNumber={`RENEWAL-${restaurant.id.slice(0, 6).toUpperCase()}`}
                />
              )}

              {/* Activation note */}
              <div className="space-y-1 text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
                <p>
                  💡 <strong>Razorpay</strong> → subscription activates automatically on payment.
                  <strong> UPI</strong> → ask the customer to share UTR to <strong>+91 83295 40398</strong> for manual activation.
                </p>
                <p>
                  ✨ <strong>WhatsApp Emojis</strong> → If browser redirects alter emojis on your desktop, use <strong>Copy WhatsApp Message</strong> above to paste directly into chat with full icons intact.
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ── Branded renewal email HTML ─────────────────────────────────────────────────
function buildRenewalEmailHtml(opts: {
  restaurantName: string;
  ownerName: string;
  planName: string;
  interval: string;
  amount: number;
  originalAmount?: number;
  discountAmount?: number;
  discountPercentage?: number;
  expiryDate: string;
  invoiceNumber: string;
  paymentLink: string;
  upiId: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  accountName?: string;
  branch?: string;
  phone?: string;
  email?: string;
  note?: string;
}) {
  const restName = escHtml(opts.restaurantName);
  const owner    = escHtml(opts.ownerName);
  const planName = escHtml(opts.planName);
  const interval = escHtml(opts.interval);
  const expiry   = escHtml(opts.expiryDate);
  const invNo    = escHtml(opts.invoiceNumber);
  const note     = opts.note ? escHtml(opts.note) : '';
  const payLink  = opts.paymentLink;
  const upiId    = escHtml(opts.upiId);
  const bankName = escHtml(opts.bankName);
  const accNo    = escHtml(opts.accountNumber);
  const ifsc     = escHtml(opts.ifsc);
  const accName  = escHtml(opts.accountName || 'Swadeshi Solutions');
  const branch   = escHtml(opts.branch || 'Bhuinj, Satara');
  const phone    = escHtml(opts.phone || '+91 83295 40398');
  const suppMail = escHtml(opts.email || 'support@swadeshisolutions.com');
  const amount   = opts.amount.toLocaleString('en-IN');
  const origAmount = (opts.originalAmount ?? (opts.amount + (opts.discountAmount || 0))).toLocaleString('en-IN');
  const discAmt  = opts.discountAmount ? opts.discountAmount.toLocaleString('en-IN') : '0';
  const hasDisc  = !!opts.discountAmount && opts.discountAmount > 0;
  const year     = new Date().getFullYear();

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Subscription Renewal - ${restName}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f1f5f9;padding:30px 10px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 18px rgba(15,23,42,0.08);border:1px solid #e2e8f0;">

          <!-- Top Brand Gradient Bar -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#F26522 0%,#2E4FA3 100%);line-height:4px;font-size:4px;">&nbsp;</td>
          </tr>

          <!-- Header: Brand Logo & Status Tag -->
          <tr>
            <td style="padding:28px 32px 20px 32px;border-bottom:1px solid #f1f5f9;">
              <table width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td valign="middle">
                    <table cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="vertical-align:middle;padding-right:12px;">
                          <img src="https://clmsoetktmvhazctlans.supabase.co/storage/v1/object/public/images/90bfb05e-129b-45ea-b5e3-519cbd00cfab.png" alt="Swadeshi Solutions" width="40" height="40" style="display:block;border-radius:8px;border:0;">
                        </td>
                        <td style="vertical-align:middle;">
                          <div style="font-size:16px;font-weight:800;color:#0f172a;letter-spacing:-0.2px;line-height:1.2;">Swadeshi Solutions</div>
                          <div style="font-size:11px;color:#64748b;margin-top:2px;">Restaurant &amp; Hospitality Management Platform</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" valign="middle">
                    <div style="display:inline-block;padding:4px 12px;background-color:#fff7ed;border:1px solid #fed7aa;border-radius:20px;color:#c2410c;font-size:10px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">
                      Renewal Action Required
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Greeting & Personalized Context -->
          <tr>
            <td style="padding:24px 32px 16px 32px;">
              <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:8px;">
                Hello ${owner},
              </div>
              <div style="font-size:13.5px;color:#334155;line-height:1.6;">
                We are writing regarding the upcoming subscription renewal for <strong>${restName}</strong>. Your current POS management license is expiring on <strong>${expiry}</strong>.
              </div>
              <div style="font-size:13px;color:#64748b;line-height:1.6;margin-top:8px;">
                Renew today to ensure uninterrupted billing, kitchen order tickets (KOT), inventory control, and cloud synchronization across all terminals.
              </div>
            </td>
          </tr>

          ${note ? `
          <!-- Optional Custom Note -->
          <tr>
            <td style="padding:0 32px 16px 32px;">
              <div style="background-color:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;font-size:12.5px;color:#92400e;line-height:1.5;">
                📝 <strong>Note from Swadeshi Solutions:</strong> ${note}
              </div>
            </td>
          </tr>
          ` : ''}

          <!-- Key Details Grid (2x2 Box) -->
          <tr>
            <td style="padding:0 32px 20px 32px;">
              <table width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">
                <tr>
                  <td width="50%" valign="top" style="padding:4px 8px 12px 4px;">
                    <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Reference / Invoice No.</div>
                    <div style="font-size:13px;font-weight:700;color:#0f172a;margin-top:2px;font-family:monospace;">${invNo}</div>
                  </td>
                  <td width="50%" valign="top" style="padding:4px 4px 12px 8px;">
                    <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Plan &amp; Billing Cycle</div>
                    <div style="font-size:13px;font-weight:700;color:#0f172a;margin-top:2px;">${planName} (${interval.toUpperCase()})</div>
                  </td>
                </tr>
                <tr>
                  <td width="50%" valign="top" style="padding:4px 8px 4px 4px;">
                    <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Current Term Ends</div>
                    <div style="font-size:13px;font-weight:700;color:#0f172a;margin-top:2px;">${expiry}</div>
                  </td>
                  <td width="50%" valign="top" style="padding:4px 4px 4px 8px;">
                    <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Renewal Amount</div>
                    <div style="font-size:16px;font-weight:800;color:#2E4FA3;margin-top:2px;">₹${amount}</div>
                    ${hasDisc ? `
                    <div style="font-size:10.5px;font-weight:700;color:#16a34a;margin-top:2px;">
                      Save ₹${discAmt} (${opts.discountPercentage ?? ''}% OFF)
                    </div>
                    <div style="font-size:9.5px;color:#94a3b8;text-decoration:line-through;margin-top:1px;">
                      Base: ₹${origAmount}
                    </div>` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Primary CTA Button (Razorpay) -->
          <tr>
            <td style="padding:0 32px 24px 32px;text-align:center;">
              <table width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <a href="${payLink}" target="_blank" style="display:inline-block;background-color:#F26522;color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:10px;font-size:15px;font-weight:700;letter-spacing:0.3px;box-shadow:0 3px 12px rgba(242,101,34,0.35);">
                      Pay Now via Razorpay &rarr;
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top:8px;">
                    <div style="font-size:11px;color:#64748b;">
                      ✓ Instant automated subscription activation upon successful payment
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Line Item / Service Description Table -->
          <tr>
            <td style="padding:0 32px 24px 32px;">
              <table width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
                <thead>
                  <tr style="background-color:#0f172a;color:#ffffff;">
                    <th align="left" style="padding:10px 14px;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">Service Description</th>
                    <th align="right" style="padding:10px 14px;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style="border-bottom:1px solid #e2e8f0;">
                    <td style="padding:12px 14px;font-size:13px;color:#0f172a;">
                      <strong>${planName} License Renewal</strong>
                      <div style="font-size:11.5px;color:#64748b;margin-top:2px;">${restName} &middot; Full Cloud POS, Kitchen Order System &amp; Cloud Sync</div>
                    </td>
                    <td style="padding:12px 14px;font-size:13px;font-weight:600;color:#0f172a;text-align:right;">₹${hasDisc ? origAmount : amount}</td>
                  </tr>
                  ${hasDisc ? `
                  <tr style="border-bottom:1px solid #e2e8f0;background-color:#f0fdf4;">
                    <td style="padding:10px 14px;font-size:12.5px;color:#15803d;font-weight:600;">
                      🎉 Special Renewal Discount
                    </td>
                    <td style="padding:10px 14px;font-size:12.5px;font-weight:700;color:#15803d;text-align:right;">
                      -₹${discAmt}
                    </td>
                  </tr>` : ''}
                  <tr style="background-color:#f8fafc;">
                    <td style="padding:12px 14px;font-size:13px;font-weight:700;color:#0f172a;">Total Renewal Amount</td>
                    <td style="padding:12px 14px;font-size:16px;font-weight:800;text-align:right;color:#0f172a;">₹${amount}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Bank Transfer / UPI Instructions Box -->
          <tr>
            <td style="padding:0 32px 24px 32px;">
              <table width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:16px;">
                <tr>
                  <td>
                    <div style="font-size:12.5px;font-weight:700;color:#1e3a8a;margin-bottom:8px;">
                      Or Pay via UPI / Direct Bank Transfer
                    </div>
                    <div style="font-size:12px;color:#1e293b;line-height:1.65;">
                      <strong>UPI ID:</strong> <span style="font-family:monospace;font-weight:700;color:#1d4ed8;">${upiId}</span><br>
                      <strong>Bank:</strong> ${bankName}<br>
                      <strong>Account Name:</strong> ${accName}<br>
                      <strong>Account No:</strong> <span style="font-family:monospace;font-weight:700;color:#1d4ed8;">${accNo}</span><br>
                      <strong>IFSC:</strong> ${ifsc} &nbsp;|&nbsp; <strong>Branch:</strong> ${branch}
                    </div>
                    <div style="margin-top:10px;font-size:11.5px;color:#475569;line-height:1.5;">
                      💡 After UPI/Bank transfer, please send the UTR / payment screenshot to <strong>${phone}</strong> on WhatsApp for manual activation.
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Support & Assistance -->
          <tr>
            <td style="padding:0 32px 24px 32px;border-bottom:1px solid #f1f5f9;">
              <div style="font-size:12px;color:#64748b;line-height:1.5;">
                Need help or have questions about your billing? Our dedicated support team is available 24/7:<br>
                📞 Phone / WhatsApp: <a href="tel:${phone}" style="color:#2563eb;text-decoration:none;font-weight:600;">${phone}</a> &nbsp;|&nbsp; 
                ✉️ Email: <a href="mailto:${suppMail}" style="color:#2563eb;text-decoration:none;font-weight:600;">${suppMail}</a>
              </div>
            </td>
          </tr>

          <!-- Official Executive Signature Block (Sudip Jangam) -->
          <tr>
            <td style="padding:24px 32px;background-color:#ffffff;border-top:1px solid #f1f5f9;">
              <table cellpadding="0" cellspacing="0" border="0" style="background:transparent;border-collapse:collapse;width:100%;" width="100%">
                <tbody valign="middle">
                  <tr valign="inherit">
                    <td style="padding-right:24px;vertical-align:middle;width:140px;" valign="middle">
                      <a href="https://www.swadeshisolutions.co.in" target="_blank">
                        <img src="https://clmsoetktmvhazctlans.supabase.co/storage/v1/object/public/images/90bfb05e-129b-45ea-b5e3-519cbd00cfab.png" alt="Swadeshi Solutions" width="130" style="width:130px;max-width:130px;display:block;border:0;">
                      </a>
                    </td>
                    <td style="border-left:2px solid #0056b3;padding-left:22px;vertical-align:middle;" valign="middle">
                      <strong style="font-size:16px;color:#111111;letter-spacing:0.3px;">Sudip Jangam</strong>
                      <br><span style="color:#666666;font-size:13px;">Chief Technology Officer</span>
                      <br><span style="color:#0056b3;font-size:13px;font-weight:bold;display:inline-block;margin-top:2px;">Swadeshi Solutions</span>
                      <br><span style="color:rgb(0,86,179);font-size:13px;font-weight:bold;display:inline-block;margin-top:2px;font-family:sans-serif,arial;">&nbsp;830-890-3224</span>
                      <div style="margin-top:10px;font-size:12.5px;color:#555555;">
                        <span style="display:inline-block;vertical-align:middle;margin-right:6px;"><img src="https://cdn-icons-png.flaticon.com/16/542/542689.png" width="12" height="12" style="display:block;border:0;" alt="Email"></span> <a href="mailto:sudipjangam@swadeshisolutions.co.in" style="color:#0056b3;text-decoration:none;">sudipjangam@swadeshisolutions.co.in</a>
                        <br><span style="display:inline-block;vertical-align:middle;margin-right:6px;margin-top:3px;"><img src="https://cdn-icons-png.flaticon.com/16/1006/1006771.png" width="12" height="12" style="display:block;border:0;" alt="Web"></span> <a href="https://www.swadeshisolutions.co.in" target="_blank" style="color:#0056b3;text-decoration:none;">www.swadeshisolutions.co.in</a>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div style="margin-top:14px;border-top:1px solid #eeeeee;padding-top:6px;font-size:11px;color:#888888;font-style:italic;">Next-gen Restaurant Management Systems</div>
            </td>
          </tr>

          <!-- Dark Navy Footer -->
          <tr>
            <td style="padding:18px 32px;background-color:#0f172a;text-align:center;color:#94a3b8;font-size:11px;">
              <div style="margin-bottom:4px;">
                <a href="https://www.swadeshisolutions.co.in" target="_blank" style="color:#60a5fa;text-decoration:none;font-weight:600;">swadeshisolutions.co.in</a>
              </div>
              <div>&copy; ${year} Swadeshi Solutions. All rights reserved.</div>
              <div style="margin-top:4px;color:#64748b;font-size:10px;">This is an official subscription renewal communication.</div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
