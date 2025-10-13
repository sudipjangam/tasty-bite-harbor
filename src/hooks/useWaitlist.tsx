import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface WaitlistEntry {
  id: string;
  restaurant_id: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  party_size: number;
  status: 'waiting' | 'seated' | 'cancelled' | 'no_show';
  priority: number;
  estimated_wait_time?: number;
  check_in_time: string;
  seated_time?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const useWaitlist = () => {
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchRestaurantId = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('restaurant_id')
          .eq('id', user.id)
          .single();

        if (profile?.restaurant_id) {
          setRestaurantId(profile.restaurant_id);
        }
      } catch (error) {
        console.error('Error fetching restaurant ID:', error);
      }
    };

    fetchRestaurantId();
  }, []);

  const { data: waitlist = [], isLoading } = useQuery({
    queryKey: ['waitlist', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      
      const { data, error } = await supabase
        .from('waitlist')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('priority', { ascending: false })
        .order('check_in_time', { ascending: true });

      if (error) throw error;
      return data as WaitlistEntry[];
    },
    enabled: !!restaurantId,
  });

  const addToWaitlist = useMutation({
    mutationFn: async (data: Omit<WaitlistEntry, 'id' | 'restaurant_id' | 'created_at' | 'updated_at' | 'check_in_time'>) => {
      if (!restaurantId) throw new Error('No restaurant ID');

      const { error } = await supabase
        .from('waitlist')
        .insert([{
          ...data,
          restaurant_id: restaurantId,
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
      toast({
        title: 'Success',
        description: 'Added to waitlist successfully',
      });
    },
    onError: (error) => {
      console.error('Error adding to waitlist:', error);
      toast({
        title: 'Error',
        description: 'Failed to add to waitlist',
        variant: 'destructive',
      });
    },
  });

  const updateWaitlistStatus = useMutation({
    mutationFn: async ({ id, status, seated_time }: { id: string; status: WaitlistEntry['status']; seated_time?: string }) => {
      const updateData: any = { status };
      
      if (status === 'seated' && !seated_time) {
        updateData.seated_time = new Date().toISOString();
      } else if (seated_time) {
        updateData.seated_time = seated_time;
      }

      const { error } = await supabase
        .from('waitlist')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
      toast({
        title: 'Success',
        description: 'Waitlist updated successfully',
      });
    },
    onError: (error) => {
      console.error('Error updating waitlist:', error);
      toast({
        title: 'Error',
        description: 'Failed to update waitlist',
        variant: 'destructive',
      });
    },
  });

  const deleteFromWaitlist = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('waitlist')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
      toast({
        title: 'Success',
        description: 'Removed from waitlist',
      });
    },
    onError: (error) => {
      console.error('Error deleting from waitlist:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove from waitlist',
        variant: 'destructive',
      });
    },
  });

  return {
    waitlist,
    isLoading,
    addToWaitlist,
    updateWaitlistStatus,
    deleteFromWaitlist,
    restaurantId,
  };
};
