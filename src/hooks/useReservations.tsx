
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TableReservation, ReservationFormData } from '@/types/reservations';

export const useReservations = () => {
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch restaurant ID
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

  // Fetch reservations
  const { data: reservations = [], isLoading } = useQuery({
    queryKey: ['table-reservations', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      
      const { data, error } = await supabase
        .from('table_reservations')
        .select(`
          *,
          restaurant_tables(name, capacity)
        `)
        .eq('restaurant_id', restaurantId)
        .order('reservation_date', { ascending: false })
        .order('reservation_time', { ascending: false });

      if (error) throw error;
      return data as (TableReservation & { restaurant_tables: { name: string; capacity: number } })[];
    },
    enabled: !!restaurantId,
  });

  // Create reservation mutation
  const createReservation = useMutation({
    mutationFn: async (data: ReservationFormData & { table_id: string }) => {
      if (!restaurantId) throw new Error('No restaurant ID');

      const { error } = await supabase
        .from('table_reservations')
        .insert([{
          ...data,
          restaurant_id: restaurantId,
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast({
        title: 'Success',
        description: 'Reservation created successfully',
      });
    },
    onError: (error) => {
      console.error('Error creating reservation:', error);
      toast({
        title: 'Error',
        description: 'Failed to create reservation',
        variant: 'destructive',
      });
    },
  });

  // Update reservation status mutation
  const updateReservationStatus = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: TableReservation['status']; notes?: string }) => {
      const updateData: any = { status };
      
      if (status === 'seated') {
        updateData.arrival_time = new Date().toISOString();
      } else if (status === 'completed') {
        updateData.departure_time = new Date().toISOString();
      }
      
      if (notes !== undefined) {
        updateData.notes = notes;
      }

      const { error } = await supabase
        .from('table_reservations')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast({
        title: 'Success',
        description: 'Reservation updated successfully',
      });
    },
    onError: (error) => {
      console.error('Error updating reservation:', error);
      toast({
        title: 'Error',
        description: 'Failed to update reservation',
        variant: 'destructive',
      });
    },
  });

  // Delete reservation mutation
  const deleteReservation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('table_reservations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast({
        title: 'Success',
        description: 'Reservation deleted successfully',
      });
    },
    onError: (error) => {
      console.error('Error deleting reservation:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete reservation',
        variant: 'destructive',
      });
    },
  });

  return {
    reservations,
    isLoading,
    createReservation,
    updateReservationStatus,
    deleteReservation,
    restaurantId,
  };
};
