import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldAlert, ShieldCheck, Lock, Mail, ArrowRight, Store, AlertCircle, Loader2 } from "lucide-react";
import { getMainAppUrl } from "@/utils/subdomain";
import { toast } from "sonner";

export const AdminPortalAuth: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAdminSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error("Authentication failed. No user returned.");
      }

      // Check user role in profiles
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("role, role_name_text")
        .eq("id", data.user.id)
        .single();

      if (profileErr) {
        console.error("Profile check error:", profileErr);
      }

      const isAdmin = profile?.role === "admin";

      if (!isAdmin) {
        // Not a platform admin - user will be caught by route guard or redirected
        toast.warning("Access restricted: You do not have Platform Admin privileges.");
        navigate("/platform/access-denied");
        return;
      }

      toast.success("Welcome back, Administrator");
      navigate("/platform");
    } catch (err: any) {
      console.error("Admin sign in error:", err);
      setErrorMsg(err.message || "Invalid administrative credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background radial effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-600/15 blur-[100px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md z-10 space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 shadow-xl shadow-purple-500/20 border border-purple-400/30 mb-2">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            Platform Command Center
          </h1>
          <p className="text-sm text-slate-400">
            Swadeshi Solutions • Enterprise Platform Admin
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg text-slate-100 flex items-center gap-2">
              <Lock className="w-4 h-4 text-purple-400" /> Administrative Sign In
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Restricted portal. All administrative sessions are audited and logged.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {errorMsg && (
              <Alert variant="destructive" className="mb-4 bg-red-950/50 border-red-800 text-red-200">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-xs">{errorMsg}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleAdminSignIn} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium text-slate-300">
                  Admin Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@swadeshisolutions.co.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="pl-9 bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-purple-500 text-sm h-10"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-medium text-slate-300">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="pl-9 bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-purple-500 text-sm h-10"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-10 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium shadow-lg shadow-purple-600/30 transition-all text-sm gap-2 mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Verifying Access...
                  </>
                ) : (
                  <>
                    Authorize & Enter <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="pt-2 border-t border-slate-800/80 flex flex-col gap-3">
            <div className="flex items-center justify-between w-full text-xs text-slate-400">
              <span className="flex items-center gap-1.5 text-slate-500">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                IP: Monitored
              </span>
              <a
                href={getMainAppUrl("/")}
                className="text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
              >
                <Store className="w-3.5 h-3.5" /> Restaurant Portal
              </a>
            </div>
          </CardFooter>
        </Card>

        {/* Security watermark footer */}
        <p className="text-center text-xs text-slate-600">
          Unauthorized access attempts are prohibited and monitored.
        </p>
      </div>
    </div>
  );
};

export default AdminPortalAuth;
