import React, { useState } from "react";
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
import { Plus, Eye, Send, X } from "lucide-react";

interface CreateTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

const AVAILABLE_VARIABLES = [
  { name: "customer_name", sample: "John Doe" },
  { name: "restaurant_name", sample: "My Restaurant" },
  { name: "amount", sample: "₹500" },
  { name: "discount_code", sample: "SAVE20" },
  { name: "order_date", sample: "Mar 04, 2026" },
  { name: "contact_number", sample: "9876543210" },
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
    body: "",
    header_text: "",
    footer_text: "",
  });
  const [variables, setVariables] = useState<VariableMapping[]>([]);

  // Insert a variable into the body text
  const insertVariable = (varName: string) => {
    const nextPosition = variables.length + 1;
    const varObj = AVAILABLE_VARIABLES.find((v) => v.name === varName);
    if (!varObj) return;

    // Check if already used
    if (variables.find((v) => v.name === varName)) {
      toast({
        title: "Already added",
        description: `{{${varName}}} is already in the template.`,
      });
      return;
    }

    setVariables((prev) => [
      ...prev,
      { position: nextPosition, name: varName, sample: varObj.sample },
    ]);
    setForm((prev) => ({
      ...prev,
      body: prev.body + `{{${nextPosition}}}`,
    }));
  };

  const removeVariable = (position: number) => {
    setVariables((prev) => {
      const updated = prev.filter((v) => v.position !== position);
      // Re-number positions
      return updated.map((v, i) => ({ ...v, position: i + 1 }));
    });
    // Remove the placeholder from body
    setForm((prev) => ({
      ...prev,
      body: prev.body.replace(`{{${position}}}`, ""),
    }));
  };

  // Generate preview text with sample values
  const getPreviewText = () => {
    let text = form.body;
    variables.forEach((v) => {
      text = text.replace(`{{${v.position}}}`, v.sample);
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
        language: "en",
        body: form.body,
        variables: variables,
        header_text: form.header_text || null,
        footer_text: form.footer_text || null,
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
        body: "",
        header_text: "",
        footer_text: "",
      });
      setVariables([]);
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

            <div>
              <Label htmlFor="header_text">Header (Optional)</Label>
              <Input
                id="header_text"
                value={form.header_text}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, header_text: e.target.value }))
                }
                placeholder="e.g., Order Confirmation"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="body">Message Body *</Label>
              <Textarea
                id="body"
                value={form.body}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, body: e.target.value }))
                }
                placeholder="Hi {{1}}, thank you for visiting {{2}}!"
                rows={6}
                className="mt-1 font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use the buttons below to insert variables. Variables use{" "}
                {"{{1}}, {{2}}"} format.
              </p>
            </div>

            {/* Variable Insertion Buttons */}
            <div>
              <Label className="text-sm mb-2 block">Insert Variables</Label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_VARIABLES.map((v) => {
                  const isUsed = variables.some((vr) => vr.name === v.name);
                  return (
                    <button
                      key={v.name}
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
                      key={v.position}
                      className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 rounded px-3 py-1.5"
                    >
                      <span className="text-sm">
                        <code className="text-blue-600">{`{{${v.position}}}`}</code>
                        {" → "}
                        <span className="text-gray-600">{v.name}</span>
                        <span className="text-gray-400 ml-2">
                          (sample: {v.sample})
                        </span>
                      </span>
                      <button
                        onClick={() => removeVariable(v.position)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="footer_text">Footer (Optional)</Label>
              <Input
                id="footer_text"
                value={form.footer_text}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, footer_text: e.target.value }))
                }
                placeholder="e.g., Reply STOP to unsubscribe"
                className="mt-1"
              />
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

                  {/* Footer */}
                  {form.footer_text && (
                    <p className="text-xs text-gray-500 mt-2 border-t pt-1">
                      {form.footer_text}
                    </p>
                  )}

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

              {/* Category warning */}
              {form.category === "MARKETING" && (
                <div className="mt-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg p-2 text-xs text-amber-800 dark:text-amber-200">
                  ⚠️ Marketing templates cost ~₹0.90/msg vs ₹0.12 for Utility.
                  Keep promotional language minimal.
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
