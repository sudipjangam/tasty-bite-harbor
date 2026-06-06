import React, { useState, useEffect } from "react";
import { StandardizedCard } from "@/components/ui/standardized-card";
import { StandardizedButton } from "@/components/ui/standardized-button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface MetaTemplate {
  name: string;
  language: string;
  category: string;
  status: string;
  components: any[];
  id: string;
}

export function MetaTemplateManager() {
  const [templates, setTemplates] = useState<MetaTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const { toast } = useToast();

  const [newTemplate, setNewTemplate] = useState({
    name: "",
    category: "MARKETING",
    language: "en",
    body: "",
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("meta-whatsapp-templates", {
        method: "GET",
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error.message || data.error);
      setTemplates(data.data || []);
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error fetching Meta templates",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const payload = {
        name: newTemplate.name.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
        category: newTemplate.category,
        language: newTemplate.language,
        components: [
          {
            type: "BODY",
            text: newTemplate.body,
          },
        ],
      };

      const { data, error } = await supabase.functions.invoke("meta-whatsapp-templates", {
        method: "POST",
        body: payload,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error.message || data.error);

      toast({ title: "Template Created", description: "Successfully sent to Meta." });
      setIsDialogOpen(false);
      setNewTemplate({ name: "", category: "MARKETING", language: "en", body: "" });
      fetchTemplates();
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Create Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Delete template ${name}?`)) return;
    setIsDeleting(name);
    try {
      const { data, error } = await supabase.functions.invoke(
        `meta-whatsapp-templates?name=${name}`,
        {
          method: "DELETE",
        }
      );

      if (error) throw error;
      if (data?.error) throw new Error(data.error.message || data.error);

      toast({ title: "Template Deleted", description: "Removed from Meta." });
      fetchTemplates();
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Delete Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</Badge>;
      case "REJECTED":
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      case "PENDING":
        return <Badge className="bg-orange-100 text-orange-800"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Meta Active Templates</h2>
          <p className="text-sm text-gray-500">Templates currently living in Meta Business Manager</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <StandardizedButton className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4" /> Create Template
            </StandardizedButton>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Meta Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Template Name (lowercase, underscores)</Label>
                <Input
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  placeholder="e.g. promo_offer"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={newTemplate.category}
                    onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                  >
                    <option value="MARKETING">Marketing</option>
                    <option value="UTILITY">Utility</option>
                    <option value="AUTHENTICATION">Authentication</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Input
                    value={newTemplate.language}
                    onChange={(e) => setNewTemplate({ ...newTemplate, language: e.target.value })}
                    placeholder="e.g. en"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Body Text</Label>
                <Textarea
                  value={newTemplate.body}
                  onChange={(e) => setNewTemplate({ ...newTemplate, body: e.target.value })}
                  placeholder="Use {{1}}, {{2}} for variables"
                  rows={4}
                />
              </div>
              <StandardizedButton
                onClick={handleCreate}
                disabled={isCreating || !newTemplate.name || !newTemplate.body}
                className="w-full mt-4"
              >
                {isCreating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Submit to Meta
              </StandardizedButton>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      ) : templates.length === 0 ? (
        <StandardizedCard className="p-8 text-center text-gray-500">
          No templates found in Meta Business Manager.
        </StandardizedCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tpl) => {
            const bodyComponent = tpl.components?.find((c: any) => c.type === "BODY");
            const headerComponent = tpl.components?.find((c: any) => c.type === "HEADER");

            return (
              <StandardizedCard key={tpl.id} className="p-5 flex flex-col h-full">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white break-all">
                      {tpl.name}
                    </h3>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">{tpl.category}</Badge>
                      <Badge variant="outline" className="text-xs">{tpl.language}</Badge>
                    </div>
                  </div>
                  {getStatusBadge(tpl.status)}
                </div>

                <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-lg p-3 my-3 font-mono text-sm">
                  {headerComponent?.text && <p className="font-bold mb-1">{headerComponent.text}</p>}
                  <p className="whitespace-pre-wrap">{bodyComponent?.text || "No body"}</p>
                </div>

                <div className="mt-auto flex justify-end">
                  <StandardizedButton
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(tpl.name)}
                    disabled={isDeleting === tpl.name}
                  >
                    {isDeleting === tpl.name ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <><Trash2 className="w-4 h-4 mr-1" /> Delete</>
                    )}
                  </StandardizedButton>
                </div>
              </StandardizedCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
