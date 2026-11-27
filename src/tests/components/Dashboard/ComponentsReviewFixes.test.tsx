import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent, waitFor, act } from "@testing-library/react";
import { renderWithProviders } from "../../utils/test-utils";
import StaffAttendanceWidget from "@/components/Dashboard/StaffAttendanceWidget";
import OwnerNotificationListener from "@/components/Notifications/OwnerNotificationListener";

const mockInvalidateQueries = vi.fn();
let mockChannelHandlers: Array<{ filter: any; callback: (payload: any) => void }> = [];
const mockRemoveChannel = vi.fn();
let mockAttendanceQueryError = false;
let mockAttendanceRows: any[] = [];

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>(
    "@tanstack/react-query",
  );
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: mockInvalidateQueries,
      setQueryData: vi.fn(),
    }),
  };
});

vi.mock("@/hooks/useRestaurantId", () => ({
  useRestaurantId: () => ({
    restaurantId: "rest-1",
    restaurantName: "Test Place",
  }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "owner-1", email: "owner@test.com" },
    loading: false,
    hasPermission: () => true,
    hasAnyPermission: () => true,
    isRole: () => true,
  }),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => false },
}));

vi.mock("@capacitor/local-notifications", () => ({
  LocalNotifications: {
    checkPermissions: vi.fn().mockResolvedValue({ display: "denied" }),
    schedule: vi.fn(),
  },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    channel: vi.fn(() => {
      const ch: any = {
        on: vi.fn((_event: string, filter: any, callback: (payload: any) => void) => {
          mockChannelHandlers.push({ filter, callback });
          return ch;
        }),
        subscribe: vi.fn(() => ch),
      };
      return ch;
    }),
    removeChannel: (...args: any[]) => mockRemoveChannel(...args),
    from: vi.fn((table: string) => {
      const chain: any = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        gte: vi.fn(() => chain),
        lte: vi.fn(() => chain),
        is: vi.fn(() => chain),
        then: (resolve: any, reject: any) => {
          if (table === "staff_time_clock") {
            return Promise.resolve(
              mockAttendanceQueryError
                ? { data: null, error: new Error("Refresh failed") }
                : { data: mockAttendanceRows, error: null },
            ).then(resolve, reject);
          }
          if (table === "staff") {
            return Promise.resolve({
              data: [{ id: "s1", first_name: "Asha", last_name: "Rao", status: "active" }],
              error: null,
            }).then(resolve, reject);
          }
          return Promise.resolve({ data: [], error: null }).then(resolve, reject);
        },
      };
      return chain;
    }),
  },
}));

describe("Review regression tests: Attendance & OwnerNotificationListener", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChannelHandlers = [];
    mockAttendanceQueryError = false;
    mockAttendanceRows = [
      {
        id: "clk-1",
        staff_id: "s1",
        clock_in: new Date(Date.now() - 1000 * 60 * 60 * 13).toISOString(),
        clock_out: null,
        staff: { id: "s1", first_name: "Asha", last_name: "Rao" },
        shifts: null,
      },
    ];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("disables Auto-out in StaffAttendanceWidget when the attendance query errors", async () => {
    mockAttendanceQueryError = true;
    renderWithProviders(<StaffAttendanceWidget />);

    await waitFor(() => {
      expect(
        screen.getByText(/Failed to refresh attendance data/i),
      ).toBeInTheDocument();
    });
  });

  it("enables Auto-out when attendance query succeeds for long-shift staff", async () => {
    renderWithProviders(<StaffAttendanceWidget />);

    await waitFor(() => {
      expect(screen.getByText("Clocked In")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Clocked In"));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Auto-out/i })).not.toBeDisabled();
    });
  });

  it("coalesces realtime UPDATE invalidations while running INSERT notifications immediately in OwnerNotificationListener", async () => {
    vi.useFakeTimers();
    const { unmount } = renderWithProviders(<OwnerNotificationListener />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const changeHandler = mockChannelHandlers.find((h) => h.filter?.event === "*")?.callback;
    expect(changeHandler).toBeDefined();

    await act(async () => {
      await changeHandler!({ eventType: "UPDATE", new: { id: "n1" } });
      await changeHandler!({ eventType: "UPDATE", new: { id: "n1" } });
      await changeHandler!({ eventType: "UPDATE", new: { id: "n1" } });
    });

    // Bursts do not trigger immediate repeated invalidations
    expect(mockInvalidateQueries).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(350);
    });
    expect(mockInvalidateQueries).toHaveBeenCalledTimes(1);

    // INSERT invalidates immediately
    await act(async () => {
      await changeHandler!({
        eventType: "INSERT",
        new: {
          id: "n2",
          type: "late_punch",
          title: "Late Punch",
          message: "Staff clocked in late",
        },
      });
    });
    expect(mockInvalidateQueries).toHaveBeenCalledTimes(2);

    // Pending UPDATE timer cleared on unmount
    await act(async () => {
      await changeHandler!({ eventType: "UPDATE", new: { id: "n3" } });
    });
    unmount();
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(mockInvalidateQueries).toHaveBeenCalledTimes(2);
  });
});
