import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useRestaurantId } from "./useRestaurantId";
import { useSubscriptionAccess } from "./useSubscriptionAccess";

export interface FranchiseAccessInfo {
  isFranchise: boolean;
  isSingleRestaurant: boolean;
  hasFranchiseSubscription: boolean;
  canAccessFranchisePortal: boolean;
  organizationId: string | null;
  organizationType: "single" | "franchise" | "chain" | null;
  organizationName: string | null;
  isLoading: boolean;
}

/**
 * useFranchiseAccess
 * Mirrors FranchiseContext's org-resolution logic exactly:
 *   1. organization_members lookup
 *   2. organizations.owner_user_id lookup (franchise owners not in members table)
 *   3. restaurant → organization_id → org type check
 *   4. platform admin fallback
 * Single restaurants (type = 'single') NEVER access franchise portal.
 */
export const useFranchiseAccess = (): FranchiseAccessInfo => {
  const { user } = useAuth();
  const { restaurantId } = useRestaurantId();
  const { hasSubscriptionAccess, isLoading: subscriptionLoading } = useSubscriptionAccess();

  const { data, isLoading: queryLoading } = useQuery({
    queryKey: ["franchise-access-check", user?.id, restaurantId, user?.restaurant_id],
    queryFn: async () => {
      if (!user) return null;

      // ── Step 1: Check organization_members ──────────────────────
      const { data: memberRows, error: memberErr } = await supabase
        .from("organization_members")
        .select(`
          organization_id,
          role,
          organizations (
            id,
            name,
            type,
            owner_user_id
          )
        `)
        .eq("user_id", user.id);

      if (!memberErr && memberRows && memberRows.length > 0) {
        const franchiseMember = memberRows.find((m: any) => {
          const org = Array.isArray(m.organizations) ? m.organizations[0] : m.organizations;
          return org?.type === "franchise" || org?.type === "chain";
        });

        if (franchiseMember) {
          const org = Array.isArray(franchiseMember.organizations)
            ? franchiseMember.organizations[0]
            : franchiseMember.organizations;

          return {
            organizationId: org.id,
            organizationType: org.type as "franchise" | "chain",
            organizationName: org.name,
            isFranchise: true,
            isSingleRestaurant: false,
          };
        }
      }

      // ── Step 2: Check if user OWNS a franchise/chain org ────────
      // (Franchise owners may not be in organization_members table)
      const { data: ownedOrg } = await supabase
        .from("organizations")
        .select("id, name, type")
        .eq("owner_user_id", user.id)
        .in("type", ["franchise", "chain"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ownedOrg) {
        return {
          organizationId: ownedOrg.id,
          organizationType: ownedOrg.type as "franchise" | "chain",
          organizationName: ownedOrg.name,
          isFranchise: true,
          isSingleRestaurant: false,
        };
      }

      // ── Step 3: Check restaurant → organization link ────────────
      const targetRestaurantId = restaurantId || user.restaurant_id;
      if (targetRestaurantId) {
        const { data: restRow } = await supabase
          .from("restaurants")
          .select("organization_id")
          .eq("id", targetRestaurantId)
          .maybeSingle();

        if (restRow?.organization_id) {
          const { data: orgRow } = await supabase
            .from("organizations")
            .select("id, name, type, owner_user_id")
            .eq("id", restRow.organization_id)
            .maybeSingle();

          if (orgRow) {
            const isFranchiseType = orgRow.type === "franchise" || orgRow.type === "chain";
            return {
              organizationId: orgRow.id,
              organizationType: orgRow.type as "single" | "franchise" | "chain",
              organizationName: orgRow.name,
              isFranchise: isFranchiseType,
              isSingleRestaurant: !isFranchiseType,
            };
          }
        }
      }

      // ── Step 4: Platform admin fallback ─────────────────────────
      if (user.role === "admin") {
        const { data: firstFranchise } = await supabase
          .from("organizations")
          .select("id, name, type")
          .in("type", ["franchise", "chain"])
          .limit(1)
          .maybeSingle();

        if (firstFranchise) {
          return {
            organizationId: firstFranchise.id,
            organizationType: firstFranchise.type as "franchise" | "chain",
            organizationName: firstFranchise.name,
            isFranchise: true,
            isSingleRestaurant: false,
          };
        }
      }

      // ── Default: No franchise org found → single restaurant ─────
      return {
        organizationId: null,
        organizationType: "single" as const,
        organizationName: null,
        isFranchise: false,
        isSingleRestaurant: true,
      };
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  const isLoading = queryLoading || subscriptionLoading;
  const isFranchise = Boolean(data?.isFranchise);
  const isSingleRestaurant = data ? data.isSingleRestaurant : true;

  // Has franchise subscription component in plan
  const hasFranchiseSubscription =
    hasSubscriptionAccess("franchise.dashboard") ||
    hasSubscriptionAccess("franchise");

  // Single restaurant can NEVER access franchise portal
  const canAccessFranchisePortal =
    !isSingleRestaurant &&
    isFranchise &&
    (user?.role === "owner" || user?.role === "admin" || Boolean(data?.organizationId));

  return {
    isFranchise,
    isSingleRestaurant,
    hasFranchiseSubscription,
    canAccessFranchisePortal,
    organizationId: data?.organizationId || null,
    organizationType: data?.organizationType || null,
    organizationName: data?.organizationName || null,
    isLoading,
  };
};
