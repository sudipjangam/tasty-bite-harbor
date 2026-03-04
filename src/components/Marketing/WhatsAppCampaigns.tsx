import React, { useState, useMemo } from "react";
import { StandardizedCard } from "@/components/ui/standardized-card";
import { StandardizedButton } from "@/components/ui/standardized-button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
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
} from "lucide-react";
import { format } from "date-fns";

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
  const [promoMessage, setPromoMessage] = useState("");
  const [discountText, setDiscountText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState({ sent: 0, total: 0 });
  const [showHistory, setShowHistory] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(
    "invoice_with_contact",
  );

  // Get target customers
  const targetCustomers = useMemo(() => {
    if (selectAll) return customers;
    return getCustomersByTiers(selectedTierIds);
  }, [selectAll, selectedTierIds, customers, getCustomersByTiers]);

  const customersWithPhone = useMemo(
    () => targetCustomers.filter((c) => c.phone && c.phone.trim().length >= 10),
    [targetCustomers],
  );

  // Estimated cost (Utility template: ~₹0.12/msg)
  const estimatedCost = customersWithPhone.length * 0.12;

  const handleTierToggle = (tierId: string) => {
    setSelectAll(false);
    setSelectedTierIds((prev) =>
      prev.includes(tierId)
        ? prev.filter((id) => id !== tierId)
        : [...prev, tierId],
    );
  };

  const handleSelectAll = () => {
    setSelectAll(true);
    setSelectedTierIds([]);
  };

  const handleSendCampaign = async () => {
    if (customersWithPhone.length === 0) {
      toast({
        title: "No customers",
        description:
          "No customers with valid phone numbers found for the selected tiers.",
        variant: "destructive",
      });
      return;
    }

    const confirmed = window.confirm(
      `Send WhatsApp message to ${customersWithPhone.length} customer${customersWithPhone.length > 1 ? "s" : ""}?\n\nEstimated cost: ${currencySymbol}${estimatedCost.toFixed(2)}\nTemplate: invoice_with_contact`,
    );
    if (!confirmed) return;

    setIsSending(true);
    setSendProgress({ sent: 0, total: customersWithPhone.length });

    try {
      const results = await sendCampaign(
        customersWithPhone,
        null,
        undefined,
        discountText || promoMessage || undefined,
        (sent, total) => setSendProgress({ sent, total }),
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Template Manager */}
      <TemplateManager />

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StandardizedCard className="p-4 border-l-4 border-l-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Sent</p>
              <p className="text-2xl font-bold text-green-600">
                {analytics.totalSent}
              </p>
            </div>
            <Send className="h-8 w-8 text-green-500 opacity-80" />
          </div>
        </StandardizedCard>

        <StandardizedCard className="p-4 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Delivered</p>
              <p className="text-2xl font-bold text-blue-600">
                {analytics.successful}
              </p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-blue-500 opacity-80" />
          </div>
        </StandardizedCard>

        <StandardizedCard className="p-4 border-l-4 border-l-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Failed</p>
              <p className="text-2xl font-bold text-red-600">
                {analytics.failed}
              </p>
            </div>
            <XCircle className="h-8 w-8 text-red-500 opacity-80" />
          </div>
        </StandardizedCard>

        <StandardizedCard className="p-4 border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Delivery Rate</p>
              <p className="text-2xl font-bold text-purple-600">
                {analytics.deliveryRate}%
              </p>
            </div>
            <Sparkles className="h-8 w-8 text-purple-500 opacity-80" />
          </div>
        </StandardizedCard>
      </div>

      {/* Campaign Builder */}
      <StandardizedCard className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
            <MessageSquare className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Send WhatsApp Campaign
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Select customer tiers and send a promotional message via WhatsApp
            </p>
          </div>
        </div>

        {/* Tier Selection */}
        <div className="mb-6">
          <Label className="text-sm font-medium mb-3 block">
            Target Audience
          </Label>
          <div className="flex flex-wrap gap-3">
            {/* All Customers option */}
            <button
              onClick={handleSelectAll}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all ${
                selectAll
                  ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 shadow-sm"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 text-gray-600 dark:text-gray-400"
              }`}
            >
              <Checkbox checked={selectAll} className="pointer-events-none" />
              <Users className="h-4 w-4" />
              <span className="font-medium">All Customers</span>
              <Badge variant="secondary" className="ml-1">
                {customers.length}
              </Badge>
            </button>

            {/* Dynamic tier buttons from DB */}
            {loyaltyTiers.map((tier) => {
              const isSelected = selectedTierIds.includes(tier.id);
              const tierCustomerCount = getCustomersByTiers([tier.id]).length;
              const tierColor = tier.color || "#6b7280";

              return (
                <button
                  key={tier.id}
                  onClick={() => handleTierToggle(tier.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all ${
                    isSelected
                      ? "shadow-sm"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 text-gray-600 dark:text-gray-400"
                  }`}
                  style={
                    isSelected
                      ? {
                          borderColor: tierColor,
                          backgroundColor: `${tierColor}15`,
                          color: tierColor,
                        }
                      : undefined
                  }
                >
                  <Checkbox
                    checked={isSelected}
                    className="pointer-events-none"
                  />
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: tierColor }}
                  />
                  <span className="font-medium">{tier.name}</span>
                  <Badge variant="secondary" className="ml-1">
                    {tierCustomerCount}
                  </Badge>
                </button>
              );
            })}
          </div>

          {loyaltyTiers.length === 0 && (
            <p className="text-sm text-amber-600 mt-2 flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              No loyalty tiers configured. Go to CRM → Loyalty Management to
              create tiers.
            </p>
          )}
        </div>

        {/* Message Customization */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="discountText" className="text-sm font-medium">
              Offer / Discount Text
            </Label>
            <Input
              id="discountText"
              value={discountText}
              onChange={(e) => setDiscountText(e.target.value)}
              placeholder="e.g., 20% off on your next visit"
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              This appears as the "amount" field in the WhatsApp template
            </p>
          </div>
          <div>
            <Label htmlFor="promoMessage" className="text-sm font-medium">
              Campaign Note (Internal)
            </Label>
            <Input
              id="promoMessage"
              value={promoMessage}
              onChange={(e) => setPromoMessage(e.target.value)}
              placeholder="e.g., Summer festival promotion"
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              For your reference only; not sent to customers
            </p>
          </div>
        </div>

        {/* Preview Bar */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">
                  {customersWithPhone.length} recipients
                </span>
                {customersWithPhone.length < targetCustomers.length && (
                  <span className="text-xs text-amber-600">
                    ({targetCustomers.length - customersWithPhone.length} have
                    no phone)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-600" />
                <span className="text-sm">
                  Template:{" "}
                  <Select
                    value={selectedTemplate}
                    onValueChange={setSelectedTemplate}
                  >
                    <SelectTrigger className="inline-flex w-auto h-7 text-xs ml-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="invoice_with_contact">
                        invoice_with_contact (default)
                      </SelectItem>
                      {approvedTemplates
                        .filter((t) => t.name !== "invoice_with_contact")
                        .map((t) => (
                          <SelectItem key={t.id} value={t.name}>
                            {t.display_name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  Est. cost:{" "}
                  <strong>
                    {currencySymbol}
                    {estimatedCost.toFixed(2)}
                  </strong>
                </span>
              </div>
            </div>
            <StandardizedButton
              onClick={handleSendCampaign}
              disabled={isSending || customersWithPhone.length === 0}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
            >
              {isSending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send Campaign
                </>
              )}
            </StandardizedButton>
          </div>

          {/* Progress Bar */}
          {isSending && sendProgress.total > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-1">
                <span>Sending messages...</span>
                <span className="font-medium">
                  {sendProgress.sent}/{sendProgress.total}
                </span>
              </div>
              <Progress
                value={(sendProgress.sent / sendProgress.total) * 100}
                className="h-2"
              />
            </div>
          )}
        </div>
      </StandardizedCard>

      {/* Send History */}
      <StandardizedCard className="p-6">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center justify-between w-full"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Send History
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {sendHistory.length} messages sent
              </p>
            </div>
          </div>
          {showHistory ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </button>

        {showHistory && (
          <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
            {sendHistory.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No WhatsApp messages sent yet. Send your first campaign above!
              </p>
            ) : (
              sendHistory.map((send) => (
                <div
                  key={send.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {send.status === "sent" || send.status === "delivered" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    ) : send.status === "failed" ? (
                      <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                    ) : (
                      <Clock className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {send.customer_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {send.customer_phone}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      className={
                        send.status === "sent" || send.status === "delivered"
                          ? "bg-green-100 text-green-800"
                          : send.status === "failed"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                      }
                    >
                      {send.status}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">
                      {format(new Date(send.sent_at), "MMM dd, hh:mm a")}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </StandardizedCard>
    </div>
  );
};

export default WhatsAppCampaigns;
