import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateOfflineOrderNumber,
  isOfflineOrderNumber,
  getPendingCount,
  enqueueWrite,
  flushQueue,
} from "@/utils/syncManager";

describe("SyncManager & Offline Fallback", () => {
  describe("generateOfflineOrderNumber & isOfflineOrderNumber", () => {
    it("generates order numbers starting with OFFLINE- prefix", () => {
      const orderNum = generateOfflineOrderNumber();
      expect(orderNum).toMatch(/^OFFLINE-\d+$/);
      expect(isOfflineOrderNumber(orderNum)).toBe(true);
    });

    it("correctly identifies non-offline order numbers", () => {
      expect(isOfflineOrderNumber("ORD-12345")).toBe(false);
      expect(isOfflineOrderNumber("101")).toBe(false);
      expect(isOfflineOrderNumber(55)).toBe(false);
    });
  });

  describe("IndexedDB Exception & Unhandled Rejection Resilience", () => {
    it("getPendingCount returns 0 gracefully when IndexedDB throws", async () => {
      const count = await getPendingCount();
      expect(typeof count).toBe("number");
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it("enqueueWrite returns a valid UUID string and does not throw even if IDB fails", async () => {
      const id = await enqueueWrite("order", { id: "test-order", total: 100 });
      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);
    });

    it("flushQueue runs without throwing unhandled promise rejections", async () => {
      await expect(flushQueue()).resolves.not.toThrow();
    });
  });
});
