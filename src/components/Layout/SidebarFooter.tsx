
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  staffName: string | null;
}

export const SidebarFooter = ({ staffName }: Props) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/auth");
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
    } catch (error) {
      console.error("Sign out error:", error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="border-t border-sidebar-border p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-sidebar-purple font-medium">
          {staffName ? staffName.charAt(0) : "?"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate text-white">
            {staffName || "Loading..."}
          </p>
          <p className="text-xs text-white/70 truncate">Staff Member</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSignOut}
          title="Sign Out"
          className="text-white hover:bg-sidebar-purple-dark"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
