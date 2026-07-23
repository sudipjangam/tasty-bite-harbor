import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Volume2,
  VolumeX,
  Maximize2,
  LogOut,
  ChevronLeft,
  Tv,
  Keyboard,
  Grid,
  Loader2,
  Play,
  RotateCw,
} from "lucide-react";
import { useKitchenSounds } from "@/hooks/useKitchenSounds";
import { useKitchenTVOrders } from "@/hooks/useKitchenTVOrders";
import OrdersColumn from "@/components/Kitchen/OrdersColumn";
import { KitchenOrder } from "@/components/Kitchen/KitchenDisplay";

const TV_AUTH_KEY = "kds_tv_auth";

interface TVAuthSession {
  restaurantId: string;
  restaurantName: string;
  pin?: string;
  isEmailLogin: boolean;
}

const KitchenTV = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<TVAuthSession | null>(null);
  const [authMethod, setAuthMethod] = useState<"pin" | "email">("pin");
  
  // PIN Login State
  const [restaurants, setRestaurants] = useState<{ id: string; name: string }[]>([]);
  const [selectedRestId, setSelectedRestId] = useState<string>("");
  const [pinInput, setPinInput] = useState<string>("");
  const [pinExists, setPinExists] = useState<boolean>(true);
  
  // Setup PIN Flow State
  const [showSetupPinPrompt, setShowSetupPinPrompt] = useState(false);
  const [setupPinRestaurantId, setSetupPinRestaurantId] = useState("");
  const [setupPinRestaurantName, setSetupPinRestaurantName] = useState("");
  const [setupPinStage, setSetupPinStage] = useState<"ask" | "enter" | "confirm">("ask");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  
  // Email Login State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Floating Control Bar State
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // TV View Mode Preferences
  const [fontSizeClass, setFontSizeClass] = useState<"text-base" | "text-lg" | "text-xl">("text-lg");
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  // KDS sounds
  const {
    isAudioEnabled,
    enableAudio,
    disableAudio,
    playReadyChime
  } = useKitchenSounds();

  // Fetch active KDS orders (if PIN-based or authenticated)
  const {
    orders,
    isLoading: isOrdersLoading,
    refetch,
    updateStatus,
    updateItemComplete,
    bumpOrder,
    updatePriority,
    updateOrderItems
  } = useKitchenTVOrders(
    session?.restaurantId || null,
    session?.pin || null
  );

  const checkPinStatus = async (restaurantId: string) => {
    if (!restaurantId) return;
    try {
      const { data, error } = await supabase.rpc("check_kitchen_pin_exists", {
        p_restaurant_id: restaurantId
      });
      if (!error) {
        setPinExists(!!data);
        if (!data) {
          setAuthMethod("email");
        } else {
          setAuthMethod("pin");
        }
      }
    } catch (e) {
      console.warn("Failed to check PIN existence:", e);
    }
  };

  useEffect(() => {
    if (selectedRestId) {
      checkPinStatus(selectedRestId);
    }
  }, [selectedRestId]);

  // Load active session on mount
  useEffect(() => {
    const saved = localStorage.getItem(TV_AUTH_KEY);
    if (saved) {
      try {
        setSession(JSON.parse(saved));
      } catch (e) {
        localStorage.removeItem(TV_AUTH_KEY);
      }
    }

    // Fetch active restaurants for PIN login dropdown
    const fetchRest = async () => {
      try {
        const { data, error } = await supabase.rpc("get_active_restaurants");
        if (error) throw error;
        if (data) {
          setRestaurants(data);
          if (data.length > 0) setSelectedRestId(data[0].id);
        }
      } catch (err) {
        console.error("Failed to load restaurants:", err);
      }
    };
    fetchRest();
  }, []);

  // Handle auto-hiding control bar on mouse movement
  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 5000);
  };

  useEffect(() => {
    if (session) {
      window.addEventListener("mousemove", resetControlsTimeout);
      window.addEventListener("touchstart", resetControlsTimeout);
      resetControlsTimeout();
    }
    return () => {
      window.removeEventListener("mousemove", resetControlsTimeout);
      window.removeEventListener("touchstart", resetControlsTimeout);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [session]);

  const handlePinKeyPress = (num: string) => {
    if (pinInput.length < 4) {
      setPinInput(prev => prev + num);
    }
  };

  const handlePinDelete = () => {
    setPinInput(prev => prev.slice(0, -1));
  };

  const handlePinLogin = async () => {
    if (!selectedRestId || pinInput.length !== 4) {
      toast({
        variant: "destructive",
        title: "Warning",
        description: "Please select a branch and enter a 4-digit PIN."
      });
      return;
    }

    setIsAuthLoading(true);
    try {
      const { data: matched, error } = await supabase.rpc("verify_kitchen_pin", {
        p_restaurant_id: selectedRestId,
        p_pin: pinInput
      });

      if (error) throw error;

      if (matched) {
        const matchedRest = restaurants.find(r => r.id === selectedRestId);
        const newSession: TVAuthSession = {
          restaurantId: selectedRestId,
          restaurantName: matchedRest?.name || "Kitchen Station",
          pin: pinInput,
          isEmailLogin: false
        };
        localStorage.setItem(TV_AUTH_KEY, JSON.stringify(newSession));
        setSession(newSession);
        toast({
          title: "Access Granted",
          description: `Logged in to ${newSession.restaurantName} KDS.`
        });
      } else {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "Incorrect PIN. Please try again."
        });
        setPinInput("");
      }
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Authentication failed. Please verify connection."
      });
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsAuthLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      if (data.user) {
        // Fetch profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("restaurant_id, restaurants(name)")
          .eq("id", data.user.id)
          .single();

        if (profile?.restaurant_id) {
          const restaurantName = (profile.restaurants as any)?.name || "Kitchen Station";
          
          // Check if KDS pin is configured for the restaurant
          const { data: hasPin } = await supabase.rpc("check_kitchen_pin_exists", {
            p_restaurant_id: profile.restaurant_id
          });

          if (!hasPin) {
            // Initiate PIN setup flow
            setSetupPinRestaurantId(profile.restaurant_id);
            setSetupPinRestaurantName(restaurantName);
            setSetupPinStage("ask");
            setNewPin("");
            setConfirmPin("");
            setShowSetupPinPrompt(true);
          } else {
            const newSession: TVAuthSession = {
              restaurantId: profile.restaurant_id,
              restaurantName,
              isEmailLogin: true
            };
            localStorage.setItem(TV_AUTH_KEY, JSON.stringify(newSession));
            setSession(newSession);
            toast({
              title: "Success",
              description: `Authenticated as ${restaurantName} Kitchen staff.`
            });
          }
        } else {
          toast({
            variant: "destructive",
            title: "Profile Error",
            description: "No restaurant profile associated with this account."
          });
        }
      }
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: err instanceof Error ? err.message : "Incorrect credentials."
      });
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(TV_AUTH_KEY);
    if (session?.isEmailLogin) {
      supabase.auth.signOut();
    }
    setSession(null);
    setPinInput("");
    setPassword("");
    toast({
      title: "Logged Out",
      description: "Kitchen TV session ended."
    });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error("Fullscreen error:", err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handleToggleExpand = (orderId: string) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const handleStatusUpdateAndPlay = async (orderId: string, status: KitchenOrder["status"]) => {
    await updateStatus(orderId, status);
    if (status === "ready") {
      playReadyChime();
    }
  };

  // Filter orders by status
  const getOrdersByStatus = (status: KitchenOrder["status"]) => {
    return orders.filter(o => o.status === status);
  };

  if (!session) {
    // Render TV login screen
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4">
        <div className="absolute top-8 flex items-center gap-3">
          <Tv className="w-8 h-8 text-indigo-400" />
          <h1 className="text-3xl font-extrabold tracking-wider bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            TASTYBITE KDS TV
          </h1>
        </div>

        <Card className="w-full max-w-md bg-slate-900 border-slate-800 text-slate-100 p-8 rounded-3xl shadow-2xl mt-12">
          <div className="flex justify-center gap-4 mb-8 bg-slate-950 p-1.5 rounded-2xl border border-slate-800/80">
            <button
              onClick={() => setAuthMethod("pin")}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                authMethod === "pin"
                  ? "bg-indigo-600 text-white shadow-lg"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Keyboard className="w-4 h-4" />
              Quick PIN Login
            </button>
            <button
              onClick={() => setAuthMethod("email")}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                authMethod === "email"
                  ? "bg-indigo-600 text-white shadow-lg"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <LogOut className="w-4 h-4 rotate-180" />
              Email Auth
            </button>
          </div>

          {authMethod === "pin" ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Select Branch
                </label>
                <select
                  value={selectedRestId}
                  onChange={(e) => setSelectedRestId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 hover:border-indigo-500 rounded-xl px-4 py-3 text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all duration-200"
                >
                  {restaurants.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              {!pinExists ? (
                <div className="space-y-4 pt-2">
                  <div className="bg-amber-950/40 border border-amber-900 text-amber-300 p-4 rounded-2xl text-xs text-center leading-relaxed">
                    ⚠️ No quick PIN login configured for this branch. Please log in using Email Auth first.
                  </div>
                  <Button
                    onClick={() => setAuthMethod("email")}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-6 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    Go to Email Auth
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Enter Kitchen PIN
                      </label>
                      <span className="text-xs text-indigo-400 font-medium tracking-widest uppercase">
                        4 Digits Required
                      </span>
                    </div>
                    <div className="flex justify-center gap-4 py-2 bg-slate-950/80 rounded-2xl border border-slate-850">
                      {[0, 1, 2, 3].map((idx) => (
                        <div
                          key={idx}
                          className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-200 ${
                            pinInput[idx]
                              ? "bg-indigo-500 border-indigo-500 text-white text-xl font-bold"
                              : "border-slate-800 text-transparent"
                          }`}
                        >
                          ●
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Big Numpad */}
                  <div className="grid grid-cols-3 gap-3">
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                      <Button
                        key={num}
                        variant="secondary"
                        type="button"
                        onClick={() => handlePinKeyPress(num)}
                        disabled={pinInput.length >= 4}
                        className="h-16 text-xl font-bold bg-slate-950 border border-slate-850 hover:bg-slate-800 text-slate-100 rounded-2xl transition-all active:scale-95"
                      >
                        {num}
                      </Button>
                    ))}
                    <Button
                      variant="destructive"
                      type="button"
                      onClick={handlePinDelete}
                      className="h-16 text-lg font-semibold border border-red-900/30 rounded-2xl active:scale-95"
                    >
                      Clear
                    </Button>
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={() => handlePinKeyPress("0")}
                      disabled={pinInput.length >= 4}
                      className="h-16 text-xl font-bold bg-slate-950 border border-slate-850 hover:bg-slate-800 text-slate-100 rounded-2xl active:scale-95"
                    >
                      0
                    </Button>
                    <Button
                      variant="default"
                      type="button"
                      onClick={handlePinLogin}
                      disabled={isAuthLoading || pinInput.length !== 4}
                      className="h-16 text-lg font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl shadow-lg shadow-indigo-600/20 active:scale-95 flex items-center justify-center"
                    >
                      {isAuthLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Login"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <form onSubmit={handleEmailLogin} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-slate-100 rounded-xl py-6"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Password
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-slate-100 rounded-xl py-6"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={isAuthLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-6 rounded-xl text-lg shadow-lg active:scale-[0.99] flex items-center justify-center gap-2"
              >
                {isAuthLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-current" />
                    Enter Kitchen
                  </>
                )}
              </Button>
            </form>
          )}
        </Card>

        {showSetupPinPrompt && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md bg-slate-900 border-slate-800 text-slate-100 p-8 rounded-3xl shadow-2xl flex flex-col space-y-6">
              {setupPinStage === "ask" && (
                <>
                  <h3 className="text-2xl font-bold text-center bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                    Setup Quick PIN Login?
                  </h3>
                  <p className="text-slate-350 text-center text-sm leading-relaxed">
                    No quick PIN set. Would you like to setup a 4-digit PIN for quick login on this TV screen?
                  </p>
                  <div className="flex gap-4">
                    <Button
                      onClick={() => {
                        const newSession: TVAuthSession = {
                          restaurantId: setupPinRestaurantId,
                          restaurantName: setupPinRestaurantName,
                          isEmailLogin: true
                        };
                        localStorage.setItem(TV_AUTH_KEY, JSON.stringify(newSession));
                        setSession(newSession);
                        setShowSetupPinPrompt(false);
                        toast({
                          title: "Login Successful",
                          description: `Authenticated. Remind later to configure PIN.`
                        });
                      }}
                      variant="outline"
                      className="flex-1 border-slate-800 hover:bg-slate-800 text-slate-300 py-6 rounded-2xl"
                    >
                      No, Later
                    </Button>
                    <Button
                      onClick={() => {
                        setSetupPinStage("enter");
                        setNewPin("");
                        setConfirmPin("");
                      }}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-6 rounded-2xl font-bold"
                    >
                      Yes, Setup PIN
                    </Button>
                  </div>
                </>
              )}

              {(setupPinStage === "enter" || setupPinStage === "confirm") && (
                <>
                  <h3 className="text-2xl font-bold text-center bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                    {setupPinStage === "enter" ? "Enter KDS PIN" : "Confirm KDS PIN"}
                  </h3>
                  <p className="text-slate-400 text-center text-xs tracking-wider uppercase">
                    {setupPinStage === "enter"
                      ? "Choose a secure 4-digit PIN"
                      : "Re-enter the PIN to confirm"}
                  </p>

                  <div className="flex justify-center gap-4 py-3 bg-slate-950/80 rounded-2xl border border-slate-850">
                    {[0, 1, 2, 3].map((idx) => {
                      const val = setupPinStage === "enter" ? newPin : confirmPin;
                      return (
                        <div
                          key={idx}
                          className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-200 ${
                            val[idx]
                              ? "bg-indigo-500 border-indigo-500 text-white text-xl font-bold"
                              : "border-slate-800 text-transparent"
                          }`}
                        >
                          ●
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                      <Button
                        key={num}
                        variant="secondary"
                        onClick={() => {
                          if (setupPinStage === "enter") {
                            if (newPin.length < 4) setNewPin(prev => prev + num);
                          } else {
                            if (confirmPin.length < 4) setConfirmPin(prev => prev + num);
                          }
                        }}
                        className="h-14 text-lg font-bold bg-slate-950 border border-slate-850 hover:bg-slate-800 text-slate-100 rounded-xl transition-all active:scale-95"
                      >
                        {num}
                      </Button>
                    ))}
                    <Button
                      variant="destructive"
                      onClick={() => {
                        if (setupPinStage === "enter") {
                          setNewPin(prev => prev.slice(0, -1));
                        } else {
                          setConfirmPin(prev => prev.slice(0, -1));
                        }
                      }}
                      className="h-14 text-sm font-semibold border border-red-900/30 rounded-xl active:scale-95"
                    >
                      Clear
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        if (setupPinStage === "enter") {
                          if (newPin.length < 4) setNewPin(prev => prev + "0");
                        } else {
                          if (confirmPin.length < 4) setConfirmPin(prev => prev + "0");
                        }
                      }}
                      className="h-14 text-lg font-bold bg-slate-950 border border-slate-850 hover:bg-slate-800 text-slate-100 rounded-xl active:scale-95"
                    >
                      0
                    </Button>
                    <Button
                      variant="default"
                      onClick={async () => {
                        if (setupPinStage === "enter") {
                          if (newPin.length === 4) {
                            setSetupPinStage("confirm");
                          } else {
                            toast({ variant: "destructive", title: "Invalid PIN", description: "PIN must be 4 digits" });
                          }
                        } else {
                          if (confirmPin.length === 4) {
                            if (newPin === confirmPin) {
                              setIsAuthLoading(true);
                              try {
                                const { data: ok, error } = await supabase.rpc("set_kitchen_pin_by_owner", {
                                  p_restaurant_id: setupPinRestaurantId,
                                  p_new_pin: newPin
                                });
                                if (error) throw error;
                                
                                if (ok) {
                                  const newSession: TVAuthSession = {
                                    restaurantId: setupPinRestaurantId,
                                    restaurantName: setupPinRestaurantName,
                                    pin: newPin,
                                    isEmailLogin: true
                                  };
                                  localStorage.setItem(TV_AUTH_KEY, JSON.stringify(newSession));
                                  setSession(newSession);
                                  setShowSetupPinPrompt(false);
                                  toast({
                                    title: "PIN Configured",
                                    description: "Kitchen TV PIN saved. You can now use PIN quick login!"
                                  });
                                }
                              } catch (e: any) {
                                toast({
                                  variant: "destructive",
                                  title: "Error",
                                  description: e.message || "Failed to configure PIN."
                                });
                              } finally {
                                setIsAuthLoading(false);
                              }
                            } else {
                              toast({
                                variant: "destructive",
                                title: "Mismatched PIN",
                                description: "PINs do not match. Starting over."
                              });
                              setNewPin("");
                              setConfirmPin("");
                              setSetupPinStage("enter");
                            }
                          }
                        }
                      }}
                      disabled={setupPinStage === "enter" ? newPin.length !== 4 : confirmPin.length !== 4}
                      className="h-14 text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg active:scale-95"
                    >
                      {setupPinStage === "enter" ? "Next" : "Save"}
                    </Button>
                  </div>

                  <Button
                    variant="ghost"
                    onClick={() => {
                      if (setupPinStage === "confirm") {
                        setSetupPinStage("enter");
                        setConfirmPin("");
                      } else {
                        // Skip setup but log in
                        const newSession: TVAuthSession = {
                          restaurantId: setupPinRestaurantId,
                          restaurantName: setupPinRestaurantName,
                          isEmailLogin: true
                        };
                        localStorage.setItem(TV_AUTH_KEY, JSON.stringify(newSession));
                        setSession(newSession);
                        setShowSetupPinPrompt(false);
                      }
                    }}
                    className="w-full text-slate-400 hover:text-slate-200 mt-2"
                  >
                    {setupPinStage === "confirm" ? "Back to enter PIN" : "Skip setup"}
                  </Button>
                </>
              )}
            </Card>
          </div>
        )}
      </div>
    );
  }

  // Render TV layout board
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden select-none">
      {/* Floating Control Bar */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 bg-slate-900/90 border-b border-slate-800/80 backdrop-blur-md p-4 transition-all duration-500 flex items-center justify-between shadow-xl ${
          showControls ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex items-center gap-3">
          {session.isEmailLogin && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/kitchen")}
              className="border-slate-800 hover:bg-slate-800 text-slate-300 rounded-xl"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          )}
          <div className="flex flex-col">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Tv className="w-5 h-5 text-indigo-400" />
              <span>{session.restaurantName} KDS</span>
              <Badge className="bg-indigo-900/50 text-indigo-400 border border-indigo-800 uppercase font-bold text-[10px] tracking-widest">
                TV Mode
              </Badge>
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* FontSize Toggle */}
          <Button
            variant="outline"
            onClick={() =>
              setFontSizeClass(prev =>
                prev === "text-base" ? "text-lg" : prev === "text-lg" ? "text-xl" : "text-base"
              )
            }
            className="bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-xs font-semibold rounded-xl px-4 py-2 flex items-center gap-2 shadow-sm"
          >
            <Grid className="w-4 h-4 text-indigo-400" />
            <span>Font Size: <strong className="text-indigo-300 font-bold capitalize">{fontSizeClass === "text-base" ? "Standard" : fontSizeClass === "text-lg" ? "Large" : "Extra Large"}</strong></span>
          </Button>

          {/* Sound enable button */}
          <Button
            variant="outline"
            size="icon"
            onClick={isAudioEnabled ? disableAudio : enableAudio}
            title={isAudioEnabled ? "Audio Alerts Enabled" : "Audio Alerts Disabled"}
            className={`rounded-xl border shadow-sm transition-all ${
              isAudioEnabled
                ? "bg-emerald-900/80 border-emerald-600 text-emerald-300 hover:bg-emerald-800/80"
                : "bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700"
            }`}
          >
            {isAudioEnabled ? <Volume2 className="w-5 h-5 text-emerald-400" /> : <VolumeX className="w-5 h-5 text-amber-400" />}
          </Button>

          {/* Fullscreen Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
            className="bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-xl shadow-sm"
          >
            <Maximize2 className="w-5 h-5" />
          </Button>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isOrdersLoading}
            title="Refresh KDS Orders"
            className="bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-xl shadow-sm"
          >
            <RotateCw className={`w-5 h-5 ${isOrdersLoading ? "animate-spin text-indigo-400" : ""}`} />
          </Button>

          {/* Logout Button */}
          <Button
            variant="destructive"
            onClick={handleLogout}
            className="rounded-xl flex items-center gap-2 px-5 font-bold shadow-md"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </div>

      {/* Audio Prompts */}
      {!isAudioEnabled && (
        <div
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-amber-500 hover:bg-amber-600 text-white font-bold px-8 py-4 rounded-full shadow-2xl flex items-center gap-3 animate-bounce cursor-pointer border border-amber-400"
          onClick={enableAudio}
        >
          <VolumeX className="w-6 h-6 animate-pulse" />
          <span>Click to Enable TV Chimes and Sound Alerts</span>
        </div>
      )}

      {/* Main KDS Grid Layout */}
      <div className={`flex-1 p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden pt-20 ${fontSizeClass}`}>
        <OrdersColumn
          title="New Orders"
          orders={getOrdersByStatus("new")}
          onStatusUpdate={handleStatusUpdateAndPlay}
          onBumpOrder={bumpOrder}
          onItemComplete={updateItemComplete}
          onPriorityChange={updatePriority}
          onUpdateItems={updateOrderItems}
          variant="new"
          isOrderLate={() => false}
          isCompact={false}
          expandedOrders={expandedOrders}
          onToggleExpand={handleToggleExpand}
        />
        <OrdersColumn
          title="Preparing"
          orders={getOrdersByStatus("preparing")}
          onStatusUpdate={handleStatusUpdateAndPlay}
          onBumpOrder={bumpOrder}
          onItemComplete={updateItemComplete}
          onPriorityChange={updatePriority}
          onUpdateItems={updateOrderItems}
          variant="preparing"
          isOrderLate={() => false}
          isCompact={false}
          expandedOrders={expandedOrders}
          onToggleExpand={handleToggleExpand}
        />
        <OrdersColumn
          title="Ready"
          orders={getOrdersByStatus("ready")}
          onStatusUpdate={handleStatusUpdateAndPlay}
          onBumpOrder={bumpOrder}
          onItemComplete={updateItemComplete}
          onUpdateItems={updateOrderItems}
          variant="ready"
          isOrderLate={() => false}
          isCompact={false}
          expandedOrders={expandedOrders}
          onToggleExpand={handleToggleExpand}
        />
      </div>
    </div>
  );
};

export default KitchenTV;
