import React, { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { useNightAudit } from "@/hooks/useNightAudit";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import {
  Moon,
  Sun,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  Bed,
  Users,
  Calendar,
  Clock,
  PlayCircle,
  RefreshCw,
  FileText,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NightAuditDashboard: React.FC = () => {
  const {
    todayAudit,
    auditHistory,
    auditSummary,
    auditLoading,
    refetchSummary,
    startAudit,
    isStarting,
    completeAudit,
    isCompleting,
    postRoomCharges,
    isPostingCharges,
  } = useNightAudit();
  const { symbol: currencySymbol } = useCurrencyContext();

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<
    "start" | "complete" | null
  >(null);

  const handleConfirm = () => {
    if (confirmAction === "start") {
      startAudit();
    } else if (confirmAction === "complete" && auditSummary) {
      completeAudit(auditSummary);
    }
    setShowConfirmDialog(false);
    setConfirmAction(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-emerald-100 text-emerald-700">Completed</Badge>
        );
      case "in_progress":
        return <Badge className="bg-blue-100 text-blue-700">In Progress</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-700">Pending</Badge>;
    }
  };

  if (auditLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const isAuditInProgress = todayAudit?.status === "in_progress";
  const isAuditCompleted = todayAudit?.status === "completed";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl shadow-lg">
            <Moon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Night Audit
            </h1>
            <p className="text-gray-500 text-sm">
              {format(new Date(), "EEEE, MMMM d, yyyy")}
            </p>
          </div>
        </div>
        <Button onClick={() => refetchSummary()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Status Banner */}
      <Card
        className={cn(
          "border-2",
          isAuditCompleted
            ? "border-emerald-200 bg-emerald-50"
            : isAuditInProgress
            ? "border-blue-200 bg-blue-50"
            : "border-amber-200 bg-amber-50"
        )}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {isAuditCompleted ? (
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              ) : isAuditInProgress ? (
                <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
              ) : (
                <Clock className="h-10 w-10 text-amber-600" />
              )}
              <div>
                <h2 className="text-xl font-semibold">
                  {isAuditCompleted
                    ? "Today's Audit Complete"
                    : isAuditInProgress
                    ? "Audit In Progress"
                    : "Audit Pending"}
                </h2>
                <p className="text-sm text-gray-600">
                  {isAuditCompleted
                    ? `Completed at ${
                        todayAudit?.completed_at
                          ? format(new Date(todayAudit.completed_at), "h:mm a")
                          : "-"
                      }`
                    : isAuditInProgress
                    ? "Processing daily operations..."
                    : "Click 'Start Audit' to begin the night audit process"}
                </p>
              </div>
            </div>

            {!isAuditCompleted && (
              <Button
                onClick={() => {
                  setConfirmAction(isAuditInProgress ? "complete" : "start");
                  setShowConfirmDialog(true);
                }}
                disabled={isStarting || isCompleting}
                className={cn(
                  "shadow-lg",
                  isAuditInProgress
                    ? "bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600"
                    : "bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
                )}
              >
                {isStarting || isCompleting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : isAuditInProgress ? (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                ) : (
                  <PlayCircle className="h-4 w-4 mr-2" />
                )}
                {isAuditInProgress ? "Complete Audit" : "Start Audit"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Bed className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-blue-600">Occupancy</p>
                <p className="text-2xl font-bold text-blue-700">
                  {auditSummary?.occupiedRooms || 0}/
                  {auditSummary?.totalRooms || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500 rounded-lg">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-emerald-600">Today's Revenue</p>
                <p className="text-2xl font-bold text-emerald-700">
                  {currencySymbol}
                  {(auditSummary?.todayRevenue || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500 rounded-lg">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-amber-600">Expected Arrivals</p>
                <p className="text-2xl font-bold text-amber-700">
                  {auditSummary?.expectedArrivals || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500 rounded-lg">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-purple-600">Expected Departures</p>
                <p className="text-2xl font-bold text-purple-700">
                  {auditSummary?.expectedCheckouts || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions & Revenue Split */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-500" />
              Audit Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => postRoomCharges()}
              disabled={isPostingCharges || isAuditCompleted}
              variant="outline"
              className="w-full justify-start"
            >
              {isPostingCharges ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <DollarSign className="h-4 w-4 mr-2" />
              )}
              Post Room Charges to Folios
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              disabled={isAuditCompleted}
            >
              <FileText className="h-4 w-4 mr-2" />
              Generate Daily Revenue Report
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              disabled={isAuditCompleted}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Check for Discrepancies
            </Button>
          </CardContent>
        </Card>

        {/* Revenue Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-500" />
              Revenue Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="text-blue-700 font-medium">Room Revenue</span>
              <span className="text-blue-800 font-bold">
                {currencySymbol}
                {(auditSummary?.roomRevenue || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
              <span className="text-orange-700 font-medium">
                Food & Beverage
              </span>
              <span className="text-orange-800 font-bold">
                {currencySymbol}
                {(auditSummary?.foodRevenue || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-emerald-100 rounded-lg border-2 border-emerald-200">
              <span className="text-emerald-700 font-semibold">
                Total Revenue
              </span>
              <span className="text-emerald-800 font-bold text-lg">
                {currencySymbol}
                {(auditSummary?.todayRevenue || 0).toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Audit History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-500" />
            Audit History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {auditHistory.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No audit records yet
                </p>
              ) : (
                auditHistory.map((audit) => (
                  <div
                    key={audit.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      <Sun className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium">
                          {format(
                            new Date(audit.audit_date),
                            "EEEE, MMM d, yyyy"
                          )}
                        </p>
                        <p className="text-sm text-gray-500">
                          {audit.rooms_charged} rooms charged | {currencySymbol}
                          {audit.total_revenue?.toLocaleString() || 0} revenue
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(audit.status)}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "complete"
                ? "Complete Night Audit?"
                : "Start Night Audit?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "complete"
                ? "This will close the business day. Room charges will be posted and the day will be finalized. This action cannot be undone."
                : "This will begin the night audit process. You can post room charges and review the day's operations."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              {confirmAction === "complete" ? "Complete Audit" : "Start Audit"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default NightAuditDashboard;
