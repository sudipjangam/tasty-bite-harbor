import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TableAvailabilitySlot {
  id: string;
  restaurant_id: string;
  table_id: string;
  date: string;
  time_slot: string;
  is_available: boolean;
  reservation_id?: string;
  created_at: string;
  updated_at: string;
}

export const useTableAvailability = (selectedDate?: Date) => {
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

  const dateStr = selectedDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0];

  const { data: availabilityData = [], isLoading } = useQuery({
    queryKey: ['table-availability', restaurantId, dateStr],
    queryFn: async () => {
      if (!restaurantId) return [];
      
      const { data, error } = await supabase
        .from('table_availability_slots')
        .select(`
          *,
          restaurant_tables(name, capacity)
        `)
        .eq('restaurant_id', restaurantId)
        .eq('date', dateStr)
        .order('time_slot', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });

  const generateTimeSlots = useMutation({
    mutationFn: async ({ date, tableIds }: { date: string; tableIds: string[] }) => {
      if (!restaurantId) throw new Error('No restaurant ID');

      // Generate slots from 9 AM to 9 PM every 30 minutes
      const slots = [];
      for (let hour = 9; hour < 21; hour++) {
        for (let minute of [0, 30]) {
          const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
          
          for (const tableId of tableIds) {
            slots.push({
              restaurant_id: restaurantId,
              table_id: tableId,
              date,
              time_slot: time,
              is_available: true,
            });
          }
        }
      }

      const { error } = await supabase
        .from('table_availability_slots')
        .upsert(slots, { 
          onConflict: 'restaurant_id,table_id,date,time_slot',
          ignoreDuplicates: false 
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-availability'] });
      toast({
        title: 'Success',
        description: 'Availability slots generated',
      });
    },
    onError: (error) => {
      console.error('Error generating slots:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate availability slots',
        variant: 'destructive',
      });
    },
  });

  return {
    availabilityData,
    isLoading,
    generateTimeSlots,
    restaurantId,
  };
};
