import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Database, RefreshCw, AlertTriangle, CheckCircle2, XCircle, Settings, Key, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface GithubConfig {
  owner: string;
  repo: string;
  token: string;
}

export const DatabaseSync: React.FC = () => {
  const [config, setConfig] = useState<GithubConfig>({ owner: "", repo: "", token: "" });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  
  // Status of the current/last sync run
  const [syncStatus, setSyncStatus] = useState<string>("idle"); // idle, queued, in_progress, success, failure
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [activeRunId, setActiveRunId] = useState<number | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Load config from Supabase
  const loadConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("platform_config")
        .select("value")
        .eq("key", "github_config")
        .single();

      if (error) {
        if (error.code !== "PGRST116") { // Not found is fine
          console.error("Error loading config:", error);
        }
      } else if (data && data.value) {
        const val = data.value as any;
        setConfig({
          owner: val.owner || "",
          repo: val.repo || "",
          token: val.token || ""
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, []);

  const saveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from("platform_config")
        .upsert({
          key: "github_config",
          value: config,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      toast.success("GitHub configuration saved successfully.");
      setShowConfig(false);
    } catch (err: any) {
      console.error(err);
      toast.error(`Failed to save config: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const getWorkflowRuns = async (token: string, owner: string, repo: string) => {
    const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/db-sync.yml/runs?per_page=1`;
    const res = await fetch(url, {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json"
      }
    });
    if (!res.ok) throw new Error(`GitHub API error: ${res.statusText}`);
    return await res.json();
  };

  const startPolling = (token: string, owner: string, repo: string, runId: number) => {
    if (pollingInterval) clearInterval(pollingInterval);

    const interval = setInterval(async () => {
      try {
        const url = `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}`;
        const res = await fetch(url, {
          headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github.v3+json"
          }
        });
        if (!res.ok) return;
        const run = await res.json();
        
        if (run.status === "completed") {
          clearInterval(interval);
          setPollingInterval(null);
          if (run.conclusion === "success") {
            setSyncStatus("success");
            setLastSyncTime(new Date().toLocaleString());
            toast.success("Database replication completed successfully!");
          } else {
            setSyncStatus("failure");
            toast.error("Database replication workflow failed on GitHub.");
          }
        } else {
          setSyncStatus(run.status); // queued, in_progress, etc.
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 5000);

    setPollingInterval(interval);
  };

  const triggerSync = async () => {
    if (!config.owner || !config.repo || !config.token) {
      toast.error("Please configure GitHub settings first.");
      setShowConfig(true);
      return;
    }

    setSyncStatus("triggering");
    setShowConfirm(false);
    setConfirmText("");

    try {
      // Trigger GitHub action workflow
      const triggerUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/actions/workflows/db-sync.yml/dispatches`;
      const triggerRes = await fetch(triggerUrl, {
        method: "POST",
        headers: {
          Authorization: `token ${config.token}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ ref: "main" })
      });

      if (!triggerRes.ok) {
        throw new Error(`Failed to trigger workflow: ${triggerRes.statusText}`);
      }

      toast.info("Database replication triggered on GitHub...");
      setSyncStatus("queued");

      // Wait a moment for run to be generated and fetch it
      setTimeout(async () => {
        try {
          const runsData = await getWorkflowRuns(config.token, config.owner, config.repo);
          const runs = runsData.workflow_runs;
          if (runs && runs.length > 0) {
            const latestRun = runs[0];
            setActiveRunId(latestRun.id);
            setSyncStatus(latestRun.status);
            startPolling(config.token, config.owner, config.repo, latestRun.id);
          }
        } catch (err) {
          console.error("Error fetching run ID:", err);
        }
      }, 5000);

    } catch (err: any) {
      console.error(err);
      toast.error(`Replication failed: ${err.message}`);
      setSyncStatus("idle");
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-red-200 dark:border-red-900 overflow-hidden">
        <div className="bg-gradient-to-r from-red-500/10 via-red-500/5 to-transparent h-1" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Database className="h-5 w-5 text-red-500" />
              Database Replication (Prod → Dev)
            </CardTitle>
            <CardDescription>
              Copy all tables, schemas, triggers, functions, cron jobs, and data to your Dev environment.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-1.5"
          >
            <Settings className="h-4 w-4" />
            Config
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {showConfig && (
            <form onSubmit={saveConfig} className="bg-muted/40 p-4 rounded-lg border space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Settings className="h-4 w-4 text-primary animate-spin-slow" />
                GitHub Runner Configuration
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium">Repo Owner / Org</label>
                  <Input
                    required
                    placeholder="e.g. sudipjangam"
                    value={config.owner}
                    onChange={(e) => setConfig({ ...config, owner: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium">Repository Name</label>
                  <Input
                    required
                    placeholder="e.g. tasty-bite-harbor"
                    value={config.repo}
                    onChange={(e) => setConfig({ ...config, repo: e.target.value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-medium flex items-center gap-1">
                    <Key className="h-3 w-3" />
                    Personal Access Token (PAT)
                  </label>
                  <Input
                    required
                    type="password"
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    value={config.token}
                    onChange={(e) => setConfig({ ...config, token: e.target.value })}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Requires a token with <code>repo</code> or <code>workflow</code> scopes.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowConfig(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save config"}
                </Button>
              </div>
            </form>
          )}

          <Alert variant="destructive" className="bg-red-500/5 border-red-500/20 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="font-semibold">Destructive Action Warning</AlertTitle>
            <AlertDescription className="text-xs leading-relaxed">
              This action will completely **wipe out all existing data and schemas** in the Dev Database (<code>tnzfcugvgeelkxnzhnnn</code>) and replace them with a fresh clone of the Production Database (<code>clmsoetktmvhazctlans</code>). Any unsaved dev testing data will be permanently deleted.
            </AlertDescription>
          </Alert>

          <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-lg border bg-card gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <div className="text-sm font-semibold flex items-center justify-center sm:justify-start gap-1.5">
                Status:
                {syncStatus === "idle" && <span className="text-muted-foreground">Idle</span>}
                {syncStatus === "triggering" && <span className="text-blue-500 flex items-center gap-1">Triggering...</span>}
                {syncStatus === "queued" && <span className="text-amber-500 flex items-center gap-1">Queued on GitHub...</span>}
                {syncStatus === "in_progress" && (
                  <span className="text-blue-500 flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Syncing...
                  </span>
                )}
                {syncStatus === "success" && (
                  <span className="text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Success
                  </span>
                )}
                {syncStatus === "failure" && (
                  <span className="text-red-500 flex items-center gap-1">
                    <XCircle className="h-3.5 w-3.5" />
                    Failed
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                Last Successful Sync: {lastSyncTime || "Never"}
              </div>
            </div>

            <Button
              variant="destructive"
              onClick={() => setShowConfirm(true)}
              disabled={syncStatus === "triggering" || syncStatus === "in_progress" || syncStatus === "queued" || loading}
              className="w-full sm:w-auto"
            >
              {(syncStatus === "in_progress" || syncStatus === "queued") ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Syncing Database...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Replicate Prod to Dev
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Are you absolutely sure?
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-2 text-sm">
              <p>
                This will overwrite the target development database schema and data completely.
              </p>
              <p className="font-semibold">
                To confirm, type <span className="text-red-600">SYNC</span> in the box below:
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type SYNC to confirm"
              className="text-center font-bold"
            />
          </div>
          <DialogFooter className="sm:justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={confirmText !== "SYNC"}
              onClick={triggerSync}
            >
              Confirm and Replicate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
