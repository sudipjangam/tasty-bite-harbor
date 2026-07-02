import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StandardizedButton } from "@/components/ui/standardized-button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  useWhatsAppTemplates,
  VariableMapping,
} from "@/hooks/useWhatsAppTemplates";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus,
  Eye,
  Send,
  X,
  Lock,
  Sparkles,
  Wand2,
  RefreshCw,
  Zap,
  Globe,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface CreateTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

const DEFAULT_FOOTER = "Powered by Swadeshi Solutions";

const AVAILABLE_VARIABLES = [
  { name: "customer_name", sample: "John Doe" },
  { name: "restaurant_name", sample: "My Restaurant" },
  { name: "amount", sample: "₹500" },
  { name: "discount_code", sample: "SAVE20" },
  { name: "order_date", sample: "Mar 04, 2026" },
  { name: "contact_number", sample: "9876543210" },
];

const TEMPLATE_PRESETS = [
  {
    label: "🎉 Welcome Message",
    prompt: "Welcome message for new customers thanking them for their first visit, inviting them back with a special offer",
  },
  {
    label: "🎂 Birthday Offer",
    prompt: "Birthday wish message with a special birthday discount offer for the customer",
  },
  {
    label: "📦 Order Confirmation",
    prompt: "Order confirmation message with order details, amount, and estimated delivery/ready time",
  },
  {
    label: "⭐ Feedback Request",
    prompt: "Thank you message after dining asking for feedback and rating, with a link to review",
  },
  {
    label: "🎊 Festival Offer",
    prompt: "Festival celebration message with a special limited-time discount offer",
  },
  {
    label: "💳 Loyalty Reward",
    prompt: "Loyalty points earned notification with total points balance and how to redeem",
  },
  {
    label: "🍽️ New Menu Launch",
    prompt: "Exciting announcement about new dishes added to the menu, inviting customers to try them",
  },
  {
    label: "📢 Re-engagement",
    prompt: "We miss you message for customers who haven't visited in a while, with a comeback discount",
  },
];

const LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "hi", label: "Hindi", flag: "🇮🇳" },
  { code: "mr", label: "Marathi", flag: "🇮🇳" },
  { code: "ta", label: "Tamil", flag: "🇮🇳" },
  { code: "te", label: "Telugu", flag: "🇮🇳" },
  { code: "kn", label: "Kannada", flag: "🇮🇳" },
  { code: "bn", label: "Bengali", flag: "🇮🇳" },
  { code: "gu", label: "Gujarati", flag: "🇮🇳" },
];

const CreateTemplateDialog: React.FC<CreateTemplateDialogProps> = ({
  open,
  onOpenChange,
  onCreated,
}) => {
  const { toast } = useToast();
  const { createTemplate } = useWhatsAppTemplates();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    display_name: "",
    category: "UTILITY",
    language: "en",
    body: "",
    header_text: "",
  });
  const [variables, setVariables] = useState<VariableMapping[]>([]);

  // AI Assistant state
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiExpanded, setAiExpanded] = useState(true);
  const [hasGenerated, setHasGenerated] = useState(false);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  // Insert a named variable into the body text
  const insertVariable = (varName: string) => {
    const varObj = AVAILABLE_VARIABLES.find((v) => v.name === varName);
    if (!varObj) return;

    if (variables.find((v) => v.name === varName)) {
      toast({
        title: "Already added",
        description: `{{${varName}}} is already in the template.`,
      });
      return;
    }

    const nextPosition = variables.length + 1;
    setVariables((prev) => [
      ...prev,
      { position: nextPosition, name: varName, sample: varObj.sample },
    ]);
    setForm((prev) => ({
      ...prev,
      body: prev.body + `{{${varName}}}`,
    }));
  };

  const removeVariable = (varName: string) => {
    setVariables((prev) => {
      const updated = prev.filter((v) => v.name !== varName);
      return updated.map((v, i) => ({ ...v, position: i + 1 }));
    });
    setForm((prev) => ({
      ...prev,
      body: prev.body.replace(`{{${varName}}}`, ""),
    }));
  };

  // Generate preview text with sample values
  const getPreviewText = () => {
    let text = form.body;
    variables.forEach((v) => {
      text = text.replace(`{{${v.name}}}`, v.sample);
    });
    return text;
  };

  // Auto-generate slug name from display name
  const handleDisplayNameChange = (displayName: string) => {
    const slug = displayName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
    setForm((prev) => ({
      ...prev,
      display_name: displayName,
      name: slug,
    }));
  };

  // AI Template Generation
  const handleAIGenerate = async (customPrompt?: string) => {
    const prompt = customPrompt || aiPrompt;
    if (!prompt.trim()) {
      toast({
        title: "Describe your template",
        description: "Tell the AI what kind of message you want to send.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const selectedLang = LANGUAGES.find(l => l.code === form.language);
      const languageName = selectedLang?.label || "English";

      // Use lightweight dedicated edge function (no 49-table DB fetch)
      const { data, error } = await supabase.functions.invoke(
        "generate-wa-template",
        {
          body: {
            prompt,
            language: languageName,
            restaurantName: "your restaurant",
          },
        }
      );

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const parsed = data;

      // Auto-fill form
      handleDisplayNameChange(parsed.display_name || "AI Template");
      setForm((prev) => ({
        ...prev,
        category: parsed.category || "UTILITY",
        header_text: parsed.header_text || "",
        body: parsed.body || "",
      }));

      // Set variables from AI response
      const aiVars: VariableMapping[] = (parsed.variables || [])
        .filter((v: any) =>
          AVAILABLE_VARIABLES.some((av) => av.name === v.name)
        )
        .map((v: any, i: number) => ({
          position: i + 1,
          name: v.name,
          sample:
            v.sample ||
            AVAILABLE_VARIABLES.find((av) => av.name === v.name)?.sample ||
            "",
        }));
      setVariables(aiVars);

      setHasGenerated(true);
      setAiExpanded(false);

      toast({
        title: "✨ Template Generated!",
        description: `Category: ${parsed.category}${parsed.category_reason ? ` — ${parsed.category_reason}` : ""}`,
      });
    } catch (err) {
      console.error("AI generation error:", err);
      toast({
        title: "AI Generation Failed",
        description:
          err instanceof Error
            ? err.message
            : "Failed to generate template. Try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (asDraft = true) => {
    if (!form.display_name.trim() || !form.body.trim()) {
      toast({
        title: "Missing fields",
        description: "Template name and body are required.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await createTemplate({
        name: form.name,
        display_name: form.display_name,
        category: form.category,
        language: form.language,
        body: form.body,
        variables: variables,
        header_text: form.header_text || null,
        footer_text: DEFAULT_FOOTER,
        buttons: [],
        status: asDraft ? "draft" : "pending_admin",
        is_default: false,
      });

      toast({
        title: asDraft ? "Template Saved 📝" : "Submitted for Review 📤",
        description: asDraft
          ? "Template saved as draft."
          : "Template submitted to Swadeshi Solutions for review.",
      });

      // Reset form
      setForm({
        name: "",
        display_name: "",
        category: "UTILITY",
        language: "en",
        body: "",
        header_text: "",
      });
      setVariables([]);
      setAiPrompt("");
      setHasGenerated(false);
      setAiExpanded(true);
      onCreated?.();
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to create template",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-green-600" />
            Create WhatsApp Template
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Form */}
          <div className="space-y-4">
            {/* ✨ AI Assistant Panel */}
            <div
              className={`
                relative rounded-xl overflow-hidden
                bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50
                dark:from-purple-950/30 dark:via-blue-950/30 dark:to-indigo-950/30
                border-2 border-purple-200/60 dark:border-purple-700/40
                transition-all duration-300
              `}
            >
              {/* Shimmer top */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 via-blue-500 to-indigo-500" />

              {/* Header — always visible */}
              <button
                type="button"
                onClick={() => setAiExpanded(!aiExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-purple-100/30 dark:hover:bg-purple-900/20 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 text-white">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <span className="font-semibold text-sm text-purple-900 dark:text-purple-200">
                    AI Template Assistant
                  </span>
                  <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 text-[10px]">
                    Powered by Gemini
                  </Badge>
                </div>
                {aiExpanded ? (
                  <ChevronUp className="h-4 w-4 text-purple-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-purple-500" />
                )}
              </button>

              {/* Expandable content */}
              {aiExpanded && (
                <div className="px-4 pb-4 space-y-3">
                  {/* Quick Presets */}
                  <div>
                    <p className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-2">
                      Quick Start Presets
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {TEMPLATE_PRESETS.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            setAiPrompt(preset.prompt);
                            handleAIGenerate(preset.prompt);
                          }}
                          disabled={isGenerating}
                          className="
                            px-2.5 py-1 rounded-full text-[11px] font-medium
                            bg-white/80 dark:bg-gray-800/60
                            border border-purple-200 dark:border-purple-700/50
                            text-purple-800 dark:text-purple-200
                            hover:bg-purple-100 dark:hover:bg-purple-900/30
                            hover:border-purple-400 dark:hover:border-purple-500
                            transition-all disabled:opacity-40
                          "
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom prompt */}
                  <div>
                    <p className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-1.5">
                      Or describe what you want
                    </p>
                    <Textarea
                      ref={promptRef}
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="e.g., Send a Diwali special offer with 20% off for loyal customers who visited this month..."
                      rows={3}
                      className="
                        bg-white/70 dark:bg-gray-800/50
                        border-purple-200 dark:border-purple-700/50
                        focus:border-purple-500 focus:ring-purple-500/20
                        text-sm placeholder:text-purple-400/60
                      "
                      disabled={isGenerating}
                    />
                  </div>

                  {/* Language + Generate button */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-purple-500" />
                      <Select
                        value={form.language}
                        onValueChange={(v) =>
                          setForm((prev) => ({ ...prev, language: v }))
                        }
                      >
                        <SelectTrigger className="h-8 w-[130px] text-xs bg-white/70 dark:bg-gray-800/50 border-purple-200 dark:border-purple-700/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LANGUAGES.map((lang) => (
                            <SelectItem
                              key={lang.code}
                              value={lang.code}
                              className="text-xs"
                            >
                              {lang.flag} {lang.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <StandardizedButton
                      onClick={() => handleAIGenerate()}
                      disabled={isGenerating || !aiPrompt.trim()}
                      className="
                        flex-1 flex items-center justify-center gap-2
                        bg-gradient-to-r from-purple-600 to-blue-600
                        hover:from-purple-700 hover:to-blue-700
                        text-white shadow-lg shadow-purple-500/25
                        disabled:opacity-40 disabled:shadow-none
                        transition-all
                      "
                    >
                      {isGenerating ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : hasGenerated ? (
                        <>
                          <Wand2 className="h-4 w-4" />
                          Refine
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Write with AI
                        </>
                      )}
                    </StandardizedButton>
                  </div>
                </div>
              )}

              {/* Collapsed hint when generated */}
              {!aiExpanded && hasGenerated && (
                <div className="px-4 pb-2">
                  <p className="text-[11px] text-purple-500 flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    AI-generated template loaded. Click to refine or edit below.
                  </p>
                </div>
              )}
            </div>

            {/* Template Name + Category */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="display_name">Template Name *</Label>
                <Input
                  id="display_name"
                  value={form.display_name}
                  onChange={(e) => handleDisplayNameChange(e.target.value)}
                  placeholder="e.g., Welcome Offer"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Slug:{" "}
                  <code className="text-xs">
                    {form.name || "auto-generated"}
                  </code>
                </p>
              </div>
              <div>
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) =>
                    setForm((prev) => ({ ...prev, category: v }))
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTILITY">
                      Utility (~₹0.12/msg)
                    </SelectItem>
                    <SelectItem value="MARKETING">
                      Marketing (~₹0.90/msg)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Language (manual override) */}
            <div>
              <Label className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" />
                Language
              </Label>
              <Select
                value={form.language}
                onValueChange={(v) =>
                  setForm((prev) => ({ ...prev, language: v }))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.flag} {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Header */}
            <div>
              <Label htmlFor="header_text">Header (Optional)</Label>
              <Input
                id="header_text"
                value={form.header_text}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    header_text: e.target.value,
                  }))
                }
                placeholder="e.g., Order Confirmation"
                className="mt-1"
              />
            </div>

            {/* Message Body */}
            <div>
              <Label htmlFor="body">Message Body *</Label>
              <Textarea
                id="body"
                value={form.body}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, body: e.target.value }))
                }
                placeholder="Hi {{customer_name}}, thank you for visiting {{restaurant_name}}!"
                rows={6}
                className="mt-1 font-mono text-sm"
              />
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-gray-500">
                  Use buttons below to insert variables. Format:{" "}
                  {"{{customer_name}}"}.
                </p>
                <p
                  className={`text-xs font-medium ${form.body.length > 1024 ? "text-red-500" : form.body.length > 900 ? "text-amber-500" : "text-gray-400"}`}
                >
                  {form.body.length}/1024
                </p>
              </div>
              {/* Meta MARKETING variable position warning */}
              {form.category === "MARKETING" && form.body && (() => {
                const bodyTrimmed = form.body.trim();
                const strippedLeading = bodyTrimmed.replace(/^(Hi|Hey|Hello|Dear|Namaste)[,!]?\s*/i, "");
                const strippedTrailing = bodyTrimmed.replace(/[.!?\s]+$/, "");
                const hasLeadingVar = strippedLeading.startsWith("{{");
                const hasTrailingVar = /\{\{\w+\}\}$/.test(strippedTrailing);
                if (hasLeadingVar || hasTrailingVar) {
                  return (
                    <div className="mt-1.5 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] text-red-600 dark:text-red-400 font-medium flex items-start gap-2">
                      <span className="text-red-500 mt-0.5">⚠️</span>
                      <span>
                        <strong>Meta will reject this:</strong> MARKETING templates cannot have variables ({"{{...}}"}) at the{" "}
                        {hasLeadingVar && "start"}{hasLeadingVar && hasTrailingVar && " or "}{hasTrailingVar && "end"}{" "}
                        of the body. Add more text {hasLeadingVar && "before the first variable"}{hasLeadingVar && hasTrailingVar && " and "}{hasTrailingVar && "after the last variable"}.
                      </span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {/* Variable Insertion Buttons */}
            <div>
              <Label className="text-sm mb-2 block">
                Insert Variables (Name type)
              </Label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_VARIABLES.map((v) => {
                  const isUsed = variables.some((vr) => vr.name === v.name);
                  return (
                    <button
                      key={v.name}
                      type="button"
                      onClick={() => insertVariable(v.name)}
                      disabled={isUsed}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        isUsed
                          ? "bg-green-100 text-green-700 border border-green-300 cursor-default"
                          : "bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-700 border border-gray-200 hover:border-blue-300"
                      }`}
                    >
                      {isUsed ? "✓ " : "+ "}
                      {`{{${v.name}}}`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Variables */}
            {variables.length > 0 && (
              <div>
                <Label className="text-sm mb-2 block">
                  Active Variables ({variables.length})
                </Label>
                <div className="space-y-1">
                  {variables.map((v) => (
                    <div
                      key={v.name}
                      className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 rounded px-3 py-1.5"
                    >
                      <span className="text-sm">
                        <code className="text-blue-600">{`{{${v.name}}}`}</code>
                        <span className="text-gray-400 ml-2">
                          (sample: {v.sample})
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeVariable(v.name)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer - Locked */}
            <div>
              <Label className="flex items-center gap-1.5">
                Footer
                <Lock className="h-3 w-3 text-amber-500" />
              </Label>
              <div className="mt-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 border rounded-md text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <span>{DEFAULT_FOOTER}</span>
                <span className="text-xs text-amber-500 ml-auto">
                  Admin-only
                </span>
              </div>
            </div>
          </div>

          {/* Right: Live WhatsApp Preview */}
          <div>
            <Label className="text-sm mb-2 block flex items-center gap-2">
              <Eye className="h-4 w-4" />
              WhatsApp Preview
            </Label>
            <div className="bg-[#E5DDD5] dark:bg-gray-800 rounded-2xl p-4 min-h-[400px] flex flex-col">
              {/* Chat header */}
              <div className="bg-[#075E54] text-white rounded-t-xl px-4 py-3 -mt-4 -mx-4 mb-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm">
                  🏪
                </div>
                <div>
                  <p className="font-medium text-sm">Business Name</p>
                  <p className="text-xs text-green-200">Verified Business</p>
                </div>
              </div>

              {/* Message bubble */}
              <div className="flex-1 flex flex-col justify-end">
                <div className="bg-white dark:bg-gray-700 rounded-lg p-3 max-w-[85%] shadow-sm relative ml-auto">
                  {/* Header */}
                  {form.header_text && (
                    <p className="font-bold text-sm text-gray-900 dark:text-gray-100 mb-1">
                      {form.header_text}
                    </p>
                  )}

                  {/* Body */}
                  <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                    {getPreviewText() || (
                      <span className="text-gray-400 italic">
                        Start typing your message...
                      </span>
                    )}
                  </p>

                  {/* Footer - always shown */}
                  <p className="text-xs text-gray-500 mt-2 border-t pt-1">
                    {DEFAULT_FOOTER}
                  </p>

                  {/* Timestamp */}
                  <p className="text-[10px] text-gray-400 text-right mt-1">
                    {new Date().toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    ✓✓
                  </p>

                  {/* Tail */}
                  <div className="absolute -right-2 top-0 w-0 h-0 border-l-8 border-l-white dark:border-l-gray-700 border-t-8 border-t-transparent" />
                </div>
              </div>

              {/* Category info */}
              {form.category === "MARKETING" && (
                <div className="mt-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg p-2 text-xs text-amber-800 dark:text-amber-200">
                  ⚠️ Marketing templates cost ~₹0.90/msg vs ₹0.12 for Utility.
                </div>
              )}

              {/* Language badge */}
              {form.language !== "en" && (
                <div className="mt-2 flex items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-white/50"
                  >
                    <Globe className="h-3 w-3 mr-1" />
                    {LANGUAGES.find((l) => l.code === form.language)?.label ||
                      form.language}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <StandardizedButton
            variant="secondary"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancel
          </StandardizedButton>
          <StandardizedButton
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting}
            variant="secondary"
            className="flex-1 flex items-center justify-center gap-2"
          >
            📝 Save as Draft
          </StandardizedButton>
          <StandardizedButton
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white"
          >
            <Send className="h-4 w-4" />
            Submit for Approval
          </StandardizedButton>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTemplateDialog;
