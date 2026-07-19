import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Clock,
  Mail,
  Phone,
  Plus,
  Trash2,
  Loader2,
  Send,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  MessageCircle,
} from "lucide-react";
import { format } from "date-fns";

interface ScheduledReportSettings {
  id?: string;
  restaurant_id: string;
  is_enabled: boolean;
  report_time: string;
  timezone: string;
  send_whatsapp: boolean;
  send_email: boolean;
  whatsapp_numbers: string[];
  email_addresses: string[];
  last_sent_date: string | null;
  last_delivery_status: any;
}

const TIME_OPTIONS = [
  "20:00",
  "20:30",
  "21:00",
  "21:30",
  "22:00",
  "22:30",
  "23:00",
  "23:30",
  "00:00",
  "00:30",
  "01:00",
];

const formatTime12h = (time24: string): string => {
  const [h, m] = time24.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
};

export const DailyReportScheduleSettings: React.FC = () => {
  const { restaurantId } = useRestaurantId();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [settings, setSettings] = useState<ScheduledReportSettings>({
    restaurant_id: restaurantId || "",
    is_enabled: false,
    report_time: "23:00",
    timezone: "Asia/Kolkata",
    send_whatsapp: true,
    send_email: true,
    whatsapp_numbers: [],
    email_addresses: [],
    last_sent_date: null,
    last_delivery_status: {},
  });

  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  // Fetch existing settings
  const { data: existingSettings, isLoading } = useQuery({
    queryKey: ["scheduled-report-settings", restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scheduled_report_settings")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  // Fetch restaurant owner details for pre-population
  const { data: restaurant } = useQuery({
    queryKey: ["restaurant-owner-info", restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      const { data } = await supabase
        .from("restaurants")
        .select("owner_email, owner_phone, name")
        .eq("id", restaurantId)
        .single();
      return data;
    },
  });

  // Sync from DB
  useEffect(() => {
    if (existingSettings) {
      setSettings({
        id: existingSettings.id,
        restaurant_id: existingSettings.restaurant_id,
        is_enabled: existingSettings.is_enabled || false,
        report_time: existingSettings.report_time ? existingSettings.report_time.substring(0, 5) : "23:00",
        timezone: existingSettings.timezone || "Asia/Kolkata",
        send_whatsapp: existingSettings.send_whatsapp ?? true,
        send_email: existingSettings.send_email ?? true,
        whatsapp_numbers: existingSettings.whatsapp_numbers || [],
        email_addresses: existingSettings.email_addresses || [],
        last_sent_date: existingSettings.last_sent_date,
        last_delivery_status: existingSettings.last_delivery_status || {},
      });
    } else if (restaurant && !existingSettings) {
      // Pre-populate from restaurant owner info
      const phones: string[] = [];
      const emails: string[] = [];
      if (restaurant.owner_phone) phones.push(restaurant.owner_phone);
      if (restaurant.owner_email) emails.push(restaurant.owner_email);
      setSettings((prev) => ({
        ...prev,
        restaurant_id: restaurantId || "",
        whatsapp_numbers: phones,
        email_addresses: emails,
      }));
    }
  }, [existingSettings, restaurant, restaurantId]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: ScheduledReportSettings) => {
      const payload = {
        restaurant_id: data.restaurant_id,
        is_enabled: data.is_enabled,
        report_time: data.report_time,
        timezone: data.timezone,
        send_whatsapp: data.send_whatsapp,
        send_email: data.send_email,
        whatsapp_numbers: data.whatsapp_numbers,
        email_addresses: data.email_addresses,
      };

      const { error } = await supabase
        .from("scheduled_report_settings")
        .upsert(payload, { onConflict: "restaurant_id" });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["scheduled-report-settings"],
      });
      toast({
        title: "Settings Saved ✅",
        description: settings.is_enabled
          ? `Daily report will be sent at ${formatTime12h(settings.report_time)}`
          : "Auto daily report is disabled",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Failed to save",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // Add phone number
  const handleAddPhone = () => {
    const clean = newPhone.trim().replace(/[\s\-]/g, "");
    if (!clean || clean.length < 10) {
      toast({
        title: "Invalid number",
        description: "Enter a valid phone number",
        variant: "destructive",
      });
      return;
    }
    if (settings.whatsapp_numbers.includes(clean)) {
      toast({
        title: "Already added",
        description: "This number is already in the list",
        variant: "destructive",
      });
      return;
    }
    setSettings((prev) => ({
      ...prev,
      whatsapp_numbers: [...prev.whatsapp_numbers, clean],
    }));
    setNewPhone("");
  };

  // Add email
  const handleAddEmail = () => {
    const clean = newEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clean)) {
      toast({
        title: "Invalid email",
        description: "Enter a valid email address",
        variant: "destructive",
      });
      return;
    }
    if (settings.email_addresses.includes(clean)) {
      toast({
        title: "Already added",
        description: "This email is already in the list",
        variant: "destructive",
      });
      return;
    }
    setSettings((prev) => ({
      ...prev,
      email_addresses: [...prev.email_addresses, clean],
    }));
    setNewEmail("");
  };

  // Remove items
  const removePhone = (idx: number) => {
    setSettings((prev) => ({
      ...prev,
      whatsapp_numbers: prev.whatsapp_numbers.filter((_, i) => i !== idx),
    }));
  };

  const removeEmail = (idx: number) => {
    setSettings((prev) => ({
      ...prev,
      email_addresses: prev.email_addresses.filter((_, i) => i !== idx),
    }));
  };

  // Send test report
  const handleSendTest = async () => {
    if (!restaurantId) return;
    setSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "send-daily-report",
        {
          body: { restaurantId },
        }
      );

      if (error) throw error;

      toast({
        title: "Test Report Sent! 🧪",
        description: `Report generated with ${data?.results?.[0]?.orders || 0} orders`,
      });

      queryClient.invalidateQueries({
        queryKey: ["scheduled-report-settings"],
      });
    } catch (err: any) {
      toast({
        title: "Test failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSendingTest(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border border-white/30 dark:border-gray-700/30 rounded-3xl shadow-xl">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </CardContent>
      </Card>
    );
  }

  const hasRecipients =
    settings.whatsapp_numbers.length > 0 ||
    settings.email_addresses.length > 0;

  return (
    <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border border-white/30 dark:border-gray-700/30 rounded-3xl shadow-xl">
      <CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-r from-orange-500 to-pink-500 rounded-xl shadow-lg">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              Auto Daily Report
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400 mt-1">
              Automatically send end-of-day sales report to owner via WhatsApp &
              Email
            </CardDescription>
          </div>
          <Switch
            checked={settings.is_enabled}
            onCheckedChange={(checked) =>
              setSettings((prev) => ({ ...prev, is_enabled: checked }))
            }
          />
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Report Time */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-500" />
            Report Send Time
          </Label>
          <Input
            type="time"
            value={settings.report_time}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, report_time: e.target.value }))
            }
            className="w-full max-w-xs rounded-xl"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Report will be generated and sent at this time daily (IST)
          </p>
        </div>

        {/* Channel Toggles */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
            <Label className="text-sm font-medium text-green-700 dark:text-green-300 flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </Label>
            <Switch
              checked={settings.send_whatsapp}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({ ...prev, send_whatsapp: checked }))
              }
            />
          </div>
          <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
            <Label className="text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </Label>
            <Switch
              checked={settings.send_email}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({ ...prev, send_email: checked }))
              }
            />
          </div>
        </div>

        {/* WhatsApp Numbers */}
        {settings.send_whatsapp && (
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Phone className="h-4 w-4 text-green-500" />
              WhatsApp Numbers
            </Label>
            <div className="space-y-2">
              {settings.whatsapp_numbers.map((phone, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-xl px-4 py-2.5"
                >
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {phone.length === 10 ? `+91 ${phone}` : `+${phone}`}
                  </span>
                  <button
                    onClick={() => removePhone(idx)}
                    className="text-red-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                type="tel"
                placeholder="e.g. 9876543210"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="rounded-xl"
                onKeyDown={(e) => e.key === "Enter" && handleAddPhone()}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddPhone}
                className="rounded-xl border-green-200 text-green-600 hover:bg-green-50"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Email Addresses */}
        {settings.send_email && (
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Mail className="h-4 w-4 text-blue-500" />
              Email Addresses
            </Label>
            <div className="space-y-2">
              {settings.email_addresses.map((email, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-xl px-4 py-2.5"
                >
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {email}
                  </span>
                  <button
                    onClick={() => removeEmail(idx)}
                    className="text-red-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="e.g. owner@restaurant.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="rounded-xl"
                onKeyDown={(e) => e.key === "Enter" && handleAddEmail()}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddEmail}
                className="rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-400">
              Reports sent from inquiry@swadeshisolutions.co.in
            </p>
          </div>
        )}

        {/* Last Sent Status */}
        {settings.last_sent_date && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                Last sent:{" "}
                {format(new Date(settings.last_sent_date), "dd MMM yyyy")}
              </span>
            </div>
            {settings.last_delivery_status?.whatsapp && (
              <Badge
                variant="secondary"
                className="mt-2 mr-2 bg-green-100 text-green-700"
              >
                📱 WhatsApp ✓
              </Badge>
            )}
            {settings.last_delivery_status?.email && (
              <Badge
                variant="secondary"
                className="mt-2 bg-blue-100 text-blue-700"
              >
                📧 Email ✓
              </Badge>
            )}
          </div>
        )}

        {/* Warning if no recipients */}
        {settings.is_enabled && !hasRecipients && (
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                No recipients configured
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                Add at least one WhatsApp number or email address to receive
                daily reports.
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            onClick={() => saveMutation.mutate(settings)}
            disabled={saveMutation.isPending}
            className="flex-1 bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:from-orange-600 hover:to-pink-600 rounded-xl shadow-lg"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Save Settings
          </Button>
          <Button
            variant="outline"
            onClick={handleSendTest}
            disabled={sendingTest || !hasRecipients}
            className="flex-1 rounded-xl border-orange-200 text-orange-600 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-400 dark:hover:bg-orange-900/20"
          >
            {sendingTest ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Send Test Report
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DailyReportScheduleSettings;
