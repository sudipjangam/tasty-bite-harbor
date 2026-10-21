import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useFranchise } from "@/contexts/FranchiseContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Receipt,
  Percent,
  CheckCircle2,
  Clock,
  Sparkles,
  Loader2,
  CreditCard,
  FileText,
  Building2,
  Settings2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface RoyaltySetting {
  id: string;
  organization_id: string;
  branch_id: string;
  royalty_percentage: number;
  marketing_fee_percentage: number;
  fixed_monthly_fee: number;
  billing_cycle: string;
  is_active: boolean;
}

interface RoyaltyInvoice {
  id: string;
  organization_id: string;
  branch_id: string;
  invoice_number: string;
  period_start: string;
  period_end: string;
  gross_sales: number;
  net_sales: number;
  royalty_amount: number;
  marketing_fee_amount: number;
  fixed_fee_amount: number;
  total_due: number;
  status: "draft" | "issued" | "paid" | "overdue" | "waived";
  paid_at: string | null;
  payment_reference: string | null;
  created_at: string;
  branch?: { id: string; name: string };
}

export const FranchiseRoyalty: React.FC = () => {
  const { allBranches, org, formatCurrency, demoMode } = useFranchise();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"invoices" | "settings">("invoices");
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<RoyaltyInvoice | null>(null);
  const [payReference, setPayReference] = useState("");

  // Rate configuration modal
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState("");
  const [configRoyaltyPct, setConfigRoyaltyPct] = useState(5.0);
  const [configMarketingPct, setConfigMarketingPct] = useState(2.0);
  const [configFixedFee, setConfigFixedFee] = useState(0);

  // Fetch Settings
  const { data: settings = [] } = useQuery({
    queryKey: ["franchise_royalty_settings", org?.id],
    enabled: !!org?.id && !demoMode,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("franchise_royalty_settings" as any)
        .select("*");
      if (error) throw error;
      return (data || []) as unknown as RoyaltySetting[];
    },
  });

  // Fetch Invoices
  const { data: invoices = [], isLoading: isLoadingInvoices, refetch: refetchInvoices } = useQuery({
    queryKey: ["franchise_royalty_invoices", org?.id],
    enabled: !!org?.id && !demoMode,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("franchise_royalty_invoices" as any)
        .select(`
          *,
          branch:restaurants!branch_id(id, name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as RoyaltyInvoice[];
    },
  });

  // Save Settings Mutation
  const saveSettingMutation = useMutation({
    mutationFn: async () => {
      if (!editingBranchId) return;

      const { error } = await supabase
        .from("franchise_royalty_settings" as any)
        .upsert(
          {
            organization_id: org?.id,
            branch_id: editingBranchId,
            royalty_percentage: configRoyaltyPct,
            marketing_fee_percentage: configMarketingPct,
            fixed_monthly_fee: configFixedFee,
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "organization_id, branch_id" }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Settings Saved", description: "Branch royalty agreement updated." });
      setIsConfigOpen(false);
      queryClient.invalidateQueries({ queryKey: ["franchise_royalty_settings"] });
    },
  });

  // Auto-Generate Monthly Invoices
  const generateInvoicesMutation = useMutation({
    mutationFn: async () => {
      const now = new Date();
      // Previous complete month or current month to date
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

      let generated = 0;

      for (const branch of allBranches) {
        // Find agreement rates (default 5% + 2% if not customized)
        const branchSetting = settings.find((s) => s.branch_id === branch.id);
        const royPct = branchSetting?.royalty_percentage ?? 5.0;
        const mktPct = branchSetting?.marketing_fee_percentage ?? 2.0;
        const fixFee = branchSetting?.fixed_monthly_fee ?? 0;

        // Query branch orders for the period
        const { data: branchOrders } = await supabase
          .from("orders")
          .select("total_amount, status")
          .eq("restaurant_id", branch.id)
          .eq("status", "completed")
          .gte("created_at", `${startOfMonth}T00:00:00.000Z`)
          .lte("created_at", `${endOfMonth}T23:59:59.999Z`);

        const grossSales = (branchOrders || []).reduce((acc: number, curr: any) => acc + (Number(curr.total_amount) || 0), 0);
        const royaltyAmount = Math.round((grossSales * royPct) / 100);
        const marketingAmount = Math.round((grossSales * mktPct) / 100);
        const totalDue = royaltyAmount + marketingAmount + fixFee;

        const invNumber = `ROY-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, "0")}-${branch.name.slice(0, 3).toUpperCase()}`;

        // Insert invoice
        const { error } = await supabase
          .from("franchise_royalty_invoices" as any)
          .insert({
            organization_id: org?.id,
            branch_id: branch.id,
            invoice_number: invNumber,
            period_start: startOfMonth,
            period_end: endOfMonth,
            gross_sales: grossSales,
            net_sales: grossSales,
            royalty_amount: royaltyAmount,
            marketing_fee_amount: marketingAmount,
            fixed_fee_amount: fixFee,
            total_due: totalDue,
            status: "issued",
          });

        if (!error) generated++;
      }

      return generated;
    },
    onSuccess: (count) => {
      toast({
        title: "Invoices Generated",
        description: `Successfully computed and generated ${count} royalty invoice(s).`,
      });
      refetchInvoices();
    },
    onError: (err: any) => {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    },
  });

  // Mark Paid Mutation
  const markPaidMutation = useMutation({
    mutationFn: async () => {
      if (!selectedInvoice) return;

      const { error } = await supabase
        .from("franchise_royalty_invoices" as any)
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          payment_reference: payReference || "Bank Transfer",
        })
        .eq("id", selectedInvoice.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Marked Paid", description: "Royalty invoice payment recorded." });
      setIsPayModalOpen(false);
      setSelectedInvoice(null);
      refetchInvoices();
    },
  });

  // Stats calculation
  const totalInvoiced = invoices.reduce((acc, i) => acc + (Number(i.total_due) || 0), 0);
  const totalPaid = invoices.filter((i) => i.status === "paid").reduce((acc, i) => acc + (Number(i.total_due) || 0), 0);
  const totalPending = invoices.filter((i) => i.status === "issued" || i.status === "draft").reduce((acc, i) => acc + (Number(i.total_due) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Receipt className="h-6 w-6 text-emerald-600" />
            Franchise Royalty &amp; Fee Ledger
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Automated royalty calculation, marketing fund billing, and franchisee payment reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setActiveTab(activeTab === "invoices" ? "settings" : "invoices")}
            className="flex items-center gap-2 text-xs"
          >
            <Settings2 className="h-4 w-4" />
            {activeTab === "invoices" ? "Rate Agreements" : "View Invoices"}
          </Button>

          {activeTab === "invoices" && (
            <Button
              onClick={() => generateInvoicesMutation.mutate()}
              disabled={generateInvoicesMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 text-xs rounded-xl"
            >
              {generateInvoicesMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Calculate &amp; Bill Period
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <p className="text-xs font-medium text-gray-500">Total Billed Royalties</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {formatCurrency(totalInvoiced)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <p className="text-xs font-medium text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Collected / Settled
          </p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(totalPaid)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <p className="text-xs font-medium text-amber-600 flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> Outstanding Receivables
          </p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {formatCurrency(totalPending)}
          </p>
        </div>
      </div>

      {activeTab === "invoices" ? (
        /* Invoices Table */
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white text-base">Royalty Invoices</h2>
          </div>

          {isLoadingInvoices ? (
            <div className="p-12 flex justify-center items-center">
              <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <FileText className="h-10 w-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
              <p className="font-medium">No royalty invoices generated yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Click &quot;Calculate &amp; Bill Period&quot; to compute royalties from branch order sales.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-xs font-medium text-gray-500 dark:text-gray-400">
                    <th className="text-left px-5 py-3">Invoice #</th>
                    <th className="text-left px-4 py-3">Branch Location</th>
                    <th className="text-left px-4 py-3">Billing Period</th>
                    <th className="text-right px-4 py-3">Gross Sales</th>
                    <th className="text-right px-4 py-3">Royalty</th>
                    <th className="text-right px-4 py-3">Mktg Fund</th>
                    <th className="text-right px-4 py-3 font-bold text-gray-900 dark:text-white">Total Due</th>
                    <th className="text-center px-4 py-3">Status</th>
                    <th className="text-right px-5 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-medium text-gray-900 dark:text-white">
                        {inv.invoice_number}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-gray-800 dark:text-white">
                        {inv.branch?.name || "Outlet"}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-500">
                        {inv.period_start} → {inv.period_end}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-gray-600 dark:text-gray-300">
                        {formatCurrency(inv.gross_sales)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-gray-600 dark:text-gray-300">
                        {formatCurrency(inv.royalty_amount)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-gray-600 dark:text-gray-300">
                        {formatCurrency(inv.marketing_fee_amount)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-gray-900 dark:text-white">
                        {formatCurrency(inv.total_due)}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={cn(
                            "px-2.5 py-0.5 rounded-full text-xs font-medium uppercase",
                            inv.status === "paid"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                          )}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {inv.status !== "paid" ? (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setPayReference("");
                              setIsPayModalOpen(true);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg"
                          >
                            Mark Paid
                          </Button>
                        ) : (
                          <span className="text-xs text-gray-400 font-mono">
                            Ref: {inv.payment_reference || "Cash/Bank"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Settings Tab: Agreement per Branch */
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">
            Franchise Royalty &amp; Fee Agreement Rates
          </h2>

          <div className="space-y-4">
            {allBranches.map((branch) => {
              const setting = settings.find((s) => s.branch_id === branch.id);
              const roy = setting?.royalty_percentage ?? 5.0;
              const mkt = setting?.marketing_fee_percentage ?? 2.0;
              const fix = setting?.fixed_monthly_fee ?? 0;

              return (
                <div
                  key={branch.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-violet-600" />
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{branch.name}</p>
                      <p className="text-xs text-gray-400">
                        {branch.city} · {branch.state}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Royalty</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{roy}%</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Marketing Fund</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{mkt}%</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Fixed Monthly</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(fix)}</p>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingBranchId(branch.id);
                        setConfigRoyaltyPct(roy);
                        setConfigMarketingPct(mkt);
                        setConfigFixedFee(fix);
                        setIsConfigOpen(true);
                      }}
                      className="text-xs rounded-xl"
                    >
                      Configure Rates
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Payment Reference Modal */}
      <Dialog open={isPayModalOpen} onOpenChange={setIsPayModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-emerald-600" />
              Record Royalty Payment
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-sm">
            <p className="text-gray-600 dark:text-gray-300">
              Invoice: <strong>{selectedInvoice?.invoice_number}</strong>
            </p>
            <p className="text-gray-600 dark:text-gray-300">
              Total Amount: <strong>{formatCurrency(selectedInvoice?.total_due || 0)}</strong>
            </p>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                Bank / UTR / Cheque Reference
              </label>
              <Input
                placeholder="e.g. UTR-HDFC998231, Cheque #00129"
                value={payReference}
                onChange={(e) => setPayReference(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPayModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => markPaidMutation.mutate()}
              disabled={markPaidMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {markPaidMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Confirm Payment Received
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Configure Rates Modal */}
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-violet-600" />
              Configure Royalty Agreement
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                Royalty Percentage (% of Gross Sales)
              </label>
              <Input
                type="number"
                step="0.1"
                min={0}
                max={100}
                value={configRoyaltyPct}
                onChange={(e) => setConfigRoyaltyPct(Number(e.target.value))}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                Brand Marketing Fund (% of Gross Sales)
              </label>
              <Input
                type="number"
                step="0.1"
                min={0}
                max={100}
                value={configMarketingPct}
                onChange={(e) => setConfigMarketingPct(Number(e.target.value))}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                Fixed Monthly Franchise Fee (₹)
              </label>
              <Input
                type="number"
                min={0}
                value={configFixedFee}
                onChange={(e) => setConfigFixedFee(Number(e.target.value))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfigOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => saveSettingMutation.mutate()}
              disabled={saveSettingMutation.isPending}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              {saveSettingMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Save Agreement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FranchiseRoyalty;
