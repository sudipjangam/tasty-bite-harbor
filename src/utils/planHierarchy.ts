/**
 * Plan Hierarchy & Parsing Utilities
 * Groups raw subscription plans by Business Group -> Plan Tier -> Duration/Interval
 * Aligns directly with Swadeshi Solutions Commercial Pricing & Proposal Guide.
 */

export interface SubscriptionPlanItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  interval: string;
  features?: string[];
  components?: string[];
  is_active: boolean;
}

export interface ParsedPlanItem {
  plan: SubscriptionPlanItem;
  group: string;
  tier: string;
  intervalKey: string;
  cleanName: string;
}

export interface PlanTierGroup {
  tierName: string;
  plans: SubscriptionPlanItem[];
  subtitle?: string;
  inclusions?: string;
  isHero?: boolean;
  badge?: string;
  gradient?: string;
  borderActive?: string;
  bgActive?: string;
}

export const TIER_CONFIG: Record<
  string,
  {
    subtitle: string;
    inclusions: string;
    isHero?: boolean;
    badge?: string;
    gradient: string;
    borderActive: string;
    bgActive: string;
  }
> = {
  Starter: {
    subtitle: "Kiosks, food trucks & small quick-service counters",
    inclusions: "1 Outlet • 2 Users • 1 Android POS",
    gradient: "from-amber-500 to-orange-600",
    borderActive: "border-amber-500 ring-amber-500/20",
    bgActive: "bg-amber-50/80 dark:bg-amber-950/20",
  },
  Professional: {
    subtitle: "Dine-in cafes, bakeries & independent restaurants",
    inclusions: "1 Outlet • 5 Users • 2 Android POS • Full Recipe & Costing",
    isHero: true,
    badge: "★ MOST POPULAR",
    gradient: "from-rose-500 via-purple-500 to-indigo-600",
    borderActive: "border-purple-500 ring-purple-500/20",
    bgActive: "bg-purple-50/80 dark:bg-purple-950/20",
  },
  Business: {
    subtitle: "Fast-growing food brands & multi-branch kitchens",
    inclusions: "Up to 3 Outlets • 10 Users • 5 Android POS • Multi-Branch & AI",
    gradient: "from-blue-600 to-indigo-600",
    borderActive: "border-blue-500 ring-blue-500/20",
    bgActive: "bg-blue-50/80 dark:bg-blue-950/20",
  },
  Franchise: {
    subtitle: "Multi-unit chains & franchise corporate networks",
    inclusions: "Up to 5 Outlets • 20 Users • 10 Android POS • Royalty Engine",
    badge: "Enterprise",
    gradient: "from-purple-600 to-pink-600",
    borderActive: "border-fuchsia-500 ring-fuchsia-500/20",
    bgActive: "bg-fuchsia-50/80 dark:bg-fuchsia-950/20",
  },
  "Free Trial": {
    subtitle: "30-Day Risk-Free Trial (full live features before subscribing)",
    inclusions: "1 Outlet • 30-Day Evaluation",
    badge: "30 Days Free",
    gradient: "from-emerald-500 to-teal-600",
    borderActive: "border-emerald-500 ring-emerald-500/20",
    bgActive: "bg-emerald-50/80 dark:bg-emerald-950/20",
  },
  Growth: {
    subtitle: "Expanding operations & flexible billing setup",
    inclusions: "Multi-device POS • Growth features",
    gradient: "from-cyan-600 to-blue-600",
    borderActive: "border-cyan-500 ring-cyan-500/20",
    bgActive: "bg-cyan-50/80 dark:bg-cyan-950/20",
  },
};

export const TIER_SORT_ORDER: Record<string, number> = {
  starter: 1,
  professional: 2,
  business: 3,
  franchise: 4,
  growth: 5,
  "free trial": 6,
};

export const INTERVAL_SORT_ORDER: Record<string, number> = {
  half_yearly: 1,
  yearly: 2,
  monthly: 3,
  quarterly: 99,
};

/**
 * Extract plan category / group from name
 */
export const getPlanGroup = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower.startsWith("restaurant + hotel") || lower.startsWith("restaurant+hotel")) return "Restaurant + Hotel";
  if (lower.startsWith("all-in-one") || lower.startsWith("all in one")) return "All-in-One";
  if (lower.startsWith("food truck")) return "Food Truck";
  if (lower.startsWith("hotel")) return "Hotel";
  if (lower.startsWith("restaurant")) return "Restaurant";

  const tierWords = ["free", "trial", "growth", "starter", "professional", "pro", "basic", "business", "franchise"];
  const words = name.split(/[\s-]+/);
  const groupWords: string[] = [];
  for (const w of words) {
    if (tierWords.includes(w.toLowerCase())) break;
    groupWords.push(w);
  }
  return groupWords.join(" ") || "Other";
};

/**
 * Parses a plan's name and interval into a clean Base Tier and Duration Key.
 */
export const getPlanTierAndInterval = (
  name: string,
  group: string,
  rawInterval?: string
): { tier: string; intervalKey: string; cleanName: string } => {
  let clean = name;
  if (group && clean.toLowerCase().startsWith(group.toLowerCase())) {
    clean = clean.slice(group.length).trim();
  }
  clean = clean.replace(/^[-–—]\s*/, "").trim();

  // If clean is "Free Trial", treat as special tier
  if (clean.toLowerCase() === "free trial") {
    return {
      tier: "Free Trial",
      intervalKey: "monthly",
      cleanName: "Free Trial",
    };
  }

  // Look for dash separator: "Starter - Quarterly"
  const dashIndex = clean.indexOf(" - ");
  let tier = clean;
  let intervalHint = "";

  if (dashIndex !== -1) {
    tier = clean.slice(0, dashIndex).trim();
    intervalHint = clean.slice(dashIndex + 3).trim().toLowerCase();
  } else {
    // Suffix checks
    const lower = clean.toLowerCase();
    if (lower.endsWith(" quarterly")) {
      tier = clean.slice(0, -10).trim();
      intervalHint = "quarterly";
    } else if (lower.endsWith(" half-yearly") || lower.endsWith(" half yearly")) {
      tier = clean.replace(/\s+half[- ]yearly$/i, "").trim();
      intervalHint = "half_yearly";
    } else if (lower.endsWith(" yearly") || lower.endsWith(" annual")) {
      tier = clean.replace(/\s+(yearly|annual)$/i, "").trim();
      intervalHint = "yearly";
    } else if (lower.endsWith(" monthly")) {
      tier = clean.replace(/\s+monthly$/i, "").trim();
      intervalHint = "monthly";
    }
  }

  // Normalize interval
  let intervalKey = (rawInterval || "").toLowerCase();
  if (intervalHint.includes("quarter")) intervalKey = "quarterly";
  else if (intervalHint.includes("half")) intervalKey = "half_yearly";
  else if (intervalHint.includes("year") || intervalHint.includes("annual")) intervalKey = "yearly";
  else if (intervalHint.includes("month")) intervalKey = "monthly";

  if (!intervalKey) intervalKey = "monthly";

  return {
    tier: tier || "Standard",
    intervalKey,
    cleanName: clean,
  };
};

/**
 * Returns user-friendly titles, subtitles, and badges for a billing interval
 */
export const formatIntervalLabel = (
  intervalKey: string,
  tier: string,
  price: number
) => {
  if (tier.toLowerCase() === "free trial") {
    return {
      title: "30 Days Trial",
      period: "Evaluation",
      badge: "Risk-Free",
      effectiveMonthly: "₹0 / month",
    };
  }

  switch (intervalKey) {
    case "quarterly":
      return {
        title: "3 Months",
        period: "Quarterly",
        badge: "3M Term",
        effectiveMonthly: `~₹${Math.round(price / 3)}/mo`,
      };
    case "half_yearly":
      return {
        title: "6 Months",
        period: "Half-Yearly",
        badge: "Save ~16%",
        effectiveMonthly: `~₹${Math.round(price / 6)}/mo`,
      };
    case "yearly":
      return {
        title: "1 Year",
        period: "Annual",
        badge: "Best Value • Up to 30% Off",
        effectiveMonthly: `~₹${Math.round(price / 12)}/mo`,
      };
    case "monthly":
    default:
      return {
        title: "Monthly",
        period: "1 Month",
        badge: "Flexible",
        effectiveMonthly: `₹${price}/mo`,
      };
  }
};
