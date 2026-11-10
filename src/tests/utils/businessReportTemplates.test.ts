import { describe, it, expect, vi } from "vitest";
import {
  DEFAULT_BUSINESS_PROFILE,
  resolveBusinessProfile,
  formatSafeCurrency,
  formatCellDisplay,
  getSampleBusinessReportPayload,
} from "@/utils/businessReportTemplates";

describe("businessReportTemplates", () => {
  it("resolves business profile with defaults", () => {
    const profile = resolveBusinessProfile({
      name: "Custom Restaurant",
      phone: "+91 99999 88888",
    });

    expect(profile.name).toBe("Custom Restaurant");
    expect(profile.phone).toBe("+91 99999 88888");
    expect(profile.logoUrl).toBe(DEFAULT_BUSINESS_PROFILE.logoUrl);
    expect(profile.website).toBe(DEFAULT_BUSINESS_PROFILE.website);
  });

  it("formats safe currency properly without unrenderable unicode characters", () => {
    expect(formatSafeCurrency(1250)).toContain("Rs. 1,250.00");
    expect(formatSafeCurrency("₹500")).toBe("Rs. 500");
    expect(formatSafeCurrency(null)).toBe("-");
  });

  it("formats cell display values safely", () => {
    expect(formatCellDisplay(450.5)).toBe("450.5");
    expect(formatCellDisplay(true)).toBe("Yes");
    expect(formatCellDisplay(false)).toBe("No");
    expect(formatCellDisplay(null)).toBe("-");
  });

  it("generates a complete sample business report payload", () => {
    const payload = getSampleBusinessReportPayload({ name: "Demo Bistro" });
    expect(payload.title).toBeTruthy();
    expect(payload.business?.name).toBe("Demo Bistro");
    expect(payload.kpis?.length).toBeGreaterThan(0);
    expect(payload.sections.length).toBeGreaterThanOrEqual(2);
    expect(payload.sections[0].tableData?.length).toBeGreaterThan(0);
  });
});

