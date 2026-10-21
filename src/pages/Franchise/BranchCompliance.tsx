import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useFranchise } from "@/contexts/FranchiseContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ShieldCheck,
  AlertTriangle,
  FileCheck,
  Plus,
  Calendar,
  CheckCircle2,
  XCircle,
  Loader2,
  Building2,
  ClipboardList,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface ComplianceRecord {
  id: string;
  organization_id: string;
  branch_id: string;
  document_type: string;
  document_name: string;
  license_number: string | null;
  issue_date: string | null;
  expiry_date: string;
  status: "active" | "expiring_soon" | "expired";
  notes: string | null;
  created_at: string;
  branch?: { id: string; name: string };
}

interface AuditRecord {
  id: string;
  organization_id: string;
  branch_id: string;
  audit_date: string;
  audit_type: string;
  score_percentage: number;
  total_checks: number;
  passed_checks: number;
  status: string;
  feedback: string | null;
  branch?: { id: string; name: string };
}

const DEFAULT_QSC_CHECKS = [
  "Kitchen surfaces sanitized and clean",
  "Refrigerator & freezer temperatures logged within FSSAI safe limits",
  "Staff wearing chef caps, aprons, and gloves",
  "Raw and cooked ingredients separated in prep area",
  "Fire extinguishers inspected and pressure gauge in green",
  "First aid kit fully stocked and accessible",
  "Oil quality checked and TPM tester under 25%",
  "All food batches labeled with prep date and FIFO expiry sticker",
];

export const BranchCompliance: React.FC = () => {
  const { allBranches, org, demoMode } = useFranchise();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"licenses" | "audits">("licenses");
  const [isAddDocOpen, setIsAddDocOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  // New Document state
  const [docBranch, setDocBranch] = useState("");
  const [docType, setDocType] = useState("fssai_license");
  const [docName, setDocName] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  // Audit state
  const [auditBranch, setAuditBranch] = useState("");
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({
    0: true,
    1: true,
    2: true,
    3: true,
    4: true,
    5: true,
    6: true,
    7: true,
  });
  const [auditFeedback, setAuditFeedback] = useState("");

  // Fetch Compliance Records
  const { data: records = [], isLoading: isLoadingRecords, refetch: refetchRecords } = useQuery({
    queryKey: ["branch_compliance_records", org?.id],
    enabled: !!org?.id && !demoMode,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branch_compliance_records" as any)
        .select(`
          *,
          branch:restaurants!branch_id(id, name)
        `)
        .order("expiry_date", { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as ComplianceRecord[];
    },
  });

  // Fetch Audits
  const { data: audits = [], isLoading: isLoadingAudits, refetch: refetchAudits } = useQuery({
    queryKey: ["branch_audit_checklists", org?.id],
    enabled: !!org?.id && !demoMode,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branch_audit_checklists" as any)
        .select(`
          *,
          branch:restaurants!branch_id(id, name)
        `)
        .order("audit_date", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as AuditRecord[];
    },
  });

  // Add Document Mutation
  const addDocMutation = useMutation({
    mutationFn: async () => {
      if (!docBranch || !docName || !expiryDate) {
        throw new Error("Please fill branch, document name, and expiry date");
      }

      const today = new Date();
      const exp = new Date(expiryDate);
      const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 3600 * 24));
      const status = diffDays <= 0 ? "expired" : diffDays <= 30 ? "expiring_soon" : "active";

      const { error } = await supabase
        .from("branch_compliance_records" as any)
        .insert({
          organization_id: org?.id,
          branch_id: docBranch,
          document_type: docType,
          document_name: docName,
          license_number: licenseNumber || null,
          issue_date: issueDate || null,
          expiry_date: expiryDate,
          status,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Document Added", description: "Compliance license recorded." });
      setIsAddDocOpen(false);
      setDocName("");
      setLicenseNumber("");
      refetchRecords();
    },
    onError: (err: any) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    },
  });

  // Submit Audit Mutation
  const submitAuditMutation = useMutation({
    mutationFn: async () => {
      if (!auditBranch) throw new Error("Select branch being audited");

      const total = DEFAULT_QSC_CHECKS.length;
      const passed = Object.values(checkedItems).filter(Boolean).length;
      const scorePct = Math.round((passed / total) * 100);

      const { error } = await supabase
        .from("branch_audit_checklists" as any)
        .insert({
          organization_id: org?.id,
          branch_id: auditBranch,
          audit_type: "qsc",
          score_percentage: scorePct,
          total_checks: total,
          passed_checks: passed,
          status: "completed",
          feedback: auditFeedback || "Routine inspection passed.",
          checklist_items: DEFAULT_QSC_CHECKS.map((text, idx) => ({
            check: text,
            passed: !!checkedItems[idx],
          })),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Audit Saved", description: "QSC store inspection logged successfully." });
      setIsAuditModalOpen(false);
      refetchAudits();
    },
  });

  // Stats
  const activeCount = records.filter((r) => r.status === "active").length;
  const expiringSoonCount = records.filter((r) => r.status === "expiring_soon").length;
  const expiredCount = records.filter((r) => r.status === "expired").length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-blue-600" />
            Branch Compliance &amp; Store Audits
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            FSSAI licenses, municipal permits, lease expiries, and QSC brand quality audit scorecards.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setActiveTab(activeTab === "licenses" ? "audits" : "licenses")}
            className="text-xs"
          >
            {activeTab === "licenses" ? "View QSC Audits" : "View Licenses"}
          </Button>

          {activeTab === "licenses" ? (
            <Button
              onClick={() => {
                if (allBranches.length > 0) setDocBranch(allBranches[0].id);
                setIsAddDocOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 text-xs rounded-xl"
            >
              <Plus className="h-4 w-4" />
              Add License / Permit
            </Button>
          ) : (
            <Button
              onClick={() => {
                if (allBranches.length > 0) setAuditBranch(allBranches[0].id);
                setIsAuditModalOpen(true);
              }}
              className="bg-violet-600 hover:bg-violet-700 text-white flex items-center gap-2 text-xs rounded-xl"
            >
              <ClipboardList className="h-4 w-4" />
              Conduct QSC Audit
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <p className="text-xs font-medium text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Active &amp; Compliant
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{activeCount} licenses</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <p className="text-xs font-medium text-amber-600 flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" /> Expiring Soon (&lt; 30 Days)
          </p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{expiringSoonCount} licenses</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <p className="text-xs font-medium text-red-600 flex items-center gap-1">
            <XCircle className="h-3.5 w-3.5" /> Expired / Attention Required
          </p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{expiredCount} licenses</p>
        </div>
      </div>

      {activeTab === "licenses" ? (
        /* Licenses Table */
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white text-base">Branch Legal Documents &amp; Licenses</h2>
          </div>

          {isLoadingRecords ? (
            <div className="p-12 flex justify-center items-center">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <FileCheck className="h-10 w-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
              <p className="font-medium">No licenses tracked yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Add FSSAI licenses, Fire NOCs, and lease renewal dates to receive automated expiry warnings.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-xs font-medium text-gray-500 dark:text-gray-400">
                    <th className="text-left px-5 py-3">Branch</th>
                    <th className="text-left px-4 py-3">Document / License</th>
                    <th className="text-left px-4 py-3">Registration #</th>
                    <th className="text-left px-4 py-3">Expiry Date</th>
                    <th className="text-center px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {records.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-gray-900 dark:text-white">
                        {r.branch?.name || "Outlet"}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-gray-800 dark:text-gray-200">{r.document_name}</p>
                        <p className="text-xs text-gray-400 uppercase">{r.document_type.replace(/_/g, " ")}</p>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-gray-600 dark:text-gray-300">
                        {r.license_number || "—"}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-600 dark:text-gray-300">
                        {r.expiry_date}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={cn(
                            "px-2.5 py-0.5 rounded-full text-xs font-medium uppercase",
                            r.status === "active"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                              : r.status === "expiring_soon"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                              : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                          )}
                        >
                          {r.status.replace("_", " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Audits Table */
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white text-base">Store Quality &amp; Hygiene Audits</h2>
          </div>

          {isLoadingAudits ? (
            <div className="p-12 flex justify-center items-center">
              <Loader2 className="h-8 w-8 text-violet-600 animate-spin" />
            </div>
          ) : audits.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <ClipboardList className="h-10 w-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
              <p className="font-medium">No QSC audits conducted yet</p>
              <p className="text-xs text-gray-400 mt-1">Conduct regular brand inspections to ensure uniform customer experience.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-xs font-medium text-gray-500 dark:text-gray-400">
                    <th className="text-left px-5 py-3">Audit Date</th>
                    <th className="text-left px-4 py-3">Branch</th>
                    <th className="text-left px-4 py-3">Audit Type</th>
                    <th className="text-center px-4 py-3">Score</th>
                    <th className="text-left px-4 py-3">Passed Checks</th>
                    <th className="text-left px-4 py-3">Auditor Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {audits.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-gray-900 dark:text-white">
                        {a.audit_date}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-gray-800 dark:text-white">
                        {a.branch?.name || "Outlet"}
                      </td>
                      <td className="px-4 py-3.5 uppercase text-xs font-semibold text-gray-500">
                        {a.audit_type}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={cn(
                            "px-2.5 py-0.5 rounded-full text-xs font-bold font-mono",
                            a.score_percentage >= 80
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                              : a.score_percentage >= 60
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                              : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                          )}
                        >
                          {a.score_percentage}%
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-600 dark:text-gray-300">
                        {a.passed_checks} / {a.total_checks} checks
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-500 max-w-xs truncate">
                        {a.feedback || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Document Modal */}
      <Dialog open={isAddDocOpen} onOpenChange={setIsAddDocOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-blue-600" />
              Add Compliance License / Permit
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                Branch Location
              </label>
              <select
                value={docBranch}
                onChange={(e) => setDocBranch(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl dark:bg-gray-800 text-sm"
              >
                {allBranches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                Document Type
              </label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl dark:bg-gray-800 text-sm"
              >
                <option value="fssai_license">FSSAI Food License</option>
                <option value="fire_noc">Fire Safety NOC</option>
                <option value="trade_license">Municipal Trade License</option>
                <option value="gst_certificate">GST Registration</option>
                <option value="lease_agreement">Property Lease Agreement</option>
                <option value="health_trade">Health Trade Certificate</option>
                <option value="liquor_license">Bar / Liquor License</option>
                <option value="other">Other Statutory License</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                Document Name / Title
              </label>
              <Input
                placeholder="e.g. FSSAI Central License 14-Digit"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                License / Registration Number
              </label>
              <Input
                placeholder="e.g. 11524022000123"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                  Issue Date
                </label>
                <Input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                  Expiry Date
                </label>
                <Input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDocOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => addDocMutation.mutate()}
              disabled={addDocMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {addDocMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Save Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conduct QSC Audit Modal */}
      <Dialog open={isAuditModalOpen} onOpenChange={setIsAuditModalOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-violet-600" />
              Conduct QSC Store Inspection
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                Branch Being Inspected
              </label>
              <select
                value={auditBranch}
                onChange={(e) => setAuditBranch(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl dark:bg-gray-800 text-sm"
              >
                {allBranches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Brand Standards &amp; Safety Checklist:
              </p>
              <div className="space-y-2.5">
                {DEFAULT_QSC_CHECKS.map((text, idx) => (
                  <label
                    key={idx}
                    className="flex items-start gap-3 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-800 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={!!checkedItems[idx]}
                      onChange={(e) =>
                        setCheckedItems({
                          ...checkedItems,
                          [idx]: e.target.checked,
                        })
                      }
                      className="mt-0.5 rounded text-violet-600 focus:ring-violet-500 h-4 w-4"
                    />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                      {text}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                Auditor Observations &amp; Corrective Actions
              </label>
              <Input
                placeholder="e.g. Needs immediate pest spray in dry store, good grooming"
                value={auditFeedback}
                onChange={(e) => setAuditFeedback(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAuditModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => submitAuditMutation.mutate()}
              disabled={submitAuditMutation.isPending}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              {submitAuditMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Complete Audit &amp; Score
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BranchCompliance;
