import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StandardizedCard } from "@/components/ui/standardized-card";
import { StandardizedButton } from "@/components/ui/standardized-button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Star, Plus, Eye, CheckCircle } from "lucide-react";
import { useRestaurantId } from "@/hooks/useRestaurantId";

interface GuestFeedback {
  id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  feedback_type: string;
  rating: number;
  title: string;
  comment: string;
  is_complaint: boolean;
  status: string;
  created_at: string;
  rooms?: { name: string };
}

const statusColors = {
  new: "bg-blue-100 text-blue-800",
  acknowledged: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-purple-100 text-purple-800",
  resolved: "bg-green-100 text-green-800",
};

const feedbackTypeColors = {
  service: "bg-blue-100 text-blue-800",
  food: "bg-orange-100 text-orange-800",
  room: "bg-green-100 text-green-800",
  facilities: "bg-purple-100 text-purple-800",
  overall: "bg-gray-100 text-gray-800",
};

const GuestFeedback = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<GuestFeedback | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { restaurantId } = useRestaurantId();

  const { data: feedback = [], isLoading } = useQuery({
    queryKey: ["guest-feedback", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];

      const { data, error } = await supabase
        .from("guest_feedback")
        .select(`
          *,
          rooms(name)
        `)
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as GuestFeedback[];
    },
    enabled: !!restaurantId,
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];

      const { data, error } = await supabase
        .from("rooms")
        .select("id, name")
        .eq("restaurant_id", restaurantId);

      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });

  const createFeedbackMutation = useMutation({
    mutationFn: async (feedbackData: any) => {
      const { error } = await supabase
        .from("guest_feedback")
        .insert([{ ...feedbackData, restaurant_id: restaurantId }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guest-feedback"] });
      setIsDialogOpen(false);
      toast({ title: "Feedback recorded successfully" });
    },
    onError: (error) => {
      toast({
        title: "Error recording feedback",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updateData: any = { status };
      
      if (status === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("guest_feedback")
        .update(updateData)
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guest-feedback"] });
      toast({ title: "Feedback status updated successfully" });
    },
    onError: (error) => {
      toast({
        title: "Error updating status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const feedbackData = {
      guest_name: formData.get("guest_name"),
      guest_email: formData.get("guest_email"),
      guest_phone: formData.get("guest_phone"),
      room_id: formData.get("room_id") || null,
      feedback_type: formData.get("feedback_type"),
      rating: parseInt(formData.get("rating") as string),
      title: formData.get("title"),
      comment: formData.get("comment"),
      is_complaint: formData.get("is_complaint") === "on",
    };

    createFeedbackMutation.mutate(feedbackData);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? "text-yellow-400 fill-current" : "text-gray-300"
        }`}
      />
    ));
  };

  if (isLoading) {
    return <div>Loading guest feedback...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Guest Feedback</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <StandardizedButton>
              <Plus className="h-4 w-4 mr-2" />
              Add Feedback
            </StandardizedButton>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Record Guest Feedback</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="guest_name">Guest Name</Label>
                  <Input
                    id="guest_name"
                    name="guest_name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="guest_phone">Phone</Label>
                  <Input
                    id="guest_phone"
                    name="guest_phone"
                    type="tel"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="guest_email">Email</Label>
                <Input
                  id="guest_email"
                  name="guest_email"
                  type="email"
                />
              </div>
              <div>
                <Label htmlFor="room_id">Room (Optional)</Label>
                <Select name="room_id">
                  <SelectTrigger>
                    <SelectValue placeholder="Select room" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="feedback_type">Type</Label>
                  <Select name="feedback_type" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="service">Service</SelectItem>
                      <SelectItem value="food">Food</SelectItem>
                      <SelectItem value="room">Room</SelectItem>
                      <SelectItem value="facilities">Facilities</SelectItem>
                      <SelectItem value="overall">Overall</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="rating">Rating</Label>
                  <Select name="rating" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Rating" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Star</SelectItem>
                      <SelectItem value="2">2 Stars</SelectItem>
                      <SelectItem value="3">3 Stars</SelectItem>
                      <SelectItem value="4">4 Stars</SelectItem>
                      <SelectItem value="5">5 Stars</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="Brief summary of feedback"
                />
              </div>
              <div>
                <Label htmlFor="comment">Comment</Label>
                <Textarea
                  id="comment"
                  name="comment"
                  placeholder="Detailed feedback"
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_complaint"
                  name="is_complaint"
                  className="rounded"
                />
                <Label htmlFor="is_complaint">This is a complaint</Label>
              </div>
              <StandardizedButton type="submit" className="w-full">
                Record Feedback
              </StandardizedButton>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {feedback.map((item) => (
          <StandardizedCard key={item.id} className="p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold">{item.guest_name}</h3>
                <div className="flex items-center gap-1 mt-1">
                  {renderStars(item.rating)}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Badge className={feedbackTypeColors[item.feedback_type as keyof typeof feedbackTypeColors]}>
                  {item.feedback_type.toUpperCase()}
                </Badge>
                <Badge className={statusColors[item.status as keyof typeof statusColors]}>
                  {item.status.replace('_', ' ').toUpperCase()}
                </Badge>
                {item.is_complaint && (
                  <Badge variant="destructive">Complaint</Badge>
                )}
              </div>
            </div>
            
            {item.title && (
              <h4 className="font-medium mb-2">{item.title}</h4>
            )}
            
            <p className="text-sm text-gray-600 line-clamp-3 mb-3">{item.comment}</p>
            
            <div className="text-xs text-gray-500 mb-3">
              {new Date(item.created_at).toLocaleDateString()}
              {item.rooms && ` • ${item.rooms.name}`}
            </div>

            <div className="flex gap-2">
              {item.status === 'new' && (
                <StandardizedButton
                  size="sm"
                  variant="secondary"
                  onClick={() => updateStatusMutation.mutate({ id: item.id, status: 'acknowledged' })}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Acknowledge
                </StandardizedButton>
              )}
              {(item.status === 'acknowledged' || item.status === 'in_progress') && (
                <StandardizedButton
                  size="sm"
                  onClick={() => updateStatusMutation.mutate({ id: item.id, status: 'resolved' })}
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Resolve
                </StandardizedButton>
              )}
            </div>
          </StandardizedCard>
        ))}
      </div>

      {feedback.length === 0 && (
        <div className="text-center py-8">
          <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No feedback received yet. Guest feedback will appear here.</p>
        </div>
      )}
    </div>
  );
};

export default GuestFeedback;
