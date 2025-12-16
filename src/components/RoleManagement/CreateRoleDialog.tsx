import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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

interface CreateRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface AppComponent {
  id: string;
  name: string;
  description: string | null;
}

export const CreateRoleDialog = ({ open, onOpenChange, onSuccess }: CreateRoleDialogProps) => {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedComponents, setSelectedComponents] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch all available components
  const { data: components } = useQuery({
    queryKey: ['app-components'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_components')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as AppComponent[];
    },
  });

  const handleToggleComponent = (componentId: string) => {
    setSelectedComponents((prev) =>
      prev.includes(componentId)
        ? prev.filter((id) => id !== componentId)
        : [...prev, componentId]
    );
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Role name is required',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Validate session to ensure supabase-js will attach the auth token automatically
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Session error:', sessionError);
        throw new Error('Failed to get authentication session: ' + sessionError.message);
      }

      if (!sessionData.session?.access_token) {
        console.error('No access token found in session');
        throw new Error('You must be signed in to perform this action.');
      }

      // Prepare payload and add rich client-side logs
      const payload = {
        action: 'create',
        name: name.trim(),
        description: (description || '').trim() || null,
        componentIds: selectedComponents,
      };
      console.log('CreateRoleDialog → sending payload', {
        ...payload,
        componentCount: selectedComponents.length,
      });

      // Use supabase.functions.invoke with JSON-stringified body
      const { data, error } = await supabase.functions.invoke('role-management', {
        body: JSON.stringify(payload),
      });

      console.log('Function response:', { data, error });

      if (error) {
        console.error('Function invocation error:', error);
        throw error;
      }

      if (data?.success) {
        toast({
          title: 'Success',
          description: 'Role created successfully',
        });
        setName('');
        setDescription('');
        setSelectedComponents([]);
        onSuccess();
        onOpenChange(false);
      } else {
        throw new Error(data?.error || 'Failed to create role');
      }
    } catch (error: any) {
      console.error('Error creating role:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create role. Please check the console for details.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Create New Role</DialogTitle>
          <DialogDescription>
            Define a new role with specific component access permissions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Role Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Housekeeper, Front Desk"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this role"
              rows={3}
            />
          </div>

          <div>
            <Label>Component Access</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Select which modules this role can access
            </p>
            <ScrollArea className="h-[300px] border rounded-md p-4">
              <div className="space-y-3">
                {components?.map((component) => (
                  <div key={component.id} className="flex items-start space-x-3">
                    <Checkbox
                      id={component.id}
                      checked={selectedComponents.includes(component.id)}
                      onCheckedChange={() => handleToggleComponent(component.id)}
                    />
                    <div className="flex-1">
                      <label
                        htmlFor={component.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {component.name}
                      </label>
                      {component.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {component.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Role'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};