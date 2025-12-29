import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Gift,
  Star,
  Sparkles,
  CheckCircle2,
  Loader2,
  Mail,
  Phone,
  User,
  Calendar,
  Award,
  ArrowRight,
} from "lucide-react";

interface Restaurant {
  id: string;
  name: string;
  description?: string;
}

interface EnrollmentResult {
  success: boolean;
  message: string;
  customer?: {
    id: string;
    name: string;
    loyaltyPoints: number;
    tier: string;
  };
  error?: string;
}

const WELCOME_POINTS = 50;

export default function PublicEnrollmentPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthday, setBirthday] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  // UI state
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EnrollmentResult | null>(null);

  // Fetch restaurant info on mount
  useEffect(() => {
    const fetchRestaurant = async () => {
      if (!slug) {
        setError("Invalid enrollment link");
        setIsLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from("restaurants")
          .select("id, name, description")
          .eq("slug", slug.toLowerCase())
          .single();

        if (fetchError || !data) {
          setError("Restaurant not found");
        } else {
          setRestaurant(data);
        }
      } catch (err) {
        setError("Failed to load restaurant information");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRestaurant();
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await supabase.functions.invoke("enroll-customer", {
        body: {
          slug,
          name: name.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          birthday: birthday || undefined,
          source: "qr_code",
        },
      });

      if (response.error) {
        setError(response.error.message || "Enrollment failed");
        return;
      }

      const data = response.data as EnrollmentResult;

      if (!data.success) {
        setError(data.error || "Enrollment failed");
        return;
      }

      setResult(data);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p className="text-lg opacity-90">Loading...</p>
        </div>
      </div>
    );
  }

  // Error state (restaurant not found)
  if (!restaurant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-white/10 backdrop-blur-lg border-white/20">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">😕</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Oops!</h1>
            <p className="text-gray-300">{error || "Restaurant not found"}</p>
            <Button
              onClick={() => navigate("/")}
              className="mt-6"
              variant="outline"
            >
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (result?.success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-white shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-400 to-teal-400 p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center mx-auto mb-4 animate-bounce">
              <CheckCircle2 className="h-12 w-12 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              You're In! 🎉
            </h1>
            <p className="text-white/90">Welcome to {restaurant.name}</p>
          </div>

          <CardContent className="p-8 text-center">
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Star className="h-5 w-5 text-amber-500 fill-amber-400" />
                <span className="text-sm text-amber-700 font-medium uppercase tracking-wide">
                  Your Points
                </span>
              </div>
              <p className="text-5xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                {result.customer?.loyaltyPoints || WELCOME_POINTS}
              </p>
              <p className="text-amber-600 mt-2 flex items-center justify-center gap-1">
                <Award className="h-4 w-4" />
                {result.customer?.tier || "Bronze"} Member
              </p>
            </div>

            <p className="text-gray-600 mb-6">{result.message}</p>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-left p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <Gift className="h-4 w-4 text-purple-600" />
                </div>
                <span className="text-gray-700">
                  Earn points on every order
                </span>
              </div>
              <div className="flex items-center gap-3 text-left p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-pink-600" />
                </div>
                <span className="text-gray-700">Exclusive member rewards</span>
              </div>
            </div>

            <p className="mt-8 text-sm text-gray-500">
              Check your email for more details!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Enrollment form
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-indigo-500 p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMC41IiBvcGFjaXR5PSIwLjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />

          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-4">
              <Gift className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">
              {restaurant.name}
            </h1>
            <p className="text-white/80 text-sm">Loyalty Program</p>
          </div>
        </div>

        {/* Benefits Preview */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4 border-b border-amber-100">
          <div className="flex items-center justify-center gap-3">
            <div className="flex items-center gap-1.5 text-amber-700">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="text-sm font-medium">Join now & get</span>
            </div>
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1 rounded-full text-sm font-bold">
              {WELCOME_POINTS} Points FREE!
            </div>
          </div>
        </div>

        {/* Form */}
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div className="space-y-2">
              <Label
                htmlFor="name"
                className="flex items-center gap-2 text-gray-700"
              >
                <User className="h-4 w-4 text-gray-400" />
                Your Name *
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                className="h-12 text-base"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="flex items-center gap-2 text-gray-700"
              >
                <Mail className="h-4 w-4 text-gray-400" />
                Email {!phone && "*"}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 text-base"
                required={!phone}
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label
                htmlFor="phone"
                className="flex items-center gap-2 text-gray-700"
              >
                <Phone className="h-4 w-4 text-gray-400" />
                Phone {!email && "*"}
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-12 text-base"
                required={!email}
              />
              <p className="text-xs text-gray-500">
                Either email or phone is required
              </p>
            </div>

            {/* Birthday (Optional) */}
            <div className="space-y-2">
              <Label
                htmlFor="birthday"
                className="flex items-center gap-2 text-gray-700"
              >
                <Calendar className="h-4 w-4 text-gray-400" />
                Birthday{" "}
                <span className="text-gray-400 text-xs">
                  (Optional - for birthday rewards!)
                </span>
              </Label>
              <Input
                id="birthday"
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className="h-12 text-base"
              />
            </div>

            {/* Terms */}
            <div className="flex items-start gap-3 pt-2">
              <Checkbox
                id="terms"
                checked={acceptTerms}
                onCheckedChange={(checked) => setAcceptTerms(checked === true)}
                className="mt-1"
              />
              <label
                htmlFor="terms"
                className="text-sm text-gray-600 leading-relaxed cursor-pointer"
              >
                I agree to receive loyalty rewards, special offers, and updates
                from {restaurant.name}
              </label>
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={
                isSubmitting || !name || (!email && !phone) || !acceptTerms
              }
              className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-500/25"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Enrolling...
                </>
              ) : (
                <>
                  Join Now
                  <ArrowRight className="h-5 w-5 ml-2" />
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            🔒 Your information is secure and will never be shared
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
