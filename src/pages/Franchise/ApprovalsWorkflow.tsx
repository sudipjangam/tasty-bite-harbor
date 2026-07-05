import React, { useState, useEffect } from "react";
import { useFranchise } from "@/contexts/FranchiseContext";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Clock, PlusCircle, ShieldAlert, History, MessageSquare, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ApprovalRequest {
  id: string;
  branchId: string;
  branchName: string;
  type: "Discount" | "Price Limit Override";
  details: string;
  bmComment: string;
  timestamp: string;
  status: "Pending" | "Approved" | "Rejected";
  resolvedBy?: string;
  resolvedComment?: string;
  resolvedAt?: string;
}

const INITIAL_REQUESTS: ApprovalRequest[] = [
  {
    id: "req-1",
    branchId: "branch-1",
    branchName: "Mumbai HQ",
    type: "Discount",
    details: "Apply 20% discount on Order BOM-848 (Total: ₹8,400) for a corporate event client.",
    bmComment: "Client is a regular corporate partner. Requesting 20% to close their monthly repeat order booking.",
    timestamp: "2026-07-05 10:15 AM",
    status: "Pending",
  },
  {
    id: "req-2",
    branchId: "branch-2",
    branchName: "Pune Branch",
    type: "Price Limit Override",
    details: "Increase Maximum Price Limit of 'Paneer Tikka Masala' to ₹390 (System Limit: ₹350).",
    bmComment: "Local vendor milk solids and dairy prices went up by 15% this week. Current limit makes it unsustainable.",
    timestamp: "2026-07-05 10:45 AM",
    status: "Pending",
  },
  {
    id: "req-3",
    branchId: "branch-3",
    branchName: "Nashik Branch",
    type: "Discount",
    details: "Apply 15% discount on Order NSK-192 (Total: ₹4,200) due to billing system lag complaints.",
    bmComment: "Customer was upset about a 20-min delay in updating payment verification status. Requesting waiver.",
    timestamp: "2026-07-04 03:20 PM",
    status: "Approved",
    resolvedBy: "Sonal Mehta (Regional Manager)",
    resolvedComment: "Approved. Customer retention is critical for this location.",
    resolvedAt: "2026-07-04 04:00 PM",
  },
];

const ApprovalsWorkflow: React.FC = () => {
  const { allBranches, org, demoMode } = useFranchise();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"pending" | "raise" | "history">("pending");
  const [requests, setRequests] = useState<ApprovalRequest[]>(INITIAL_REQUESTS);
  const [loading, setLoading] = useState(false);
  
  // Dialog/Review Modal State
  const [reviewingReq, setReviewingReq] = useState<ApprovalRequest | null>(null);
  const [actionType, setActionType] = useState<"Approve" | "Reject" | null>(null);
  const [resolverComment, setResolverComment] = useState("");

  // Raise Request Simulation State
  const [simBranch, setSimBranch] = useState("branch-1");
  const [simType, setSimType] = useState<"Discount" | "Price Limit Override">("Discount");
  const [simDetails, setSimDetails] = useState("");
  const [simComment, setSimComment] = useState("");

  useEffect(() => {
    if (demoMode) {
      setRequests(INITIAL_REQUESTS);
      return;
    }

    const fetchRequests = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("approval_requests")
          .select("*")
          .eq("organization_id", org.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const mapped: ApprovalRequest[] = (data || []).map((r: any) => {
          const branch = allBranches.find((b) => b.id === r.restaurant_id);
          return {
            id: r.id,
            branchId: r.restaurant_id,
            branchName: branch ? branch.name : "Branch",
            type: r.type === "discount" ? "Discount" : "Price Limit Override",
            details: r.payload?.details || "",
            bmComment: r.bm_comment || "",
            timestamp: new Date(r.created_at).toLocaleString(),
            status: r.status === "pending" ? "Pending" : r.status === "approved" ? "Approved" : "Rejected",
            resolvedBy: r.resolved_at ? "Owner" : undefined,
            resolvedComment: r.resolver_comment || undefined,
            resolvedAt: r.resolved_at ? new Date(r.resolved_at).toLocaleString() : undefined,
          };
        });

        setRequests(mapped);
      } catch (err: any) {
        console.error("Error loading approvals:", err);
        toast({
          title: "Error Loading Approvals",
          description: err.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [demoMode, org.id, allBranches]);

  const handleOpenReview = (req: ApprovalRequest, type: "Approve" | "Reject") => {
    setReviewingReq(req);
    setActionType(type);
    setResolverComment("");
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingReq || !actionType) return;

    if (demoMode) {
      setRequests((prev) =>
        prev.map((r) => {
          if (r.id === reviewingReq.id) {
            return {
              ...r,
              status: actionType === "Approve" ? "Approved" : "Rejected",
              resolvedBy: "Rajesh Kumar (Owner)",
              resolvedComment: resolverComment || `${actionType}d without comment.`,
              resolvedAt: new Date().toLocaleString(),
            };
          }
          return r;
        })
      );

      toast({
        title: `Request ${actionType}d`,
        description: `Request for ${reviewingReq.branchName} has been successfully ${actionType.toLowerCase()}d (Demo Mode).`,
      });

      setReviewingReq(null);
      setActionType(null);
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      const approverId = userData?.user?.id;

      const { error } = await supabase
        .from("approval_requests")
        .update({
          status: actionType === "Approve" ? "approved" : "rejected",
          approver_id: approverId,
          resolver_comment: resolverComment,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", reviewingReq.id);

      if (error) throw error;

      toast({
        title: `Request ${actionType}d`,
        description: `Request for ${reviewingReq.branchName} has been successfully ${actionType.toLowerCase()}d.`,
      });

      setRequests((prev) =>
        prev.map((r) => {
          if (r.id === reviewingReq.id) {
            return {
              ...r,
              status: actionType === "Approve" ? "Approved" : "Rejected",
              resolvedBy: "Owner",
              resolvedComment: resolverComment,
              resolvedAt: new Date().toLocaleString(),
            };
          }
          return r;
        })
      );
    } catch (err: any) {
      toast({
        title: "Action Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setReviewingReq(null);
      setActionType(null);
    }
  };

  const handleSimulateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const branch = allBranches.find((b) => b.id === simBranch);

    if (demoMode) {
      const newReq: ApprovalRequest = {
        id: `req-${Date.now()}`,
        branchId: simBranch,
        branchName: branch ? branch.name : "Unknown Branch",
        type: simType,
        details: simDetails || `Request for ${simType}`,
        bmComment: simComment || "Raised via Branch POS Manager App.",
        timestamp: new Date().toLocaleString(),
        status: "Pending",
      };

      setRequests((prev) => [newReq, ...prev]);
      toast({
        title: "Request Simulated!",
        description: "A new pending request has been raised from the Branch Manager dashboard (Demo Mode).",
      });

      setSimDetails("");
      setSimComment("");
      setActiveTab("pending");
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      const { error } = await supabase
        .from("approval_requests")
        .insert({
          organization_id: org.id,
          restaurant_id: simBranch,
          requester_id: userId,
          type: simType === "Discount" ? "discount" : "price_override",
          payload: { details: simDetails || `Request for ${simType}` },
          bm_comment: simComment,
          status: "pending",
        });

      if (error) throw error;

      toast({
        title: "Request Created",
        description: "Approval request saved to the database successfully.",
      });

      const newReq: ApprovalRequest = {
        id: `req-${Date.now()}`,
        branchId: simBranch,
        branchName: branch ? branch.name : "Unknown Branch",
        type: simType,
        details: simDetails || `Request for ${simType}`,
        bmComment: simComment || "Raised via Branch POS Manager App.",
        timestamp: new Date().toLocaleString(),
        status: "Pending",
      };

      setRequests((prev) => [newReq, ...prev]);
      setSimDetails("");
      setSimComment("");
      setActiveTab("pending");
    } catch (err: any) {
      toast({
        title: "Simulation Failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const pendingRequests = requests.filter((r) => r.status === "Pending");
  const historyRequests = requests.filter((r) => r.status !== "Pending");

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Approvals &amp; Discount Requests</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Review special discount approvals and pricing overrides requested by Branch Managers
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab("pending")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5",
            activeTab === "pending"
              ? "border-violet-600 text-violet-600 dark:text-violet-400 dark:border-violet-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
          )}
        >
          <Clock className="h-4 w-4" /> Pending Requests
          {pendingRequests.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white animate-pulse">
              {pendingRequests.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("raise")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5",
            activeTab === "raise"
              ? "border-violet-600 text-violet-600 dark:text-violet-400 dark:border-violet-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
          )}
        >
          <PlusCircle className="h-4 w-4" /> [Simulate] Raise Request
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5",
            activeTab === "history"
              ? "border-violet-600 text-violet-600 dark:text-violet-400 dark:border-violet-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
          )}
        >
          <History className="h-4 w-4" /> Audit History
        </button>
      </div>

      {/* Tab 1: Pending */}
      {activeTab === "pending" && (
        <div className="space-y-4">
          {pendingRequests.map((req) => (
            <div
              key={req.id}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col md:flex-row"
            >
              {/* Left Side: Type and Branch Info */}
              <div className="p-5 border-b md:border-b-0 md:border-r border-gray-100 dark:border-gray-700 md:w-64 shrink-0 flex flex-col justify-between">
                <div>
                  <span className={cn(
                    "px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase",
                    req.type === "Discount"
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                  )}>
                    {req.type}
                  </span>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base mt-3">{req.branchName}</h3>
                  <p className="text-[10px] text-gray-400 mt-1">Requested: {req.timestamp}</p>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-900/20 p-2 rounded-xl border border-amber-100 dark:border-amber-900/30">
                  <ShieldAlert className="h-4 w-4" /> Pending Action
                </div>
              </div>

              {/* Right Side: Details & Action */}
              <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                <div className="space-y-3">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Request details</h4>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">{req.details}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-750/30 rounded-xl p-3.5 border border-gray-100 dark:border-gray-700 flex items-start gap-3">
                    <MessageSquare className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400">BM Comment</span>
                      <p className="text-xs text-gray-650 dark:text-gray-300 mt-0.5 italic">"{req.bmComment}"</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-2 border-t border-gray-50 dark:border-gray-700/50">
                  <Button
                    onClick={() => handleOpenReview(req, "Reject")}
                    variant="outline"
                    className="text-xs h-9 border-red-200 text-red-650 hover:bg-red-50 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-950/20"
                  >
                    <XCircle className="h-4 w-4 mr-1.5" /> Reject
                  </Button>
                  <Button
                    onClick={() => handleOpenReview(req, "Approve")}
                    className="text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1.5" /> Approve
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {pendingRequests.length === 0 && (
            <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-250 dark:border-gray-700">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
              <h3 className="font-bold text-gray-900 dark:text-white mt-3 text-sm">All Caught Up!</h3>
              <p className="text-xs text-gray-500 mt-1">No pending discount or price override requests.</p>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Raise (Simulation) */}
      {activeTab === "raise" && (
        <form onSubmit={handleSimulateRequest} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 max-w-xl space-y-5">
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Simulate BM Request</h2>
            <p className="text-xs text-gray-500">Raise a request as a Branch Manager to demo the workflow.</p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-550 mb-1">Branch Origin</label>
                <select
                  value={simBranch}
                  onChange={(e) => setSimBranch(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs"
                >
                  {allBranches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-550 mb-1">Request Type</label>
                <select
                  value={simType}
                  onChange={(e) => setSimType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs"
                >
                  <option value="Discount">Special Discount</option>
                  <option value="Price Limit Override">Price Limit Override</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-550 mb-1">Request Details</label>
              <textarea
                value={simDetails}
                onChange={(e) => setSimDetails(e.target.value)}
                placeholder={
                  simType === "Discount"
                    ? "Apply 25% discount on Order PNQ-921 (Total: ₹12,000) for a birthday banquet."
                    : "Increase Max Price Limit of 'Butter Chicken' to ₹490 (Limit: ₹450)."
                }
                rows={2}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-550 mb-1">Branch Manager Comment</label>
              <textarea
                value={simComment}
                onChange={(e) => setSimComment(e.target.value)}
                placeholder="Why do you need this? Write justification here..."
                rows={2}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs"
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full bg-violet-600 text-white">
            <ArrowUpRight className="h-4 w-4 mr-2" />
            Raise Request &amp; Send to Owner/RM
          </Button>
        </form>
      )}

      {/* Tab 3: History */}
      {activeTab === "history" && (
        <div className="space-y-4">
          {historyRequests.map((req) => (
            <div
              key={req.id}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-gray-50 dark:border-gray-700 pb-3">
                <div>
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[9px] font-bold uppercase mr-2",
                    req.status === "Approved"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400"
                      : "bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400"
                  )}>
                    {req.status}
                  </span>
                  <span className="font-bold text-sm text-gray-900 dark:text-white">{req.branchName}</span>
                </div>
                <span className="text-[10px] text-gray-400">{req.resolvedAt}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Request</span>
                  <p className="font-semibold text-gray-900 dark:text-white">{req.details}</p>
                  <p className="text-gray-500 italic mt-1">BM: "{req.bmComment}"</p>
                </div>
                <div className="space-y-2 bg-gray-50 dark:bg-gray-900/30 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                    Review Details (by {req.resolvedBy})
                  </span>
                  <p className="text-gray-700 dark:text-gray-300 font-medium">"{req.resolvedComment}"</p>
                </div>
              </div>
            </div>
          ))}

          {historyRequests.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              No audit logs in the history yet.
            </div>
          )}
        </div>
      )}

      {/* Review Dialog/Modal overlay */}
      {reviewingReq && actionType && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <form
            onSubmit={handleSubmitReview}
            className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xl max-w-md w-full p-6 space-y-4"
          >
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                {actionType === "Approve" ? "✅ Confirm Approval" : "❌ Confirm Rejection"}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                You are about to {actionType.toLowerCase()} the request for <span className="font-semibold text-gray-800 dark:text-gray-200">{reviewingReq.branchName}</span>.
              </p>
            </div>

            <div className="space-y-3 bg-gray-50 dark:bg-gray-900/40 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-750 text-xs">
              <div>
                <span className="font-bold text-gray-400 uppercase text-[9px]">Target Request</span>
                <p className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5">{reviewingReq.details}</p>
              </div>
              <div className="border-t border-gray-100 dark:border-gray-700 pt-2">
                <span className="font-bold text-violet-650 dark:text-violet-400 uppercase text-[9px]">BM Comment</span>
                <p className="text-gray-500 italic mt-0.5">"{reviewingReq.bmComment}"</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-550 mb-1">
                Your Review Comment / Instruction
              </label>
              <textarea
                value={resolverComment}
                onChange={(e) => setResolverComment(e.target.value)}
                placeholder={
                  actionType === "Approve"
                    ? "e.g., Approved. Closing this high-value contract is beneficial."
                    : "e.g., Rejected. Standard discount limit is 10% maximum."
                }
                rows={3}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs focus:ring-2 focus:ring-violet-500"
                required
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setReviewingReq(null);
                  setActionType(null);
                }}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className={cn(
                  "text-xs text-white",
                  actionType === "Approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-650 hover:bg-red-750"
                )}
              >
                Submit {actionType}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ApprovalsWorkflow;
