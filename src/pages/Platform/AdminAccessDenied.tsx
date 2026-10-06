import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldX, LogOut, Store } from "lucide-react";
import { getMainAppUrl } from "@/utils/subdomain";

export const AdminAccessDenied: React.FC = () => {
  const { user, signOut } = useAuth();

  const handleReturnToApp = () => {
    window.location.href = getMainAppUrl("/");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative">
      <div className="w-full max-w-md z-10 space-y-6">
        <Card className="border-red-950/60 bg-slate-900/90 backdrop-blur-xl shadow-2xl">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-950/80 border border-red-800/80 flex items-center justify-center mb-3">
              <ShieldX className="w-8 h-8 text-red-500" />
            </div>
            <CardTitle className="text-xl font-bold text-slate-100">
              Access Restricted
            </CardTitle>
            <CardDescription className="text-sm text-slate-400">
              This subdomain is dedicated strictly to Platform Administrators.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 text-center">
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-400 space-y-1">
              <div>
                <span className="text-slate-500">Logged in as:</span>{" "}
                <span className="text-slate-200 font-mono">{user?.email || "Unknown"}</span>
              </div>
              <div>
                <span className="text-slate-500">Current Role:</span>{" "}
                <span className="text-amber-400 font-medium capitalize">
                  {user?.role || "Non-admin"}
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-400">
              Your account does not possess global administrative privileges to access the Platform Command Center.
            </p>
          </CardContent>

          <CardFooter className="flex flex-col gap-2 pt-2 border-t border-slate-800">
            <Button
              onClick={handleReturnToApp}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium gap-2 text-sm h-10"
            >
              <Store className="w-4 h-4" /> Go to Restaurant App
            </Button>
            <Button
              variant="outline"
              onClick={() => signOut()}
              className="w-full border-slate-800 text-slate-300 hover:bg-slate-850 hover:text-white gap-2 text-sm h-10"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default AdminAccessDenied;
