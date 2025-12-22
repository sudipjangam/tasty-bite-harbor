import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { fetchAllowedComponents } from '@/utils/subscriptionUtils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Settings, Shield, ChefHat, Users, BarChart3, DollarSign, Package, Calendar, Home, Wrench } from 'lucide-react';

interface Role {
  id: string;
  name: string;
  description: string | null;
  is_deletable: boolean;
}

interface EditRoleDialogProps {
  role: Role;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface AppComponent {
  id: string;
  name: string;
  description: string | null;
}

// Component category mapping
const componentCategories: Record<string, { icon: any; label: string; color: string }> = {
  'Operations': { icon: ChefHat, label: 'Operations', color: 'from-orange-500 to-amber-500' },
  'Management': { icon: Users, label: 'Management', color: 'from-blue-500 to-indigo-500' },
  'Analytics': { icon: BarChart3, label: 'Analytics & Reports', color: 'from-purple-500 to-violet-500' },
  'Financial': { icon: DollarSign, label: 'Financial', color: 'from-emerald-500 to-green-500' },
  'Inventory': { icon: Package, label: 'Inventory & Supplies', color: 'from-teal-500 to-cyan-500' },
  'Reservations': { icon: Calendar, label: 'Reservations & Rooms', color: 'from-rose-500 to-pink-500' },
  'Settings': { icon: Settings, label: 'Settings & Security', color: 'from-slate-500 to-gray-500' },
};

const getComponentCategory = (name: string): string => {
  const n = name.toLowerCase();
  if (['pos', 'orders', 'kitchen', 'tables', 'menu'].some(k => n.includes(k))) return 'Operations';
  if (['staff', 'user', 'role', 'customers', 'crm', 'marketing'].some(k => n.includes(k))) return 'Management';
  if (['analytics', 'reports', 'dashboard', 'ai'].some(k => n.includes(k))) return 'Analytics';
  if (['financial', 'expenses', 'invoice', 'billing'].some(k => n.includes(k))) return 'Financial';
  if (['inventory', 'suppliers', 'recipes'].some(k => n.includes(k))) return 'Inventory';
  if (['reservations', 'rooms', 'housekeeping', 'channel'].some(k => n.includes(k))) return 'Reservations';
  if (['settings', 'security', 'audit', 'backup', 'gdpr'].some(k => n.includes(k))) return 'Settings';
  return 'Management';
};

export const EditRoleDialog = ({ role, open, onOpenChange, onSuccess }: EditRoleDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description || '');
  const [selectedComponents, setSelectedComponents] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch components filtered by restaurant subscription
  const { data: components, isLoading: componentsLoading } = useQuery({
    queryKey: ['app-components-filtered', user?.restaurant_id],
    queryFn: async () => {
      if (!user?.restaurant_id) return [];
      
      // Get subscription plan components
      const subscriptionComponents = await fetchAllowedComponents(user.restaurant_id);
      
      // Fetch all app_components
      const { data, error } = await supabase
        .from('app_components')
        .select('*')
        .order('name');

      if (error) throw error;
      
      // Filter to only show components the restaurant has access to
      return (data as AppComponent[]).filter(c => 
        subscriptionComponents.some(sc => 
          sc.toLowerCase() === c.name.toLowerCase()
        )
      );
    },
    enabled: open && !!user?.restaurant_id,
  });

  // Fetch current role components
  const { data: roleComponents, isLoading: roleComponentsLoading } = useQuery({
    queryKey: ['role-components', role.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_components')
        .select('component_id')
        .eq('role_id', role.id);

      if (error) throw error;
      return data.map((rc) => rc.component_id);
    },
    enabled: open,
  });

  // Group components by category
  const groupedComponents = useMemo(() => {
    if (!components) return {};
    const groups: Record<string, AppComponent[]> = {};
    components.forEach(comp => {
      const cat = getComponentCategory(comp.name);
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(comp);
    });
    return groups;
  }, [components]);

  useEffect(() => {
    if (roleComponents) {
      setSelectedComponents(roleComponents);
    }
  }, [roleComponents]);

  useEffect(() => {
    if (open) {
      setName(role.name);
      setDescription(role.description || '');
    }
  }, [open, role]);

  const handleToggleComponent = (componentId: string) => {
    setSelectedComponents((prev) =>
      prev.includes(componentId)
        ? prev.filter((id) => id !== componentId)
        : [...prev, componentId]
    );
  };

  /* Added useQueryClient to invalidate cache */
  const queryClient = useQueryClient();

  const handleSelectAll = (category: string) => {
    const categoryComponents = groupedComponents[category] || [];
    const allSelected = categoryComponents.every(c => selectedComponents.includes(c.id));
    
    if (allSelected) {
      setSelectedComponents(prev => prev.filter(id => !categoryComponents.find(c => c.id === id)));
    } else {
      const newIds = categoryComponents.map(c => c.id);
      setSelectedComponents(prev => [...new Set([...prev, ...newIds])]);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({ title: 'Validation Error', description: 'Role name is required', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error('You must be signed in to perform this action.');

      console.log("Updating role with components:", selectedComponents);

      const { data, error } = await supabase.functions.invoke('role-management', {
        body: JSON.stringify({
          action: 'update',
          id: role.id,
          name: name.trim(),
          description: description.trim() || null,
          componentIds: selectedComponents,
        }),
      });

      if (error) throw error;
      if (data.success) {
        // Invalidate the cache so next time we open this, it fetches fresh data
        await queryClient.invalidateQueries({ queryKey: ['role-components', role.id] });
        // Also invalidate lists that might depend on this
        await queryClient.invalidateQueries({ queryKey: ['roles'] });
        
        toast({ title: 'Success', description: 'Role updated successfully' });
        onSuccess();
      } else {
        throw new Error(data.error || 'Failed to update role');
      }
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast({ title: 'Error', description: error.message || 'Failed to update role', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = componentsLoading || roleComponentsLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-white/20 dark:border-gray-700/50">
        <DialogHeader className="pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">Edit Role: {role.name}</DialogTitle>
              <DialogDescription className="text-sm">
                Configure role details and component permissions
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">Role Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Housekeeper, Front Desk"
                disabled={!role.is_deletable}
                className="bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
              />
              {!role.is_deletable && (
                <p className="text-xs text-amber-600">System roles cannot be renamed</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this role"
                rows={2}
                className="bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Component Access</Label>
              <span className="text-xs text-muted-foreground">
                {selectedComponents.length} / {components?.length || 0} selected
              </span>
            </div>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <ScrollArea className="h-[350px] border rounded-xl p-4 bg-gray-50/50 dark:bg-gray-800/30">
                <div className="space-y-6">
                  {Object.entries(groupedComponents).map(([category, comps]) => {
                    const catInfo = componentCategories[category] || componentCategories['Management'];
                    const Icon = catInfo.icon;
                    const allSelected = comps.every(c => selectedComponents.includes(c.id));
                    const someSelected = comps.some(c => selectedComponents.includes(c.id));
                    
                    return (
                      <div key={category} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`h-6 w-6 rounded-lg bg-gradient-to-br ${catInfo.color} flex items-center justify-center`}>
                              <Icon className="h-3.5 w-3.5 text-white" />
                            </div>
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                              {catInfo.label}
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSelectAll(category)}
                            className="text-xs h-7"
                          >
                            {allSelected ? 'Deselect All' : 'Select All'}
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-2">
                          {comps.map((component) => (
                            <div
                              key={component.id}
                              className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all cursor-pointer ${
                                selectedComponents.includes(component.id)
                                  ? 'bg-primary/5 border-primary/30 dark:bg-primary/10'
                                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300'
                              }`}
                              onClick={() => handleToggleComponent(component.id)}
                            >
                              <Checkbox
                                id={component.id}
                                checked={selectedComponents.includes(component.id)}
                                onCheckedChange={() => handleToggleComponent(component.id)}
                                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                              />
                              <div className="flex-1 min-w-0">
                                <label
                                  htmlFor={component.id}
                                  className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer"
                                >
                                  {component.name}
                                </label>
                                {component.description && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    {component.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || isLoading}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/25"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Role'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};