import { describe, it, expect, vi, beforeEach } from "vitest";
import * as SentryReact from "@sentry/react";
import { initSentry, captureException, _resetSentryForTests } from "./sentry";

vi.mock("@sentry/react", () => ({
  init: vi.fn(),
  captureException: vi.fn(),
}));

vi.mock("@sentry/capacitor", () => ({
  init: vi.fn(),
}));

vi.mock("@/utils/platform", () => ({
  isNativeApp: vi.fn(() => false),
}));

describe("sentry helper", () => {
  beforeEach(() => {
    _resetSentryForTests();
    vi.clearAllMocks();
  });

  it("no-ops safely when DSN is missing", () => {
    const initialized = initSentry("");
    expect(initialized).toBe(false);
    expect(SentryReact.init).not.toHaveBeenCalled();

    captureException(new Error("test"));
    expect(SentryReact.captureException).not.toHaveBeenCalled();
  });

  it("initializes and forwards exceptions when DSN is provided", () => {
    const initialized = initSentry("https://examplePublicKey@o0.ingest.sentry.io/0");
    expect(initialized).toBe(true);
    expect(SentryReact.init).toHaveBeenCalledTimes(1);

    const err = new Error("pos crash");
    captureException(err, { moduleName: "POS" });
    expect(SentryReact.captureException).toHaveBeenCalledWith(err, {
      extra: { moduleName: "POS" },
    });
  });
});
