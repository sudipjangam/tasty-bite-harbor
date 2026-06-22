import React, { useState, useMemo } from "react";
import { StandardizedCard } from "@/components/ui/standardized-card";
import { StandardizedButton } from "@/components/ui/standardized-button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useWhatsAppCampaigns,
  LoyaltyTier,
  WhatsAppCustomer,
} from "@/hooks/useWhatsAppCampaigns";
import { useWhatsAppTemplates } from "@/hooks/useWhatsAppTemplates";
import TemplateManager from "./TemplateManager";
import {
  MessageSquare,
  Send,
  Users,
  Phone,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  UserCheck,
  Search,
  UserX,
  DollarSign,
  TrendingUp,
  Globe,
  Settings,
} from "lucide-react";
import { format } from "date-fns";

const DEFAULT_FOOTER = "billed by Swadeshi Solutions";

const WhatsAppCampaigns: React.FC = () => {
  const { toast } = useToast();
  const { symbol: currencySymbol } = useCurrencyContext();
  const {
    loyaltyTiers,
    customers,
    sendHistory,
    restaurant,
    analytics,
    getCustomersByTiers,
    sendCampaign,
    isLoading,
  } = useWhatsAppCampaigns();
  const { approvedTemplates } = useWhatsAppTemplates();

  const [selectedTierIds, setSelectedTierIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(true);
  const [includeUntiered, setIncludeUntiered] = useState(false);
  const [promoMessage, setPromoMessage] = useState("");
  const [discountText, setDiscountText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState({ sent: 0, total: 0 });
  const [showHistory, setShowHistory] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState("invoice_with_contact");
  const [showConfirm, setShowConfirm] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>("all");
  const [showRecipients, setShowRecipients] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState("");

  // Template Search and Filters
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState<"all" | "UTILITY" | "MARKETING">("all");

  // Customers without any tier assigned
  const untieredCustomers = useMemo(
    () => customers.filter((c) => !c.loyalty_tier_id && !c.loyalty_tier),
    [customers],
  );

  // Get target customers
  const targetCustomers = useMemo(() => {
    if (selectAll) return customers;
    let result = getCustomersByTiers(selectedTierIds);
    if (includeUntiered) {
      const untiered = customers.filter((c) => !c.loyalty_tier_id && !c.loyalty_tier);
      const existingIds = new Set(result.map((c) => c.id));
      result = [...result, ...untiered.filter((c) => !existingIds.has(c.id))];
    }
    return result;
  }, [selectAll, selectedTierIds, includeUntiered, customers, getCustomersByTiers]);

  const customersWithPhone = useMemo(
    () => targetCustomers.filter((c) => c.phone && c.phone.trim().length >= 10),
    [targetCustomers],
  );

  // Calculate cost based on template category (UTILITY: ₹0.12, MARKETING: ₹0.90)
  const selectedTemplateObj = approvedTemplates.find(t => t.name === selectedTemplate);
  const isMarketingTemplate = selectedTemplateObj?.category === 'MARKETING';
  const costPerMsg = isMarketingTemplate ? 0.90 : 0.12;
  const estimatedCost = customersWithPhone.length * costPerMsg;

  const handleTierToggle = (tierId: string) => {
    setSelectAll(false);
    setSelectedTierIds((prev) =>
      prev.includes(tierId)
        ? prev.filter((id) => id !== tierId)
        : [...prev, tierId],
    );
  };

  const handleUntieredToggle = () => {
    setSelectAll(false);
    setIncludeUntiered((prev) => !prev);
  };

  const handleSelectAll = () => {
    setSelectAll(true);
    setSelectedTierIds([]);
    setIncludeUntiered(false);
  };

  const handleSendCampaign = async () => {
    if (customersWithPhone.length === 0) {
      toast({
        title: "No customers",
        description:
          "No customers with valid phone numbers found for the selected segment.",
        variant: "destructive",
      });
      return;
    }
    setShowConfirm(true);
  };

  const executeSend = async () => {
    setShowConfirm(false);
    setIsSending(true);
    setSendProgress({ sent: 0, total: customersWithPhone.length });

    try {
      const results = await sendCampaign(
        customersWithPhone,
        null,
        undefined,
        discountText || promoMessage || undefined,
        (sent, total) => setSendProgress({ sent, total }),
        selectedTemplate,
      );

      if (results.success > 0) {
        toast({
          title: "Campaign Sent! ✅",
          description: `${results.success} message${results.success > 1 ? "s" : ""} sent successfully${results.failed > 0 ? `, ${results.failed} failed` : ""}.`,
        });
      }

      if (results.failed > 0 && results.success === 0) {
        toast({
          title: "Campaign Failed",
          description: `All ${results.failed} messages failed. ${results.errors[0] || ""}`,
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to send campaign",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
      setSendProgress({ sent: 0, total: 0 });
    }
  };

  // Helper for live message rendering in mockup simulator
  const getSimulatedMessageText = (bodyText: string, templateObj: any) => {
    if (!bodyText) return "";

    const resolved: Record<string, string> = {
      customer_name: customersWithPhone[0]?.name || "John Doe",
      restaurant_name: restaurant?.name || "Tasty Bite Harbor",
      amount: discountText || "20% Off",
      discount_code: "SAVE20",
      order_date: new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      contact_number: restaurant?.phone || "9876543210",
    };

    let preview = bodyText;

    // Named variables
    Object.entries(resolved).forEach(([key, val]) => {
      preview = preview.split(`{{${key}}}`).join(val);
    });

    // Positional variables
    if (templateObj?.variables) {
      const sortedVars = [...templateObj.variables].sort((a: any, b: any) => a.position - b.position);
      sortedVars.forEach((v: any, index: number) => {
        const val = resolved[v.name] || v.sample || "-";
        preview = preview.split(`{{${index + 1}}}`).join(val);
        preview = preview.split(`{{${v.name}}}`).join(val);
      });
    } else {
      const fallbackSeq = [
        resolved.customer_name,
        resolved.restaurant_name,
        resolved.amount,
        resolved.order_date,
        resolved.contact_number,
        resolved.discount_code
      ];
      fallbackSeq.forEach((val, i) => {
        preview = preview.split(`{{${i + 1}}}`).join(val);
      });
    }

    return preview;
  };

  // Filter templates list for the Picker
  const filteredTemplatesForPicker = useMemo(() => {
    // Add default invoice template to the picker array so it's searchable
    const defaultTemplate = {
      id: "default_invoice",
      name: "invoice_with_contact",
      display_name: "Invoice & Contact (Default)",
      category: "UTILITY",
      language: "en",
      body: "Hi {{customer_name}},\nYour order from {{restaurant_name}} is being prepared!\nAmount: {{amount}}\nDate: {{order_date}}\nCall us: {{contact_number}}",
      variables: [
        { position: 1, name: "customer_name", sample: "John Doe" },
        { position: 2, name: "restaurant_name", sample: "Tasty Bite Harbor" },
        { position: 3, name: "amount", sample: "₹500" },
        { position: 4, name: "order_date", sample: "Mar 04, 2026" },
        { position: 5, name: "contact_number", sample: "9876543210" },
      ],
      is_default: true,
    };

    const allOptions = [defaultTemplate, ...approvedTemplates.filter(t => t.name !== "invoice_with_contact")];

    return allOptions.filter(t => {
      if (templateCategoryFilter !== "all" && t.category !== templateCategoryFilter) return false;
      if (templateSearch) {
        const q = templateSearch.toLowerCase();
        return t.display_name.toLowerCase().includes(q) || t.name.toLowerCase().includes(q) || t.body.toLowerCase().includes(q);
      }
      return true;
    });
  }, [approvedTemplates, templateSearch, templateCategoryFilter]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 bg-white/40 dark:bg-white/[0.02] rounded-3xl border border-black/[0.04] dark:border-white/[0.05] backdrop-blur-xl">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-transparent border-t-green-500 animate-spin" />
          <span className="text-sm text-muted-foreground font-semibold animate-pulse">Loading campaign center...</span>
        </div>
      </div>
    );
  }

  // Active stats cards matching main page glassmorphism orb styling
  const statsConfig = [
    {
      title: "Total Sent",
      value: analytics.totalSent,
      gradient: "from-blue-600 to-indigo-400 shadow-[0_0_15px_rgba(96,165,250,0.3)]",
      icon: <Send className="h-5 w-5 text-white" />,
      textColor: "text-blue-500 dark:text-blue-400",
    },
    {
      title: "Delivered",
      value: analytics.successful,
      gradient: "from-green-600 to-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)]",
      icon: <CheckCircle2 className="h-5 w-5 text-white" />,
      textColor: "text-green-500 dark:text-green-400",
    },
    {
      title: "Failed",
      value: analytics.failed,
      gradient: "from-red-600 to-rose-400 shadow-[0_0_15px_rgba(248,113,113,0.3)]",
      icon: <XCircle className="h-5 w-5 text-white" />,
      textColor: "text-red-500 dark:text-red-400",
    },
    {
      title: "Delivery Rate",
      value: `${analytics.deliveryRate}%`,
      gradient: "from-purple-600 to-violet-400 shadow-[0_0_15px_rgba(168,85,247,0.3)]",
      icon: <Sparkles className="h-5 w-5 text-white" />,
      textColor: "text-purple-500 dark:text-purple-400",
    },
  ];

  return (
    <>
      <div className="space-y-6">
        {/* Template Manager Section */}
        <TemplateManager />

        {/* ── Stats Strip ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsConfig.map((stat, idx) => (
            <div
              key={idx}
              className="
                group relative rounded-2xl p-5 border cursor-default overflow-hidden
                bg-white/60 dark:bg-white/[0.04]
                border-black/[0.06] dark:border-white/[0.08]
                backdrop-blur-xl
                transition-all duration-200
                hover:-translate-y-1
                hover:border-green-400/20 dark:hover:border-green-500/20
                hover:shadow-[0_12px_40px_rgba(16,185,129,0.06)]
              "
            >
              {/* top shimmer line */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                    {stat.title}
                  </p>
                  <p className={`text-2xl font-black ${stat.textColor}`}>
                    {stat.value}
                  </p>
                </div>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${stat.gradient}`}>
                  {stat.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Campaign Builder Section ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left/Middle cols: Setup panels */}
          <div className="lg:col-span-2 space-y-6">
            <StandardizedCard className="
              relative rounded-3xl p-6 overflow-hidden border
              bg-white/60 dark:bg-white/[0.04]
              border-black/[0.06] dark:border-white/[0.08]
              backdrop-blur-xl
            ">
              <div className="flex items-center gap-3.5 mb-6 border-b border-black/[0.04] dark:border-white/[0.06] pb-4">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-gradient-to-br from-emerald-500 to-green-500 shadow-[0_4px_16px_rgba(16,185,129,0.25)] text-white">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    Send WhatsApp Campaign
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Configure target segment, customize offer text and template variables
                  </p>
                </div>
              </div>

              {/* Step 1: Target Audience */}
              <div className="mb-6 bg-black/[0.01] dark:bg-white/[0.01] rounded-2xl border border-black/[0.04] dark:border-white/[0.04] p-4">
                <div className="flex items-center justify-between mb-3 border-b border-black/[0.03] dark:border-white/[0.03] pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                      1
                    </span>
                    <Label className="text-xs font-extrabold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                      Target Audience
                    </Label>
                  </div>
                  {!selectAll && (selectedTierIds.length > 0 || includeUntiered) && (
                    <button
                      onClick={() => setShowRecipients(!showRecipients)}
                      className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-500 transition-colors"
                    >
                      {showRecipients ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      {showRecipients ? "Hide" : "Preview"} ({customersWithPhone.length})
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {/* All Customers button */}
                  <button
                    onClick={handleSelectAll}
                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all duration-200 text-xs font-bold ${
                      selectAll
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)] font-black"
                        : "border-black/[0.08] dark:border-white/[0.08] hover:border-black/[0.12] dark:hover:border-white/[0.12] text-muted-foreground"
                    }`}
                  >
                    <Users className="h-4 w-4" />
                    <span>All Customers</span>
                    <Badge variant="secondary" className="bg-black/[0.04] dark:bg-white/[0.06] text-inherit border-none text-[10px] h-5 px-1.5 min-w-[20px] flex items-center justify-center">
                      {customers.length}
                    </Badge>
                  </button>

                  {/* Dynamic tiers from DB */}
                  {loyaltyTiers.map((tier) => {
                    const isSelected = selectedTierIds.includes(tier.id);
                    const tierCustomerCount = getCustomersByTiers([tier.id]).length;
                    const tierColor = tier.color || "#6b7280";

                    return (
                      <button
                        key={tier.id}
                        onClick={() => handleTierToggle(tier.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-200 text-xs font-bold ${
                          isSelected
                            ? "font-black"
                            : "border-black/[0.08] dark:border-white/[0.08] hover:border-black/[0.12] dark:hover:border-white/[0.12] text-muted-foreground"
                        }`}
                        style={
                          isSelected
                            ? {
                                borderColor: tierColor,
                                backgroundColor: `${tierColor}15`,
                                color: tierColor,
                                boxShadow: `0 0 12px ${tierColor}20`,
                              }
                            : undefined
                        }
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: tierColor }}
                        />
                        <span>{tier.name}</span>
                        <Badge variant="secondary" className="bg-black/[0.04] dark:bg-white/[0.06] text-inherit border-none text-[10px] h-5 px-1.5 min-w-[20px] flex items-center justify-center">
                          {tierCustomerCount}
                        </Badge>
                      </button>
                    );
                  })}

                  {/* Untiered option */}
                  {untieredCustomers.length > 0 && (
                    <button
                      onClick={handleUntieredToggle}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-200 text-xs font-bold ${
                        includeUntiered
                          ? "border-gray-500 bg-gray-500/10 text-gray-700 dark:text-gray-300 font-black shadow-[0_0_12px_rgba(0,0,0,0.05)]"
                          : "border-black/[0.08] dark:border-white/[0.08] hover:border-black/[0.12] dark:hover:border-white/[0.12] text-muted-foreground"
                      }`}
                    >
                      <UserX className="h-4 w-4" />
                      <span>Untiered</span>
                      <Badge variant="secondary" className="bg-black/[0.04] dark:bg-white/[0.06] text-inherit border-none text-[10px] h-5 px-1.5 min-w-[20px] flex items-center justify-center">
                        {untieredCustomers.length}
                      </Badge>
                    </button>
                  )}
                </div>

                {loyaltyTiers.length === 0 && (
                  <p className="text-xs text-amber-600 mt-2 flex items-center gap-1.5 font-medium">
                    <AlertTriangle className="h-4.5 w-4.5 flex-shrink-0" />
                    No loyalty tiers configured. Create tiers in CRM Loyalty module.
                  </p>
                )}

                {/* Searchable Recipient Preview List */}
                {showRecipients && !selectAll && customersWithPhone.length > 0 && (
                  <div className="mt-3.5 border border-emerald-500/10 rounded-2xl bg-black/[0.01] dark:bg-white/[0.01] overflow-hidden shadow-inner">
                    <div className="px-4 py-2.5 bg-black/[0.02] dark:bg-white/[0.02] flex items-center justify-between border-b border-black/[0.04] dark:border-white/[0.04]">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-emerald-500" />
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                          Recipients ({customersWithPhone.length})
                        </span>
                      </div>
                      <div className="relative w-44">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          value={recipientSearch}
                          onChange={(e) => setRecipientSearch(e.target.value)}
                          placeholder="Search phone/name..."
                          className="h-7 pl-8 text-xs bg-white dark:bg-gray-800 border-black/[0.08] dark:border-white/[0.08] rounded-lg"
                        />
                      </div>
                    </div>

                    <div className="max-h-52 overflow-y-auto divide-y divide-black/[0.04] dark:divide-white/[0.04]">
                      {(() => {
                        const filtered = customersWithPhone.filter((c) => {
                          if (!recipientSearch) return true;
                          const q = recipientSearch.toLowerCase();
                          return (
                            (c.name || "").toLowerCase().includes(q) ||
                            (c.phone || "").includes(q)
                          );
                        });

                        const groups: { label: string; color: string; list: typeof filtered }[] = [];

                        for (const tierId of selectedTierIds) {
                          const tier = loyaltyTiers.find((t) => t.id === tierId);
                          if (!tier) continue;
                          const tierCustomers = filtered.filter(
                            (c) => c.loyalty_tier_id === tierId || (c.loyalty_tier && c.loyalty_tier.toLowerCase() === tier.name.toLowerCase())
                          );
                          if (tierCustomers.length > 0) {
                            groups.push({ label: tier.name, color: tier.color || "#6b7280", list: tierCustomers });
                          }
                        }

                        if (includeUntiered) {
                          const untiered = filtered.filter((c) => !c.loyalty_tier_id && !c.loyalty_tier);
                          if (untiered.length > 0) {
                            groups.push({ label: "Untiered", color: "#9ca3af", list: untiered });
                          }
                        }

                        if (groups.length === 0) {
                          return <div className="px-4 py-6 text-center text-xs text-muted-foreground">No matches found</div>;
                        }

                        return groups.map((g) => (
                          <div key={g.label}>
                            <div className="px-4 py-1.5 bg-black/[0.02] dark:bg-white/[0.02] flex items-center gap-1.5 sticky top-0 z-10 border-y border-black/[0.02] dark:border-white/[0.02]">
                              <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: g.color }} />
                              <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">{g.label}</span>
                              <span className="text-[10px] text-muted-foreground font-semibold">({g.list.length})</span>
                            </div>
                            {g.list.map((c) => (
                              <div
                                key={c.id}
                                className="px-4 py-2 flex items-center justify-between hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <div
                                    className="w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                                    style={{ background: `linear-gradient(135deg, ${g.color}dd, ${g.color})` }}
                                  >
                                    {(c.name || "?").charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{c.name || "Unknown"}</p>
                                    <p className="text-[10px] text-muted-foreground font-mono">
                                      {c.phone ? c.phone.replace(/(\d{2})(\d{4})(\d{4})$/, "$1****$3") : "—"}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {c.loyalty_points > 0 && (
                                    <span className="text-[10px] text-amber-600 dark:text-amber-500 font-bold bg-amber-500/5 px-1.5 py-0.5 rounded-lg">
                                      {c.loyalty_points} pts
                                    </span>
                                  )}
                                  <Phone className="h-3 w-3 text-emerald-500" />
                                </div>
                              </div>
                            ))}
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2: Visual Template Card Selector */}
              <div className="mb-6 bg-black/[0.01] dark:bg-white/[0.01] rounded-2xl border border-black/[0.04] dark:border-white/[0.04] p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-black/[0.03] dark:border-white/[0.03] pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                      2
                    </span>
                    <Label className="text-xs font-extrabold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                      Select Message Template
                    </Label>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {/* Template Search */}
                    <div className="relative flex-1 sm:flex-initial">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        value={templateSearch}
                        onChange={(e) => setTemplateSearch(e.target.value)}
                        placeholder="Search templates..."
                        className="h-8 pl-8 text-xs bg-white dark:bg-gray-800 border-black/[0.08] dark:border-white/[0.08] w-full sm:w-36 rounded-lg"
                      />
                    </div>

                    {/* Category Filter */}
                    <select
                      value={templateCategoryFilter}
                      onChange={(e: any) => setTemplateCategoryFilter(e.target.value)}
                      className="h-8 text-xs rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2"
                    >
                      <option value="all">All types</option>
                      <option value="UTILITY">Utility</option>
                      <option value="MARKETING">Marketing</option>
                    </select>
                  </div>
                </div>

                {/* Templates Scroll Box */}
                <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1">
                  {filteredTemplatesForPicker.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground">
                      No approved templates found matching filters
                    </div>
                  ) : (
                    filteredTemplatesForPicker.map((t) => {
                      const isSelected = selectedTemplate === t.name;
                      return (
                        <div
                          key={t.id}
                          onClick={() => setSelectedTemplate(t.name)}
                          className={`
                            p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer relative overflow-hidden flex flex-col justify-between
                            bg-white dark:bg-white/[0.01]
                            ${isSelected
                              ? "border-purple-500 dark:border-purple-400 bg-purple-500/5 shadow-sm"
                              : "border-black/[0.06] dark:border-white/[0.06] hover:border-black/[0.1] dark:hover:border-white/[0.1] hover:bg-black/[0.01]"
                            }
                          `}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">
                                {t.display_name}
                              </span>
                              {t.is_default && (
                                <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-none font-semibold text-[8px] h-4.5 px-1">
                                  Default
                                </Badge>
                              )}
                            </div>
                            <Badge variant="outline" className={`text-[8px] font-semibold tracking-wider h-4 px-1.5 uppercase ${t.category === "MARKETING" ? "bg-purple-100 text-purple-700 dark:bg-purple-950/20 dark:text-purple-300" : "bg-blue-100 text-blue-700 dark:bg-blue-950/20 dark:text-blue-300"} border-none`}>
                              {t.category}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground font-mono truncate">
                            {t.body}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Step 3: Message Customization */}
              <div className="bg-black/[0.01] dark:bg-white/[0.01] rounded-2xl border border-black/[0.04] dark:border-white/[0.04] p-4">
                <div className="flex items-center gap-2 mb-3 border-b border-black/[0.03] dark:border-white/[0.03] pb-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                    3
                  </span>
                  <Label className="text-xs font-extrabold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    Customize Offer Details
                  </Label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="discountText" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Offer / Discount Text
                    </Label>
                    <Input
                      id="discountText"
                      value={discountText}
                      onChange={(e) => setDiscountText(e.target.value)}
                      placeholder="e.g., 20% off on your next visit"
                      className="mt-1 h-9 rounded-xl bg-white dark:bg-gray-800/50 border-black/[0.08] dark:border-white/[0.08]"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Replaces the <code>{"{{amount}}"}</code> or <code>{"{{3}}"}</code> variable inside templates
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="promoMessage" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Internal Notes (Reference)
                    </Label>
                    <Input
                      id="promoMessage"
                      value={promoMessage}
                      onChange={(e) => setPromoMessage(e.target.value)}
                      placeholder="e.g., Diwali special launch"
                      className="mt-1 h-9 rounded-xl bg-white dark:bg-gray-800/50 border-black/[0.08] dark:border-white/[0.08]"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      For restaurant staff tracking only; not visible to customers
                    </p>
                  </div>
                </div>
              </div>
            </StandardizedCard>
          </div>

          {/* Right col: Realistic WhatsApp Phone Mockup Simulator & Call To Action */}
          <div className="space-y-6">
            <StandardizedCard className="
              relative rounded-3xl p-5 overflow-hidden border
              bg-white/60 dark:bg-white/[0.04]
              border-black/[0.06] dark:border-white/[0.08]
              backdrop-blur-xl
              flex flex-col
            ">
              <Label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-emerald-500" />
                Live simulator (Real-time variables)
              </Label>

              {/* Realistic iOS/Android WhatsApp Container */}
              <div className="bg-[#E5DDD5] dark:bg-[#0b141a]/65 rounded-2xl p-3 min-h-[300px] flex flex-col border border-black/10 dark:border-white/10 shadow-inner">
                {/* Chat Mock Header */}
                <div className="bg-[#075E54] dark:bg-[#1f2c34] text-white rounded-xl px-3 py-2 flex items-center gap-2.5 shadow-sm -mt-1.5 -mx-1.5 mb-3">
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs">
                    🏪
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-[11px] truncate leading-tight">
                      {restaurant?.name || "Swadeshi Solutions"}
                    </p>
                    <p className="text-[9px] text-green-200 flex items-center gap-0.5 leading-none">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                      Official Business Account
                    </p>
                  </div>
                </div>

                {/* Message Bubble Simulator */}
                <div className="flex-1 flex flex-col justify-end">
                  <div className="bg-white dark:bg-[#1f2c34] rounded-2xl p-3 max-w-[90%] shadow-[0_1.5px_4px_rgba(0,0,0,0.08)] relative ml-auto border border-black/[0.03] dark:border-white/[0.03]">
                    {/* Header */}
                    {selectedTemplateObj?.header_text && (
                      <p className="font-extrabold text-[10px] text-gray-900 dark:text-white mb-1 border-b border-black/[0.05] dark:border-white/[0.05] pb-1">
                        {selectedTemplateObj.header_text}
                      </p>
                    )}

                    {/* Resolved Body */}
                    <p className="text-[11px] text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed font-mono">
                      {getSimulatedMessageText(
                        selectedTemplateObj?.body || "Hi {{customer_name}}, prepare order!",
                        selectedTemplateObj
                      )}
                    </p>

                    {/* Footer */}
                    <p className="text-[9px] text-gray-500 mt-2 border-t border-black/[0.04] dark:border-white/[0.04] pt-0.5">
                      {selectedTemplateObj?.footer_text || "billed by Swadeshi Solutions"}
                    </p>

                    {/* Checkmarks and timestamp */}
                    <p className="text-[8px] text-gray-400 text-right mt-1 font-sans">
                      {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      <span className="text-green-500 font-bold ml-0.5">✓✓</span>
                    </p>

                    {/* Speech bubble tail */}
                    <div className="absolute -right-1.5 top-0.5 w-0 h-0 border-l-6 border-l-white dark:border-l-[#1f2c34] border-t-6 border-t-transparent" />
                  </div>
                </div>
              </div>

              {/* Pricing & Send Actions Block */}
              <div className="mt-4 pt-4 border-t border-black/[0.06] dark:border-white/[0.06] space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                    <span>Recipients:</span>
                    <span className="text-foreground font-bold">{customersWithPhone.length} customers</span>
                  </div>
                  {customersWithPhone.length < targetCustomers.length && (
                    <div className="text-[10px] text-amber-600 dark:text-amber-500 font-medium flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {targetCustomers.length - customersWithPhone.length} selected customers have no phone number
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                    <span>Rate type:</span>
                    <span className="text-foreground uppercase text-[10px] font-bold bg-black/[0.03] dark:bg-white/[0.04] px-1.5 py-0.5 rounded-md">
                      {isMarketingTemplate ? "Marketing (₹0.90)" : "Utility (₹0.12)"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs border-t border-dashed border-black/[0.06] dark:border-white/[0.06] pt-2">
                    <span className="font-bold text-gray-700 dark:text-gray-300">Estimated cost:</span>
                    <span className="text-sm font-black text-green-600 dark:text-green-400">
                      {currencySymbol}{estimatedCost.toFixed(2)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleSendCampaign}
                  disabled={isSending || customersWithPhone.length === 0}
                  className="
                    w-full flex items-center justify-center gap-2 h-11 rounded-xl text-xs font-bold text-white transition-all duration-200
                    bg-gradient-to-r from-emerald-600 to-green-500
                    shadow-[0_4px_16px_rgba(16,185,129,0.3)]
                    hover:shadow-[0_6px_22px_rgba(16,185,129,0.45)]
                    hover:-translate-y-0.5
                    disabled:opacity-40 disabled:shadow-none disabled:pointer-events-none
                  "
                >
                  {isSending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Sending campaign...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send WhatsApp Campaign
                    </>
                  )}
                </button>

                {/* Broadcast Progression */}
                {isSending && sendProgress.total > 0 && (
                  <div className="mt-3 bg-black/[0.02] dark:bg-white/[0.02] rounded-xl p-3 border border-black/[0.04] dark:border-white/[0.04]">
                    <div className="flex items-center justify-between text-[11px] mb-1.5 font-bold">
                      <span className="text-emerald-500 animate-pulse flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Transmitting...
                      </span>
                      <span className="text-muted-foreground font-mono">
                        {sendProgress.sent}/{sendProgress.total}
                      </span>
                    </div>
                    <Progress
                      value={(sendProgress.sent / sendProgress.total) * 100}
                      className="h-1.5 bg-black/[0.05] dark:bg-white/[0.05]"
                    />
                  </div>
                )}
              </div>
            </StandardizedCard>
          </div>
        </div>

        {/* ── Campaign Broadcast Logs ── */}
        <StandardizedCard className="
          relative rounded-3xl p-6 overflow-hidden border
          bg-white/60 dark:bg-white/[0.04]
          border-black/[0.06] dark:border-white/[0.08]
          backdrop-blur-xl
        ">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center justify-between w-full border-b border-black/[0.04] dark:border-white/[0.06] pb-3"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-500 shadow-[0_4px_16px_rgba(59,130,246,0.25)] text-white">
                <Clock className="h-5 w-5" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  Broadcast History
                  <Badge variant="secondary" className="bg-black/[0.04] dark:bg-white/[0.06] text-inherit border-none text-[10px]">
                    {sendHistory.length} logs
                  </Badge>
                </h3>
                <p className="text-xs text-muted-foreground">
                  History of WhatsApp messages transmitted from this restaurant
                </p>
              </div>
            </div>
            {showHistory ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </button>

          {showHistory && (
            <div className="mt-5 space-y-4">
              {/* History Search & Filters bar */}
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Filter logs by recipient name or phone number..."
                    className="pl-9 h-10 rounded-xl bg-white/40 dark:bg-white/[0.02] border-black/[0.08] dark:border-white/[0.08]"
                  />
                </div>
                <div className="flex p-0.5 rounded-xl border bg-black/[0.03] dark:bg-white/[0.02] border-black/[0.06] dark:border-white/[0.08] self-start md:self-auto">
                  {['all', 'sent', 'delivered', 'failed'].map(status => {
                    const count = status === 'all'
                      ? sendHistory.length
                      : status === 'delivered'
                        ? sendHistory.filter(s => s.status === 'delivered').length
                        : status === 'sent'
                          ? sendHistory.filter(s => s.status === 'sent').length
                          : sendHistory.filter(s => s.status === 'failed').length;

                    return (
                      <button
                        key={status}
                        onClick={() => setHistoryStatusFilter(status)}
                        className={`
                          px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5
                          ${historyStatusFilter === status
                            ? 'bg-white dark:bg-white/[0.1] text-gray-900 dark:text-white shadow-sm font-bold'
                            : 'text-muted-foreground hover:text-foreground'
                          }
                        `}
                      >
                        <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
                        <span className="text-[9px] bg-black/[0.04] dark:bg-white/[0.06] px-1 rounded-md text-muted-foreground">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Logs Content list */}
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1 divide-y divide-black/[0.03] dark:divide-white/[0.03]">
                {sendHistory.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-8 font-medium">
                    No WhatsApp messages sent yet. Set up your campaigns above!
                  </p>
                ) : (
                  sendHistory
                    .filter(send => {
                      if (historyStatusFilter !== 'all' && send.status !== historyStatusFilter) return false;
                      if (historySearch) {
                        const q = historySearch.toLowerCase();
                        return (
                          (send.customer_name || '').toLowerCase().includes(q) ||
                          (send.customer_phone || '').toLowerCase().includes(q)
                        );
                      }
                      return true;
                    })
                    .map((send) => (
                      <div
                        key={send.id}
                        className="flex items-center justify-between p-3 hover:bg-black/[0.01] dark:hover:bg-white/[0.01] rounded-xl transition-colors gap-3"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            send.status === "sent" || send.status === "delivered"
                              ? "bg-green-500/10 text-green-600 dark:text-green-400"
                              : send.status === "failed"
                                ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          }`}>
                            {send.status === "sent" || send.status === "delivered" ? (
                              <CheckCircle2 className="h-4.5 w-4.5" />
                            ) : send.status === "failed" ? (
                              <XCircle className="h-4.5 w-4.5" />
                            ) : (
                              <Clock className="h-4.5 w-4.5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">
                              {send.customer_name}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              {send.customer_phone}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <Badge
                            className={`
                              border-none text-[9px] font-bold px-1.5 py-0.5 uppercase tracking-wider
                              ${send.status === "sent" || send.status === "delivered"
                                ? "bg-green-500/15 text-green-600 dark:text-green-400"
                                : send.status === "failed"
                                  ? "bg-red-500/15 text-red-600 dark:text-red-400"
                                  : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                              }
                            `}
                          >
                            {send.status}
                          </Badge>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {format(new Date(send.sent_at), "MMM dd, hh:mm a")}
                          </p>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          )}
        </StandardizedCard>
      </div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="rounded-3xl border border-black/[0.08] dark:border-white/[0.08] bg-white/95 dark:bg-[#0c0f1c]/95 backdrop-blur-xl max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black text-lg">Send WhatsApp Campaign</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 text-xs mt-3.5">
                <div className="flex items-center justify-between border-b border-black/[0.04] dark:border-white/[0.04] pb-2 font-bold text-gray-700 dark:text-gray-300">
                  <span>Recipients: {customersWithPhone.length}</span>
                  <span>Est. Cost: {currencySymbol}{estimatedCost.toFixed(2)}</span>
                </div>
                <div className="font-bold text-gray-700 dark:text-gray-300">
                  <span>Selected Template: <code>{selectedTemplate}</code></span>
                  {isMarketingTemplate && (
                    <span className="ml-2 text-amber-500">⚠️ Marketing rate applied</span>
                  )}
                </div>
                {discountText && (
                  <div className="font-bold text-gray-700 dark:text-gray-300">
                    <span>Offer Parameter: <code>{discountText}</code></span>
                  </div>
                )}

                {/* Message preview simulator in dialog */}
                <div className="mt-3.5">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5">Live mockup preview</p>
                  <div className="bg-[#E5DDD5] dark:bg-[#0b141a]/65 rounded-2xl p-3 border border-black/5 dark:border-white/5">
                    <div className="bg-white dark:bg-[#1f2c34] rounded-2xl p-3.5 max-w-[85%] shadow-sm border border-black/[0.03] dark:border-white/[0.03]">
                      {selectedTemplateObj?.header_text && (
                        <p className="font-extrabold text-[10px] text-gray-900 dark:text-white mb-1.5 border-b border-black/[0.05] dark:border-white/[0.05] pb-1">
                          {selectedTemplateObj.header_text}
                        </p>
                      )}
                      <p className="text-[11px] text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed font-mono">
                        {getSimulatedMessageText(
                          selectedTemplateObj?.body || "Prepare order!",
                          selectedTemplateObj
                        )}
                      </p>
                      <p className="text-[9px] text-gray-500 mt-2.5 border-t border-black/[0.04] dark:border-white/[0.04] pt-1">
                        {selectedTemplateObj?.footer_text || DEFAULT_FOOTER}
                      </p>
                      <p className="text-[8px] text-gray-400 text-right mt-1.5 font-sans">✓✓</p>
                    </div>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="rounded-xl h-10 border border-black/[0.08] dark:border-white/[0.08]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeSend}
              className="bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-700 hover:to-green-600 text-white rounded-xl h-10 shadow-md shadow-emerald-500/20 border-none font-bold"
            >
              Send Campaign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default WhatsAppCampaigns;
