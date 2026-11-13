import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Send,
  Bell,
  Smartphone,
  Building2,
  Clock,
  Sparkles,
  AlertTriangle,
  AlertCircle,
  Gift,
  Rocket,
  Wrench,
  Search,
  CheckCircle2,
  RefreshCw,
  RotateCcw,
  User,
  Wand2,
  Bot,
  Languages,
  ChevronDown,
  ChevronUp,
  Lightbulb,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface RestaurantWithSub {
  id: string;
  name: string;
  is_active: boolean | null;
  subscription?: {
    status: string | null;
    current_period_end: string;
    days_left: number;
  } | null;
}

interface RegisteredDevice {
  id: string;
  user_id: string;
  token: string;
  device_type: string | null;
  created_at: string | null;
  user_name: string;
  user_email: string;
  role?: string;
  restaurant_id?: string;
  restaurant_name?: string;
}

interface RegisteredUserGroup {
  userId: string;
  userName: string;
  userEmail: string;
  role?: string;
  restaurantId?: string;
  restaurantName?: string;
  deviceCount: number;
  devices: RegisteredDevice[];
  lastActive: string | null;
}

const PRESET_MESSAGES = [
  {
    id: "expiry",
    icon: AlertTriangle,
    name: "Plan Expiring",
    badge: "Urgent",
    title: "Subscription Expiring Soon! ⚠️",
    body: "Hi {restaurant_name}, your SwadeshiPOS plan ends in {days_left} days. Renew now to prevent service disruption.",
    actionUrl: "/subscription",
    actionLabel: "Renew Plan →",
    targetMode: "expiring_7" as const,
  },
  {
    id: "expired",
    icon: AlertCircle,
    name: "Plan Expired",
    badge: "Expired",
    title: "Subscription Expired ⚠️",
    body: "Hi {restaurant_name}, your SwadeshiPOS subscription has expired. Renew today to restore full POS access.",
    actionUrl: "/subscription",
    actionLabel: "Reactivate Plan →",
    targetMode: "expired" as const,
  },
  {
    id: "offer",
    icon: Gift,
    name: "Festive Offer",
    badge: "Promo",
    title: "Why leave your cashback? 🥳",
    body: "Your guaranteed cashback of up to ₹500* is waiting for you! Renew subscription today to claim it.",
    actionUrl: "/subscription",
    actionLabel: "Claim Cashback →",
    targetMode: "all" as const,
  },
  {
    id: "launch",
    icon: Rocket,
    name: "Feature Launch",
    badge: "Update",
    title: "New Feature Live: AI Reports 📊",
    body: "Automated sales forecast and smart analytics are now live for {restaurant_name}. Check them out!",
    actionUrl: "/orders",
    actionLabel: "Explore Now →",
    targetMode: "all" as const,
  },
  {
    id: "maintenance",
    icon: Wrench,
    name: "Maintenance",
    badge: "System",
    title: "Scheduled Maintenance Tonight ⚙️",
    body: "Brief system maintenance at 2:00 AM tonight. POS offline modes remain functional.",
    actionUrl: "/settings",
    actionLabel: "View Details →",
    targetMode: "all" as const,
  },
];

const EMOJI_LIST = ["⚠️", "⏰", "🥳", "🎁", "🚀", "💰", "🔥", "📢", "⭐", "🍕", "🍔", "✨"];

const AI_PROMPT_PRESETS = [
  { label: "💰 ₹500 Cashback", prompt: "Urgent renewal offer reminding partners of ₹500 guaranteed cashback before plan ends" },
  { label: "⚠️ 3-Day Expiry", prompt: "Urgent warning that POS subscription expires in 3 days, avoid kitchen order stoppage" },
  { label: "⏰ Expired Outlets", prompt: "Subscription expired comeback message offering instant reactivation and special discount" },
  { label: "🚀 Offline Billing Live", prompt: "Exciting announcement that high-speed offline billing and AI reports are now live" },
  { label: "🔥 Festive Deal", prompt: "Limited time festive discount of 20% on annual renewal for restaurant partners" },
  { label: "📊 Sales Peak Alert", prompt: "Weekly performance check-in reminding owners to review their sales and peak hour trends" },
];

const AI_TONES = [
  { value: "urgent", label: "Urgent ⏰" },
  { value: "promotional", label: "Promotional 🥳" },
  { value: "friendly", label: "Friendly 👋" },
  { value: "professional", label: "Professional 💼" },
];

const AI_LANGUAGES = [
  { value: "Hinglish", label: "Hinglish (Hindi in English) 🇮🇳" },
  { value: "English", label: "English 🇬🇧" },
  { value: "Hindi", label: "Hindi (हिंदी) 🇮🇳" },
  { value: "Marathi", label: "Marathi (मराठी) 🇮🇳" },
];

export default function PushBroadcast() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Form State
  const [title, setTitle] = useState("Why leave your cashback? 🥳");
  const [body, setBody] = useState(
    "Your guaranteed cashback of up to ₹500* is waiting for you! Renew subscription today to claim it."
  );
  const [actionUrl, setActionUrl] = useState("/subscription");
  const [customActionUrl, setCustomActionUrl] = useState("");
  const [targetMode, setTargetMode] = useState<"all" | "expiring_7" | "expiring_3" | "expired" | "custom">("all");
  const [selectedRestaurantIds, setSelectedRestaurantIds] = useState<string[]>([]);
  const [searchFilter, setSearchFilter] = useState("");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [userSearchQuery, setUserSearchQuery] = useState("");

  // AI Writer State
  const [isAIOpen, setIsAIOpen] = useState(true);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiTone, setAiTone] = useState("urgent");
  const [aiLanguage, setAiLanguage] = useState("Hinglish");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  // Resume state for tracking partially submitted restaurants across retries
  const [submittedRestaurantIds, setSubmittedRestaurantIds] = useState<string[]>([]);

  // 1. Fetch Restaurants & Active Subscriptions with explicit error handling
  const {
    data: restaurants = [],
    isLoading: isLoadingRestaurants,
    error: restaurantsError,
    refetch: refetchRestaurants,
  } = useQuery<RestaurantWithSub[]>({
    queryKey: ["platform-broadcast-restaurants"],
    queryFn: async () => {
      const [restRes, subsRes] = await Promise.all([
        supabase
          .from("restaurants")
          .select("id, name, is_active")
          .order("name", { ascending: true }),
        supabase
          .from("restaurant_subscriptions")
          .select("restaurant_id, status, current_period_end"),
      ]);

      if (restRes.error) throw restRes.error;
      if (subsRes.error) throw subsRes.error;

      const subsMap = new Map<string, { status: string | null; current_period_end: string; days_left: number }>();
      (subsRes.data || []).forEach((s) => {
        const end = new Date(s.current_period_end).getTime();
        const now = Date.now();
        const days = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
        subsMap.set(s.restaurant_id, {
          status: s.status,
          current_period_end: s.current_period_end,
          days_left: days,
        });
      });

      return (restRes.data || []).map((r) => ({
        ...r,
        subscription: subsMap.get(r.id) || null,
      }));
    },
  });

  // 2. Fetch Device Token Counts
  const { data: totalDevices = 0 } = useQuery({
    queryKey: ["platform-total-push-tokens"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("user_push_tokens")
        .select("id", { count: "exact", head: true });
      if (error) return 0;
      return count || 0;
    },
  });

  // 3. Fetch All Registered Android Devices with user and outlet details
  const {
    data: registeredDevices = [],
    isLoading: isLoadingDevices,
    refetch: refetchDevices,
  } = useQuery<RegisteredDevice[]>({
    queryKey: ["platform-all-registered-devices"],
    queryFn: async () => {
      const { data: tokens, error: tokensErr } = await supabase
        .from("user_push_tokens")
        .select("id, user_id, token, device_type, created_at")
        .order("created_at", { ascending: false });

      if (tokensErr) throw tokensErr;
      if (!tokens || tokens.length === 0) return [];

      const userIds = [...new Set(tokens.map((t) => t.user_id))];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, role, restaurant_id")
        .in("id", userIds);

      const profileMap = new Map<string, { name: string; email: string; role?: string; restaurant_id?: string }>();
      (profiles || []).forEach((p) => {
        const fullName = `${p.first_name || ""} ${p.last_name || ""}`.trim();
        profileMap.set(p.id, {
          name: fullName || p.email || "Registered User",
          email: p.email || "",
          role: p.role,
          restaurant_id: p.restaurant_id || undefined,
        });
      });

      const restMap = new Map<string, string>();
      restaurants.forEach((r) => restMap.set(r.id, r.name));

      return tokens.map((t) => {
        const prof = profileMap.get(t.user_id);
        const restName = prof?.restaurant_id ? restMap.get(prof.restaurant_id) : undefined;
        return {
          ...t,
          user_name: prof?.name || (t.user_id === user?.id ? "My Admin Account" : "User"),
          user_email: prof?.email || "",
          role: prof?.role,
          restaurant_id: prof?.restaurant_id,
          restaurant_name: restName || (t.user_id === user?.id ? "Platform Admin" : "Global / Unassigned"),
        };
      });
    },
    enabled: !!user,
  });

  // Group tokens by unique user for crystal clear identification and targeting
  const registeredUsers = useMemo<RegisteredUserGroup[]>(() => {
    const userMap = new Map<string, RegisteredUserGroup>();
    registeredDevices.forEach((device) => {
      const existing = userMap.get(device.user_id);
      if (!existing) {
        userMap.set(device.user_id, {
          userId: device.user_id,
          userName: device.user_name,
          userEmail: device.user_email,
          role: device.role,
          restaurantId: device.restaurant_id,
          restaurantName: device.restaurant_name,
          deviceCount: 1,
          devices: [device],
          lastActive: device.created_at,
        });
      } else {
        existing.deviceCount += 1;
        existing.devices.push(device);
        if (
          device.created_at &&
          (!existing.lastActive || new Date(device.created_at) > new Date(existing.lastActive))
        ) {
          existing.lastActive = device.created_at;
        }
      }
    });
    return Array.from(userMap.values());
  }, [registeredDevices]);

  // Filter users by search term
  const filteredUsers = useMemo(() => {
    if (!userSearchQuery.trim()) return registeredUsers;
    const q = userSearchQuery.toLowerCase();
    return registeredUsers.filter(
      (u) =>
        u.userName.toLowerCase().includes(q) ||
        u.userEmail.toLowerCase().includes(q) ||
        (u.restaurantName && u.restaurantName.toLowerCase().includes(q)) ||
        u.userId.toLowerCase().includes(q)
    );
  }, [registeredUsers, userSearchQuery]);

  const myDevices = useMemo(() => {
    return registeredDevices.filter((d) => d.user_id === user?.id);
  }, [registeredDevices, user?.id]);

  // 4. Fetch Broadcast History from owner_notifications
  const { data: broadcastHistory = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ["platform-broadcast-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("owner_notifications")
        .select("id, restaurant_id, title, message, type, action_url, created_at, staff_name")
        .eq("staff_name", "Platform Admin")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) return [];
      return data || [];
    },
  });

  // Filter Target Restaurants: ensure upcoming-expiration filters require nonnegative days_left
  const matchedRestaurants = useMemo(() => {
    if (restaurantsError) return [];
    return restaurants.filter((r) => {
      if (targetMode === "all") return true;
      if (targetMode === "expiring_7") {
        return r.subscription != null && r.subscription.days_left >= 0 && r.subscription.days_left <= 7;
      }
      if (targetMode === "expiring_3") {
        return r.subscription != null && r.subscription.days_left >= 0 && r.subscription.days_left <= 3;
      }
      if (targetMode === "expired") {
        return (
          r.subscription != null &&
          new Date(r.subscription.current_period_end).getTime() < Date.now()
        );
      }
      if (targetMode === "custom") {
        return selectedRestaurantIds.includes(r.id);
      }
      return true;
    });
  }, [restaurants, targetMode, selectedRestaurantIds, restaurantsError]);

  const resetProgress = () => {
    setSubmittedRestaurantIds([]);
  };

  const resolvedActionUrl = actionUrl === "custom" ? customActionUrl : actionUrl;

  // Complete submission snapshot to bind submitted progress to exact payload
  const currentPayloadSnapshot = useMemo(() => {
    return JSON.stringify({
      title,
      body,
      actionUrl: resolvedActionUrl,
      targetMode,
      selectedRestaurantIds: [...selectedRestaurantIds].sort(),
    });
  }, [title, body, resolvedActionUrl, targetMode, selectedRestaurantIds]);

  const [lastSubmittedSnapshot, setLastSubmittedSnapshot] = useState<string>("");

  // Insert Emoji at cursor/end
  const addEmoji = (emoji: string) => {
    setBody((prev) => prev + " " + emoji);
    resetProgress();
  };

  const applyPreset = (preset: typeof PRESET_MESSAGES[0]) => {
    setTitle(preset.title);
    setBody(preset.body);
    setActionUrl(preset.actionUrl);
    setTargetMode(preset.targetMode);
    resetProgress();
  };

  const handleAIGenerate = async (customPrompt?: string) => {
    const textToUse = customPrompt || aiPrompt;
    if (!textToUse.trim()) {
      toast.error("Please enter a topic or select a prompt preset.");
      return;
    }

    setIsGeneratingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-push-broadcast", {
        body: {
          prompt: textToUse,
          tone: aiTone,
          language: aiLanguage,
          audienceType: targetMode,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.title) setTitle(data.title);
      if (data?.body) setBody(data.body);
      if (data?.action_url) {
        if (["/subscription", "/orders", "/menu", "/settings"].includes(data.action_url)) {
          setActionUrl(data.action_url);
        } else {
          setActionUrl("custom");
          setCustomActionUrl(data.action_url);
        }
      }

      resetProgress();
      setAiSummary(data?.summary || "Generated successfully with Gemini AI");
      toast.success("AI notification written! Review title, body, and preview.");
    } catch (err: any) {
      console.error("AI Generation error:", err);
      toast.error(`AI generation failed: ${err.message || "Unknown error"}`);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Preview evaluation (first restaurant placeholder replacement)
  const sampleRestaurant = matchedRestaurants[0] || { name: "Tasty Bite Harbor", subscription: { days_left: 3 } };
  const evaluatedTitle = title
    .replace("{restaurant_name}", sampleRestaurant.name)
    .replace("{days_left}", String(sampleRestaurant.subscription?.days_left ?? 3));
  const evaluatedBody = body
    .replace("{restaurant_name}", sampleRestaurant.name)
    .replace("{days_left}", String(sampleRestaurant.subscription?.days_left ?? 3));

  // Unfinished recipients computation for resumable submission
  const pendingRestaurants = useMemo(() => {
    return matchedRestaurants.filter((r) => !submittedRestaurantIds.includes(r.id));
  }, [matchedRestaurants, submittedRestaurantIds]);

  // Mutation to submit broadcasts with resumable chunking
  const sendBroadcastMutation = useMutation({
    mutationFn: async () => {
      if (matchedRestaurants.length === 0) {
        throw new Error("No restaurants match the selected audience.");
      }

      // If payload changed since last partial attempt, reset progress so revised payload goes to every matched outlet
      let activeSubmitted = submittedRestaurantIds;
      if (lastSubmittedSnapshot && lastSubmittedSnapshot !== currentPayloadSnapshot) {
        activeSubmitted = [];
        setSubmittedRestaurantIds([]);
      }
      setLastSubmittedSnapshot(currentPayloadSnapshot);

      const toProcess = matchedRestaurants.filter((r) => !activeSubmitted.includes(r.id));
      if (toProcess.length === 0) {
        return matchedRestaurants.length;
      }

      const rowsToInsert = toProcess.map((r) => {
        const daysLeft = r.subscription?.days_left ?? 0;
        const personalizedTitle = title
          .replace(/{restaurant_name}/g, r.name)
          .replace(/{days_left}/g, String(daysLeft));
        const personalizedBody = body
          .replace(/{restaurant_name}/g, r.name)
          .replace(/{days_left}/g, String(daysLeft));

        return {
          restaurant_id: r.id,
          title: personalizedTitle,
          message: personalizedBody,
          type: "broadcast",
          action_url: resolvedActionUrl,
          staff_name: "Platform Admin",
          is_read: false,
        };
      });

      if (rowsToInsert.length === 0) {
        return matchedRestaurants.length;
      }

      // Insert in chunks of 50 to prevent payload overflow; track progress atomically
      let successfullySentIds: string[] = [...activeSubmitted];
      const chunkSize = 50;
      for (let i = 0; i < rowsToInsert.length; i += chunkSize) {
        const chunk = rowsToInsert.slice(i, i + chunkSize);
        const { error } = await supabase.from("owner_notifications").insert(chunk);
        if (error) {
          const currentDone = successfullySentIds.length;
          const remainingCount = matchedRestaurants.length - currentDone;
          throw new Error(
            `Submission failed on chunk ${Math.floor(i / chunkSize) + 1}. ${currentDone}/${matchedRestaurants.length} outlets completed, ${remainingCount} remaining: ${error.message}`
          );
        }
        // Safely record successfully inserted restaurant IDs
        const chunkIds = chunk.map((c) => c.restaurant_id);
        successfullySentIds = [...successfullySentIds, ...chunkIds];
        setSubmittedRestaurantIds(successfullySentIds);
      }

      return matchedRestaurants.length;
    },
    onSuccess: (totalCount) => {
      toast.success(`Broadcast submitted! Queued for ${totalCount} restaurant(s).`);
      setSubmittedRestaurantIds([]);
      queryClient.invalidateQueries({ queryKey: ["platform-broadcast-history"] });
      setIsConfirmOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to submit broadcast");
      // Keep confirmation open when work remains so user can resume
      setIsConfirmOpen(true);
    },
  });

  // Test notification: routes through established administrator-specific endpoint targeting selected user/device
  const handleSendTest = async (targetUserId?: string, targetDeviceId?: string) => {
    try {
      setIsSending(true);
      if (!user) throw new Error("Administrator not authenticated");

      const uid = targetUserId || selectedUserId;
      const targetUser =
        registeredUsers.find((u) => u.userId === uid) ||
        (selectedDeviceId
          ? registeredUsers.find((u) => u.devices.some((d) => d.id === selectedDeviceId))
          : null) ||
        registeredUsers.find((u) => u.userId === user.id) ||
        registeredUsers[0];

      if (!targetUser) {
        toast.warning(
          `No registered Android users or devices found. Open SwadeshiPOS APK on an Android phone and log in to link a device token.`,
          { duration: 8000 }
        );
        return;
      }

      // Format payload with record wrapper for deployed webhook compatibility + direct keys
      const testPayload = {
        record: {
          id: crypto.randomUUID(),
          title: `[TEST] ${evaluatedTitle}`,
          message: evaluatedBody,
          action_url: resolvedActionUrl,
          user_id: targetUser.userId,
          restaurant_id: targetUser.restaurantId || user.restaurant_id || matchedRestaurants[0]?.id || "",
        },
        user_id: targetUser.userId,
        title: `[TEST] ${evaluatedTitle}`,
        message: evaluatedBody,
        action_url: resolvedActionUrl,
      };

      const { data, error } = await supabase.functions.invoke("send-push-notification", {
        body: testPayload,
      });

      if (error) {
        // Fallback: If edge function direct invoke fails, record notification in owner_notifications for target restaurant if linked
        if (targetUser.restaurantId) {
          await supabase.from("owner_notifications").insert({
            restaurant_id: targetUser.restaurantId,
            title: `[TEST] ${evaluatedTitle}`,
            message: evaluatedBody,
            type: "broadcast",
            action_url: resolvedActionUrl,
            staff_name: "Platform Admin",
            is_read: false,
          });
          toast.success(`Test push queued for ${targetUser.userName} (${targetUser.restaurantName})!`);
          setIsTestModalOpen(false);
          return;
        }
        throw error;
      }

      if (data?.success === false) {
        toast.warning(data.message || "Push service could not reach the user's devices.");
      } else if (data?.sentCount === 0 && data?.failureCount > 0) {
        toast.warning(
          data.message ||
            `0/${data.failureCount} devices reached. Tokens expired in Firebase. Open SwadeshiPOS APK on phone to register fresh token.`,
          { duration: 7000 }
        );
        setIsTestModalOpen(false);
      } else {
        toast.success(
          `Test notification delivered to ${targetUser.userName} (${data?.sentCount ?? targetUser.deviceCount} device(s))!`
        );
        setIsTestModalOpen(false);
      }
    } catch (e: any) {
      console.error("Test send error:", e);
      toast.error(`Test send failed: ${e.message || "Unknown error"}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Top Banner / Metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Push Broadcast Studio</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Send customized announcements, subscription expiry warnings, and marketing offers directly to Android devices
              </p>
            </div>
          </div>
        </div>

        {/* Stats Pills */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-card border border-border/70 shadow-sm flex items-center gap-2.5">
            <Smartphone className="w-4 h-4 text-emerald-500" />
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase">Active Devices</p>
              <p className="text-sm font-bold">{totalDevices}</p>
            </div>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-card border border-border/70 shadow-sm flex items-center gap-2.5">
            <Building2 className="w-4 h-4 text-purple-500" />
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase">Partner Outlets</p>
              <p className="text-sm font-bold">{restaurants.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Query Failure Alert with Retry */}
      {restaurantsError && (
        <Card className="border-destructive/40 bg-destructive/5 text-destructive p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-xs">Error loading restaurants or subscription data</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {(restaurantsError as Error).message || "Database query failed"}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchRestaurants()}
              className="text-xs h-8 border-destructive/30 hover:bg-destructive/10"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry Query
            </Button>
          </div>
        </Card>
      )}

      {/* Main Studio Grid: Left Form, Right Android Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Controls & Editor (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* 1. Quick Presets */}
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground/90">
                <Sparkles className="w-4 h-4 text-purple-500" />
                Quick Message Presets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {PRESET_MESSAGES.map((preset) => {
                  const Icon = preset.icon;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="p-3 text-left rounded-xl border border-border/80 hover:border-purple-500/60 hover:bg-purple-500/5 bg-muted/20 transition-all group flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between w-full mb-2">
                        <Icon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-medium">
                          {preset.badge}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-foreground group-hover:text-purple-600 transition-colors">
                        {preset.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* 1.5 AI Push Notification Generator (Powered by Gemini) */}
          <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/5 via-indigo-500/5 to-card shadow-sm overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <div className="p-1 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <Wand2 className="w-4 h-4" />
                  </div>
                  <span>Write with Gemini AI</span>
                  <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 font-mono">
                    gemini-3.5-flash
                  </Badge>
                </CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAIOpen(!isAIOpen)}
                  className="h-7 w-7 p-0 text-muted-foreground"
                >
                  {isAIOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </div>
            </CardHeader>
            {isAIOpen && (
              <CardContent className="space-y-3.5 pt-0">
                {/* Quick Topic Chips */}
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground">Quick Ideas:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {AI_PROMPT_PRESETS.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setAiPrompt(p.prompt);
                          handleAIGenerate(p.prompt);
                        }}
                        disabled={isGeneratingAI}
                        className="text-[11px] px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-800/50 bg-background hover:bg-purple-500/10 hover:border-purple-400 text-foreground transition-all flex items-center gap-1 text-left"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Prompt Input */}
                <div className="space-y-1.5">
                  <div className="relative">
                    <Input
                      placeholder="e.g. Announce ₹500 cashback for restaurants renewing before Sunday midnight..."
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !isGeneratingAI) {
                          e.preventDefault();
                          handleAIGenerate();
                        }
                      }}
                      className="text-xs h-9 pr-24"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleAIGenerate()}
                      disabled={isGeneratingAI || !aiPrompt.trim()}
                      className="absolute right-1 top-1 h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold gap-1 px-3"
                    >
                      {isGeneratingAI ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Writing...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3" />
                          <span>Generate</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Tone & Language Controls */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase font-semibold">Tone</Label>
                    <Select value={aiTone} onValueChange={setAiTone}>
                      <SelectTrigger className="h-7 text-xs mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AI_TONES.map((t) => (
                          <SelectItem key={t.value} value={t.value} className="text-xs">
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase font-semibold">Language</Label>
                    <Select value={aiLanguage} onValueChange={setAiLanguage}>
                      <SelectTrigger className="h-7 text-xs mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AI_LANGUAGES.map((l) => (
                          <SelectItem key={l.value} value={l.value} className="text-xs">
                            {l.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Rationale / Summary Badge */}
                {aiSummary && (
                  <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-900 dark:text-purple-200 flex items-start gap-2">
                    <Lightbulb className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                    <span className="leading-snug">{aiSummary}</span>
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* 2. Message Customization */}
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground/90">
                  <Send className="w-4 h-4 text-purple-500" />
                  Customized Message
                </CardTitle>
                {/* Emoji Bar */}
                <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/50">
                  {EMOJI_LIST.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => addEmoji(emoji)}
                      className="text-xs hover:scale-125 transition-transform px-1 py-0.5"
                      title="Add emoji"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* Notification Title */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <Label htmlFor="title" className="font-semibold text-muted-foreground uppercase text-[11px]">
                    Notification Title
                  </Label>
                  <span className={`text-[11px] ${title.length > 45 ? "text-amber-500 font-bold" : "text-muted-foreground"}`}>
                    {title.length} / 50
                  </span>
                </div>
                <Input
                  id="title"
                  value={title}
                  maxLength={50}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    resetProgress();
                  }}
                  placeholder="e.g. Special Offer For You! 🎁"
                  className="font-medium"
                />
              </div>

              {/* Notification Body */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <Label htmlFor="body" className="font-semibold text-muted-foreground uppercase text-[11px]">
                    Notification Body / Message
                  </Label>
                  <span className={`text-[11px] ${body.length > 130 ? "text-amber-500 font-bold" : "text-muted-foreground"}`}>
                    {body.length} / 140
                  </span>
                </div>
                <Textarea
                  id="body"
                  value={body}
                  maxLength={140}
                  rows={3}
                  onChange={(e) => {
                    setBody(e.target.value);
                    resetProgress();
                  }}
                  placeholder="Write customized push message here..."
                  className="resize-none font-normal"
                />
                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-0.5">
                  <span className="font-semibold text-purple-600">Dynamic tags:</span>
                  <code
                    className="bg-muted px-1 py-0.5 rounded text-[10px] cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-950/50"
                    onClick={() => {
                      setBody((b) => b + " {restaurant_name}");
                      resetProgress();
                    }}
                  >
                    {"{restaurant_name}"}
                  </code>
                  <code
                    className="bg-muted px-1 py-0.5 rounded text-[10px] cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-950/50"
                    onClick={() => {
                      setBody((b) => b + " {days_left}");
                      resetProgress();
                    }}
                  >
                    {"{days_left}"}
                  </code>
                </p>
              </div>

              {/* Tap Action / Deep Link */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-muted-foreground uppercase text-[11px]">
                    Action on Tap (Deep Link)
                  </Label>
                  <Select value={actionUrl} onValueChange={(val) => {
                    setActionUrl(val);
                    resetProgress();
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select target screen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="/subscription">Subscription / Billing</SelectItem>
                      <SelectItem value="/orders">Live Orders Dashboard</SelectItem>
                      <SelectItem value="/menu">Menu Management</SelectItem>
                      <SelectItem value="/settings">Settings</SelectItem>
                      <SelectItem value="custom">Custom URL / Path</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {actionUrl === "custom" && (
                  <div className="space-y-1.5">
                    <Label className="font-semibold text-muted-foreground uppercase text-[11px]">
                      Custom Path
                    </Label>
                    <Input
                      placeholder="/offers/special"
                      value={customActionUrl}
                      onChange={(e) => {
                        setCustomActionUrl(e.target.value);
                        resetProgress();
                      }}
                    />
                  </div>
                )}
              </div>

            </CardContent>
          </Card>

          {/* 3. Target Audience Selection */}
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center justify-between text-foreground/90">
                <span className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-purple-500" />
                  Target Audience
                </span>
                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                  {matchedRestaurants.length} Outlet{matchedRestaurants.length !== 1 ? "s" : ""} Selected
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { id: "all", label: "All Outlets", sub: `All ${restaurants.length} partners` },
                  { id: "expiring_7", label: "Expiring ≤ 7d", sub: "Due this week (≥ 0d)" },
                  { id: "expiring_3", label: "Expiring ≤ 3d", sub: "Urgent renewal (≥ 0d)" },
                  { id: "expired", label: "Expired", sub: "Plan ended (< 0d)" },
                  { id: "custom", label: "Custom Pick", sub: "Select specific" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setTargetMode(item.id as any);
                      resetProgress();
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      targetMode === item.id
                        ? "border-purple-600 bg-purple-500/10 text-purple-700 dark:text-purple-300 ring-1 ring-purple-600 font-semibold"
                        : "border-border/70 hover:border-purple-400 bg-card text-muted-foreground"
                    }`}
                  >
                    <p className="text-xs font-semibold">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{item.sub}</p>
                  </button>
                ))}
              </div>

              {/* Custom Restaurant Picker */}
              {targetMode === "custom" && (
                <div className="border border-border/80 rounded-xl p-3 bg-muted/20 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-[11px] text-muted-foreground font-medium">
                      {selectedRestaurantIds.length} of {restaurants.length} outlets checked
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const filteredIds = restaurants
                            .filter((r) => r.name.toLowerCase().includes(searchFilter.toLowerCase()))
                            .map((r) => r.id);
                          setSelectedRestaurantIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
                          resetProgress();
                        }}
                        className="h-6 px-2 text-[10px] text-purple-600 hover:text-purple-700"
                      >
                        Select All
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedRestaurantIds([]);
                          resetProgress();
                        }}
                        className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
                    <Input
                      placeholder="Search restaurant..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="pl-8 h-8 text-xs"
                    />
                  </div>
                  <ScrollArea className="h-40 pr-2">
                    <div className="space-y-1">
                      {restaurants
                        .filter((r) => r.name.toLowerCase().includes(searchFilter.toLowerCase()))
                        .map((r) => {
                          const isSelected = selectedRestaurantIds.includes(r.id);
                          return (
                            <label
                              key={r.id}
                              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    resetProgress();
                                    if (e.target.checked) {
                                      setSelectedRestaurantIds((prev) => [...prev, r.id]);
                                    } else {
                                      setSelectedRestaurantIds((prev) => prev.filter((id) => id !== r.id));
                                    }
                                  }}
                                  className="rounded text-purple-600 focus:ring-purple-500"
                                />
                                <span className="font-medium">{r.name}</span>
                              </div>
                              {r.subscription && (
                                <span className="text-[10px] text-muted-foreground">
                                  {r.subscription.days_left >= 0
                                    ? `${r.subscription.days_left}d left`
                                    : `Expired (${Math.abs(r.subscription.days_left)}d ago)`}
                                </span>
                              )}
                            </label>
                          );
                        })}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!selectedUserId && registeredUsers.length > 0) {
                    const myUser = registeredUsers.find((u) => u.userId === user?.id);
                    setSelectedUserId(myUser ? myUser.userId : registeredUsers[0].userId);
                  }
                  setIsTestModalOpen(true);
                }}
                disabled={isSending || sendBroadcastMutation.isPending}
                className="gap-2 text-xs"
              >
                <User className="w-3.5 h-3.5" />
                {isSending ? "Sending Test..." : "Send Test Push (Choose User)"}
              </Button>
              <div className="mt-1.5">
                {isLoadingDevices ? (
                  <span className="text-[10px] text-muted-foreground">Checking registered users...</span>
                ) : registeredUsers.length === 0 ? (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                    <AlertTriangle className="w-3 h-3" /> 0 users/devices registered in system
                  </span>
                ) : (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3 h-3" /> {registeredUsers.length} active user(s) ({registeredDevices.length} total devices)
                  </span>
                )}
              </div>
            </div>

            <Button
              type="button"
              onClick={() => setIsConfirmOpen(true)}
              disabled={
                matchedRestaurants.length === 0 ||
                !title.trim() ||
                !body.trim() ||
                sendBroadcastMutation.isPending
              }
              className="gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md shadow-purple-500/20 text-xs font-semibold px-5"
            >
              <Send className="w-3.5 h-3.5" />
              Broadcast to {matchedRestaurants.length} Outlets
            </Button>
          </div>

        </div>

        {/* RIGHT COLUMN: Live Android Device Mockup (5 cols) */}
        <div className="lg:col-span-5 flex flex-col items-center sticky top-6">
          <div className="text-center mb-3">
            <Badge variant="outline" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Live Android Notification Tray Preview
            </Badge>
          </div>

          {/* Phone Mockup Body */}
          <div className="w-full max-w-[340px] bg-black rounded-[44px] p-3 shadow-2xl border-4 border-slate-800 relative overflow-hidden">
            
            {/* Top speaker / camera island */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-4 bg-slate-900 rounded-full z-20" />

            {/* Simulated Phone Screen */}
            <div
              className="w-full bg-[#111622] rounded-[32px] pt-7 pb-8 px-3 relative min-h-[500px] flex flex-col justify-between"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 50% 25%, rgba(124,58,237,0.2) 0%, rgba(15,23,42,0.98) 100%)",
              }}
            >
              {/* Android Status Bar */}
              <div className="flex items-center justify-between px-2 text-[11px] text-slate-300 font-medium mb-3">
                <span>10:16</span>
                <div className="flex items-center gap-1.5 text-xs">
                  <span>📶</span>
                  <span>LTE</span>
                  <span>🔋 92%</span>
                </div>
              </div>

              {/* Notification Drawer Header */}
              <div className="px-1 mb-3 flex items-center justify-between text-xs text-slate-400 font-medium">
                <span className="font-semibold text-slate-200">Notifications</span>
                <span className="text-orange-400 text-[11px] hover:underline cursor-pointer">Clear all</span>
              </div>

              {/* Push Card Replica (Material Notification Shade) */}
              <div className="bg-[#1e2330]/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-slate-700/60 transition-all hover:border-slate-500">
                {/* Notification App Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white text-[10px] font-black shadow-sm">
                      S
                    </div>
                    <span className="text-xs font-semibold text-slate-200">SwadeshiPOS</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Just now</span>
                </div>

                {/* Live Title */}
                <h4 className="text-sm font-bold text-slate-100 leading-snug">
                  {evaluatedTitle || "(Enter notification title)"}
                </h4>

                {/* Live Body */}
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {evaluatedBody || "(Enter notification body text)"}
                </p>

                {/* Action Deep Link Pill */}
                <div className="mt-3 pt-2.5 border-t border-slate-700/50 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-purple-400 flex items-center gap-1">
                    Tap to open &rarr;
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {resolvedActionUrl}
                  </span>
                </div>
              </div>

              {/* Home Indicator */}
              <div className="mt-auto pt-6 flex justify-center">
                <div className="w-28 h-1 bg-slate-600/80 rounded-full" />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Broadcast History Table */}
      <Card className="border-border/70 shadow-sm mt-8">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-500" />
              Recent Broadcast History
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Log of recent notifications submitted by Platform Admin
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["platform-broadcast-history"] })}
            className="h-8 gap-1.5 text-xs text-muted-foreground"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-border/70 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-xs font-semibold">Title</TableHead>
                  <TableHead className="text-xs font-semibold">Message</TableHead>
                  <TableHead className="text-xs font-semibold">Target Outlet</TableHead>
                  <TableHead className="text-xs font-semibold">Action Link</TableHead>
                  <TableHead className="text-xs font-semibold">Submitted At</TableHead>
                  <TableHead className="text-xs font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingHistory ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-xs text-muted-foreground">
                      Loading broadcast history...
                    </TableCell>
                  </TableRow>
                ) : broadcastHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-xs text-muted-foreground">
                      No broadcasts submitted yet. Use form above to submit your first push notification!
                    </TableCell>
                  </TableRow>
                ) : (
                  broadcastHistory.map((item: any) => {
                    const rName = restaurants.find((r) => r.id === item.restaurant_id)?.name || "Restaurant";
                    return (
                      <TableRow key={item.id} className="text-xs">
                        <TableCell className="font-semibold text-foreground max-w-[180px] truncate">
                          {item.title}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[280px] truncate">
                          {item.message}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-normal text-[11px]">
                            {rName}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-[11px] text-muted-foreground">
                          {item.action_url || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Queued
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog before submitting broadcast */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Send className="w-4 h-4 text-purple-600" />
              {submittedRestaurantIds.length > 0 ? "Resume Broadcast Submission" : "Confirm Push Broadcast"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {submittedRestaurantIds.length > 0 ? (
                <span>
                  Resuming submission: <strong className="text-emerald-600">{submittedRestaurantIds.length}</strong> of {matchedRestaurants.length} completed. Ready to submit remaining <strong className="text-foreground">{pendingRestaurants.length}</strong> outlet(s).
                </span>
              ) : (
                <span>
                  Are you sure you want to submit this push broadcast for{" "}
                  <strong className="text-foreground">{matchedRestaurants.length} restaurant(s)</strong>?
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 p-3 bg-muted/40 rounded-xl border border-border/60 text-xs">
            <div>
              <span className="font-semibold text-muted-foreground uppercase text-[10px]">Title:</span>
              <p className="font-bold text-foreground mt-0.5">{evaluatedTitle}</p>
            </div>
            <div>
              <span className="font-semibold text-muted-foreground uppercase text-[10px]">Sample Message:</span>
              <p className="text-foreground mt-0.5">{evaluatedBody}</p>
            </div>
            <div>
              <span className="font-semibold text-muted-foreground uppercase text-[10px]">Action URL:</span>
              <p className="text-purple-600 font-mono mt-0.5">{resolvedActionUrl}</p>
            </div>
            {submittedRestaurantIds.length > 0 && (
              <div className="pt-2 border-t border-border/60 flex items-center justify-between text-muted-foreground">
                <span>Progress:</span>
                <span className="font-mono font-bold text-purple-600">
                  {submittedRestaurantIds.length} / {matchedRestaurants.length} submitted
                </span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {submittedRestaurantIds.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSubmittedRestaurantIds([])}
                disabled={sendBroadcastMutation.isPending}
                className="text-xs text-muted-foreground mr-auto"
              >
                <RotateCcw className="w-3 h-3 mr-1" /> Reset Progress
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsConfirmOpen(false)}
              disabled={sendBroadcastMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => sendBroadcastMutation.mutate()}
              disabled={sendBroadcastMutation.isPending || pendingRestaurants.length === 0}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold"
            >
              {sendBroadcastMutation.isPending
                ? "Submitting..."
                : submittedRestaurantIds.length > 0
                ? `Resume Remaining (${pendingRestaurants.length})`
                : `Confirm & Submit (${matchedRestaurants.length} Outlets)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test User & Device Selection Dialog */}
      <Dialog open={isTestModalOpen} onOpenChange={setIsTestModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <User className="w-4 h-4 text-purple-600" />
              Send Test Push to Specific User
            </DialogTitle>
            <DialogDescription className="text-xs">
              Select any registered user to deliver an instant test push notification to their Android devices.
            </DialogDescription>
          </DialogHeader>

          {isLoadingDevices ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Loading registered users...
            </div>
          ) : registeredUsers.length === 0 ? (
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 text-amber-800 dark:text-amber-200 text-xs space-y-1.5">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                No Devices Registered Yet
              </p>
              <p className="text-muted-foreground leading-relaxed">
                To test push notifications, install and open the SwadeshiPOS APK on an Android device and log in. Devices register automatically into the user_push_tokens table.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Search User Input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Search user by name, email, or restaurant outlet..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>

              {/* Users List */}
              <ScrollArea className="h-72 pr-2">
                <div className="space-y-2">
                  {filteredUsers.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted-foreground">
                      No registered users found matching "{userSearchQuery}"
                    </div>
                  ) : (
                    filteredUsers.map((u) => {
                      const isSelected = selectedUserId === u.userId;
                      const isMyAccount = u.userId === user?.id;
                      return (
                        <div
                          key={u.userId}
                          onClick={() => setSelectedUserId(u.userId)}
                          className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-start justify-between gap-3 ${
                            isSelected
                              ? "border-purple-600 bg-purple-500/10 text-purple-900 dark:text-purple-100 ring-1 ring-purple-600 shadow-sm"
                              : "border-border/80 hover:border-purple-400 bg-card hover:bg-muted/30"
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            {/* Avatar circle */}
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white text-xs font-bold uppercase shadow-sm shrink-0 mt-0.5">
                              {u.userName.charAt(0) || "U"}
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-foreground text-xs">
                                  {u.userName}
                                </span>
                                {isMyAccount && (
                                  <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                                    My Account
                                  </Badge>
                                )}
                                {u.role && (
                                  <Badge variant="secondary" className="text-[10px] uppercase font-mono">
                                    {u.role}
                                  </Badge>
                                )}
                              </div>

                              {u.userEmail && (
                                <p className="text-[11px] text-muted-foreground">
                                  {u.userEmail}
                                </p>
                              )}

                              <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                                  {u.restaurantName}
                                </span>
                                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-1">
                                  <Smartphone className="w-3 h-3" />
                                  {u.deviceCount} device{u.deviceCount > 1 ? "s" : ""}
                                </span>
                                {u.lastActive && (
                                  <span className="text-[10px] text-muted-foreground">
                                    • Last active {new Date(u.lastActive).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <input
                            type="radio"
                            name="selected_test_user"
                            checked={isSelected}
                            onChange={() => setSelectedUserId(u.userId)}
                            className="mt-2 text-purple-600 focus:ring-purple-500 shrink-0"
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsTestModalOpen(false)}
              disabled={isSending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => handleSendTest(selectedUserId)}
              disabled={isSending || registeredUsers.length === 0}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              {isSending ? "Sending..." : "Send Test to Selected User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
