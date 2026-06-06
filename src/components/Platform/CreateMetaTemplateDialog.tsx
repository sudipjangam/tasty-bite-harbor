import React, { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Eye, Send, X, Lock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CreateMetaTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
  initialData?: any;
}

const DEFAULT_FOOTER = "billed by Swadeshi Solutions";

const AVAILABLE_VARIABLES = [
  { name: "customer_name", sample: "John Doe" },
  { name: "restaurant_name", sample: "My Restaurant" },
  { name: "amount", sample: "₹500" },
  { name: "discount_code", sample: "SAVE20" },
  { name: "order_date", sample: "Mar 04, 2026" },
  { name: "contact_number", sample: "9876543210" },
];

const CreateMetaTemplateDialog: React.FC<CreateMetaTemplateDialogProps> = ({
  open,
  onOpenChange,
  onCreated,
  initialData,
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    display_name: "",
    category: "UTILITY",
    body: "",
    header_text: "",
    language: "en",
  });
  const [variables, setVariables] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      if (initialData) {
        // Pre-fill form for edit
        const bodyComp = initialData.components?.find((c: any) => c.type === "BODY");
        const headerComp = initialData.components?.find((c: any) => c.type === "HEADER");
        
        let bodyText = bodyComp?.text || "";
        // Reverse map {{1}} back to named variables if possible? 
        // For simplicity, we just show what Meta returned. If it has {{1}}, user edits it.
        // But let's assume if it has {{1}}, it's hard to edit named ones. We will just load it.

        setForm({
          name: initialData.name,
          display_name: initialData.name,
          category: initialData.category,
          language: initialData.language,
          body: bodyText,
          header_text: headerComp?.text || "",
        });
        setVariables([]);
      } else {
        setForm({
          name: "",
          display_name: "",
          category: "UTILITY",
          body: "",
          header_text: "",
          language: "en",
        });
        setVariables([]);
      }
    }
  }, [open, initialData]);

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

  const getPreviewText = () => {
    let text = form.body;
    variables.forEach((v) => {
      text = text.replace(`{{${v.name}}}`, v.sample);
    });
    return text;
  };

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

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.body.trim()) {
      toast({
        title: "Missing fields",
        description: "Template name and body are required.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Transform named variables {{customer_name}} to positional {{1}}
      let processedBody = form.body;
      let exampleBodyText: string[] = [];
      
      variables.forEach((v) => {
        processedBody = processedBody.replace(`{{${v.name}}}`, `{{${v.position}}}`);
        exampleBodyText.push(v.sample);
      });

      // Handle {{1}} if they were manually typed without named variables
      const manualVarsMatch = processedBody.match(/\{\{\d+\}\}/g);
      if (manualVarsMatch && exampleBodyText.length === 0) {
          // just push some dummy samples if they typed {{1}} manually
          manualVarsMatch.forEach(() => exampleBodyText.push("Sample"));
      }

      const payload = {
        name: form.name,
        category: form.category,
        language: form.language,
        components: [
          {
            type: "BODY",
            text: processedBody,
            ...(exampleBodyText.length > 0 ? { example: { body_text: [exampleBodyText] } } : {})
          },
          ...(form.header_text ? [{ type: "HEADER", format: "TEXT", text: form.header_text }] : []),
          { type: "FOOTER", text: DEFAULT_FOOTER }
        ],
      };

      const { data, error } = await supabase.functions.invoke("meta-whatsapp-templates", {
        method: "POST",
        body: payload,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error.message || data.error);

      toast({
        title: "Success",
        description: initialData ? "Template edited in Meta." : "Template pushed to Meta.",
      });

      onCreated?.();
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to create/edit template",
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
            <Plus className="h-5 w-5 text-blue-600" />
            {initialData ? "Edit Meta Template" : "Create Meta Template"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="display_name">Template Name *</Label>
                <Input
                  id="display_name"
                  value={form.display_name}
                  onChange={(e) => handleDisplayNameChange(e.target.value)}
                  placeholder="e.g., promo_offer"
                  className="mt-1"
                  disabled={!!initialData} // Name cannot be changed on edit
                />
                <p className="text-xs text-gray-500 mt-1">
                  Slug: <code className="text-xs">{form.name || "auto-generated"}</code>
                </p>
              </div>
              <div>
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((prev) => ({ ...prev, category: v }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTILITY">Utility (~₹0.12/msg)</SelectItem>
                    <SelectItem value="MARKETING">Marketing (~₹0.90/msg)</SelectItem>
                    <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="header_text">Header (Optional)</Label>
              <Input
                id="header_text"
                value={form.header_text}
                onChange={(e) => setForm((prev) => ({ ...prev, header_text: e.target.value }))}
                placeholder="e.g., Order Confirmation"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="body">Message Body *</Label>
              <Textarea
                id="body"
                value={form.body}
                onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
                placeholder="Hi {{customer_name}}, thank you for visiting!"
                rows={6}
                className="mt-1 font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use variables like {"{{customer_name}}"}. They will be converted to {"{{1}}"} for Meta automatically.
              </p>
            </div>

            <div>
              <Label className="text-sm mb-2 block">Insert Variables (Name type)</Label>
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
                          ? "bg-blue-100 text-blue-700 border border-blue-300 cursor-default"
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

            {variables.length > 0 && (
              <div>
                <Label className="text-sm mb-2 block">Active Variables ({variables.length})</Label>
                <div className="space-y-1">
                  {variables.map((v) => (
                    <div key={v.name} className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 rounded px-3 py-1.5">
                      <span className="text-sm">
                        <code className="text-blue-600">{`{{${v.name}}}`}</code>
                        <span className="text-gray-400 ml-2">(sample: {v.sample})</span>
                      </span>
                      <button onClick={() => removeVariable(v.name)} className="text-red-400 hover:text-red-600">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label className="flex items-center gap-1.5">
                Footer
                <Lock className="h-3 w-3 text-amber-500" />
              </Label>
              <div className="mt-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 border rounded-md text-sm text-gray-600 flex items-center gap-2">
                <span>{DEFAULT_FOOTER}</span>
                <span className="text-xs text-amber-500 ml-auto">Admin-only</span>
              </div>
            </div>
          </div>

          <div>
            <Label className="text-sm mb-2 block flex items-center gap-2">
              <Eye className="h-4 w-4" />
              WhatsApp Preview
            </Label>
            <div className="bg-[#E5DDD5] dark:bg-gray-800 rounded-2xl p-4 min-h-[400px] flex flex-col">
              <div className="bg-[#075E54] text-white rounded-t-xl px-4 py-3 -mt-4 -mx-4 mb-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm">🏪</div>
                <div>
                  <p className="font-medium text-sm">Business Name</p>
                  <p className="text-xs text-green-200">Verified Business</p>
                </div>
              </div>

              <div className="flex-1 flex flex-col justify-end">
                <div className="bg-white dark:bg-gray-700 rounded-lg p-3 max-w-[85%] shadow-sm relative ml-auto">
                  {form.header_text && (
                    <p className="font-bold text-sm text-gray-900 dark:text-gray-100 mb-1">{form.header_text}</p>
                  )}
                  <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                    {getPreviewText() || <span className="text-gray-400 italic">Start typing your message...</span>}
                  </p>
                  <p className="text-xs text-gray-500 mt-2 border-t pt-1">{DEFAULT_FOOTER}</p>
                  <p className="text-[10px] text-gray-400 text-right mt-1">
                    {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ✓✓
                  </p>
                  <div className="absolute -right-2 top-0 w-0 h-0 border-l-8 border-l-white dark:border-l-gray-700 border-t-8 border-t-transparent" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <StandardizedButton variant="secondary" onClick={() => onOpenChange(false)} className="flex-1">
            Cancel
          </StandardizedButton>
          <StandardizedButton
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Submit to Meta
          </StandardizedButton>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateMetaTemplateDialog;
