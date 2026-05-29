import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs/promises")>();
  return {
    ...actual,
    readFile: vi.fn().mockResolvedValue("[]"),
    writeFile: vi.fn().mockResolvedValue(undefined),
    mkdir: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  return { ...actual, existsSync: vi.fn().mockReturnValue(true) };
});

describe("notificationStore", () => {
  let createNotification: typeof import("@/lib/notificationStore").createNotification;
  let readNotifications: typeof import("@/lib/notificationStore").readNotifications;
  let broadcastSSE: typeof import("@/lib/notificationStore").broadcastSSE;
  let sseClients: typeof import("@/lib/notificationStore").sseClients;

  beforeEach(async () => {
    vi.resetModules();
    ({ createNotification, readNotifications, broadcastSSE, sseClients } =
      await import("@/lib/notificationStore"));
  });

  it("readNotifications returns empty array when file is empty", async () => {
    const result = await readNotifications();
    expect(result).toEqual([]);
  });

  it("readNotifications parses existing notifications", async () => {
    const { readFile } = await import("fs/promises");
    const mock = [{ id: "1", message: "test", type: "SUCCESS", timestamp: new Date().toISOString(), isRead: false }];
    vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify(mock));
    const result = await readNotifications();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("readNotifications returns [] on malformed JSON", async () => {
    const { readFile } = await import("fs/promises");
    vi.mocked(readFile).mockResolvedValueOnce("{ broken json");
    const result = await readNotifications();
    expect(result).toEqual([]);
  });

  it("createNotification writes and returns a notification with correct shape", async () => {
    const n = await createNotification("Upload done.", "SUCCESS");
    expect(n).toMatchObject({ message: "Upload done.", type: "SUCCESS", isRead: false });
    expect(n.id).toBeTruthy();
    expect(n.timestamp).toBeTruthy();
  });

  it("createNotification broadcasts SSE event", async () => {
    const mockCtrl = { enqueue: vi.fn() } as unknown as ReadableStreamDefaultController<Uint8Array>;
    sseClients.add(mockCtrl);
    await createNotification("Broadcast test.", "INFO");
    expect(mockCtrl.enqueue).toHaveBeenCalled();
    sseClients.delete(mockCtrl);
  });

  it("broadcastSSE removes dead clients that throw on enqueue", async () => {
    const deadCtrl = {
      enqueue: vi.fn().mockImplementation(() => { throw new Error("closed"); }),
    } as unknown as ReadableStreamDefaultController<Uint8Array>;
    sseClients.add(deadCtrl);
    broadcastSSE({ type: "test" });
    expect(sseClients.has(deadCtrl)).toBe(false);
  });
});
