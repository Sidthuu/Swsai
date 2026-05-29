import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

const mockDismissToast = vi.fn();
const mockMarkRead = vi.fn();
const mockMarkAllRead = vi.fn();

function makeCtx(overrides = {}) {
  return {
    toasts: [],
    addToast: vi.fn(),
    dismissToast: mockDismissToast,
    refresh: 0,
    triggerRefresh: vi.fn(),
    notifications: [],
    unreadCount: 0,
    fetchNotifications: vi.fn(),
    markRead: mockMarkRead,
    markAllRead: mockMarkAllRead,
    ...overrides,
  };
}

vi.mock("@/context/NotificationContext", () => ({
  useNotifications: vi.fn(),
}));

// ── GlobalToast ───────────────────────────────────────────────────────────────
describe("GlobalToast", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders nothing when there are no toasts", async () => {
    const { useNotifications } = await import("@/context/NotificationContext");
    vi.mocked(useNotifications).mockReturnValue(makeCtx());
    const { default: GlobalToast } = await import("@/components/GlobalToast");
    const { container } = render(<GlobalToast />);
    expect(container.firstChild).toBeNull();
  });

  it("renders a progress toast with spinner", async () => {
    const { useNotifications } = await import("@/context/NotificationContext");
    vi.mocked(useNotifications).mockReturnValue(makeCtx({
      toasts: [{ id: "t1", type: "progress", message: "Uploading 5 files..." }],
    }));
    const { default: GlobalToast } = await import("@/components/GlobalToast");
    render(<GlobalToast />);
    expect(screen.getByText("Uploading 5 files...")).toBeInTheDocument();
  });

  it("renders a complete toast with timestamp", async () => {
    const { useNotifications } = await import("@/context/NotificationContext");
    vi.mocked(useNotifications).mockReturnValue(makeCtx({
      toasts: [{ id: "t2", type: "complete", message: "5 files uploaded.", timestamp: "10:30 AM" }],
    }));
    const { default: GlobalToast } = await import("@/components/GlobalToast");
    render(<GlobalToast />);
    expect(screen.getByText("5 files uploaded.")).toBeInTheDocument();
    expect(screen.getByText("10:30 AM")).toBeInTheDocument();
  });

  it("calls dismissToast when X is clicked", async () => {
    const { useNotifications } = await import("@/context/NotificationContext");
    vi.mocked(useNotifications).mockReturnValue(makeCtx({
      toasts: [{ id: "t3", type: "complete", message: "Done." }],
    }));
    const { default: GlobalToast } = await import("@/components/GlobalToast");
    render(<GlobalToast />);
    fireEvent.click(screen.getByRole("button"));
    expect(mockDismissToast).toHaveBeenCalledWith("t3");
  });
});

// ── Header notification panel ─────────────────────────────────────────────────
describe("Header — notification bell", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows no badge when unreadCount is 0", async () => {
    const { useNotifications } = await import("@/context/NotificationContext");
    vi.mocked(useNotifications).mockReturnValue(makeCtx({ unreadCount: 0 }));
    const { default: Header } = await import("@/components/header");
    render(<Header />);
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("shows unread badge with correct count", async () => {
    const { useNotifications } = await import("@/context/NotificationContext");
    vi.mocked(useNotifications).mockReturnValue(makeCtx({ unreadCount: 3 }));
    const { default: Header } = await import("@/components/header");
    render(<Header />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("opens dropdown on bell click and shows empty state", async () => {
    const { useNotifications } = await import("@/context/NotificationContext");
    vi.mocked(useNotifications).mockReturnValue(makeCtx({ notifications: [] }));
    const { default: Header } = await import("@/components/header");
    render(<Header />);
    fireEvent.click(screen.getByRole("button", { name: "" })); // bell button
    expect(await screen.findByText(/no notifications yet/i)).toBeInTheDocument();
  });

  it("renders notifications in dropdown", async () => {
    const { useNotifications } = await import("@/context/NotificationContext");
    vi.mocked(useNotifications).mockReturnValue(makeCtx({
      unreadCount: 1,
      notifications: [
        { id: "n1", message: "5 files uploaded.", type: "SUCCESS", timestamp: new Date().toISOString(), isRead: false },
      ],
    }));
    const { default: Header } = await import("@/components/header");
    render(<Header />);
    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(await screen.findByText("5 files uploaded.")).toBeInTheDocument();
  });

  it("calls markAllRead when 'Mark all read' is clicked", async () => {
    const { useNotifications } = await import("@/context/NotificationContext");
    vi.mocked(useNotifications).mockReturnValue(makeCtx({
      unreadCount: 2,
      notifications: [
        { id: "n1", message: "msg1", type: "SUCCESS", timestamp: new Date().toISOString(), isRead: false },
        { id: "n2", message: "msg2", type: "ERROR",   timestamp: new Date().toISOString(), isRead: false },
      ],
    }));
    const { default: Header } = await import("@/components/header");
    render(<Header />);
    fireEvent.click(screen.getAllByRole("button")[0]); // open dropdown
    fireEvent.click(await screen.findByText(/mark all read/i));
    expect(mockMarkAllRead).toHaveBeenCalled();
  });

  it("calls markRead when an unread notification is clicked", async () => {
    const { useNotifications } = await import("@/context/NotificationContext");
    vi.mocked(useNotifications).mockReturnValue(makeCtx({
      unreadCount: 1,
      notifications: [
        { id: "n1", message: "Click me.", type: "INFO", timestamp: new Date().toISOString(), isRead: false },
      ],
    }));
    const { default: Header } = await import("@/components/header");
    render(<Header />);
    fireEvent.click(screen.getAllByRole("button")[0]);
    fireEvent.click(await screen.findByText("Click me."));
    expect(mockMarkRead).toHaveBeenCalledWith("n1");
  });
});
