import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// Mock the context
vi.mock("@/context/NotificationContext", () => ({
  useNotifications: () => ({
    addToast: vi.fn(),
    fetchNotifications: vi.fn(),
    triggerRefresh: vi.fn(),
  }),
}));

// Mock XMLHttpRequest
class MockXHR {
  upload = { onprogress: null as ((e: ProgressEvent) => void) | null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  status = 200;
  open = vi.fn();
  send = vi.fn().mockImplementation(() => {
    // Simulate successful upload
    setTimeout(() => { this.onload?.(); }, 0);
  });
}

let mockXhr: MockXHR;
vi.stubGlobal("XMLHttpRequest", vi.fn().mockImplementation(() => {
  mockXhr = new MockXHR();
  return mockXhr;
}));

describe("UploadZone component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function renderUploadZone() {
    const { default: UploadZone } = await import("@/components/UploadZone");
    return render(<UploadZone />);
  }

  it("renders drop zone with correct text", async () => {
    await renderUploadZone();
    expect(screen.getByText(/drop files here or click to browse/i)).toBeInTheDocument();
    expect(screen.getByText(/pdf only/i)).toBeInTheDocument();
  });

  it("renders Single file and Bulk upload buttons", async () => {
    await renderUploadZone();
    expect(screen.getByRole("button", { name: /single file/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /bulk upload/i })).toBeInTheDocument();
  });

  it("shows validation error for non-PDF file", async () => {
    await renderUploadZone();
    const input = document.querySelector("input[type='file']:not([multiple])") as HTMLInputElement;
    const txtFile = new File(["content"], "doc.txt", { type: "text/plain" });
    await userEvent.upload(input, txtFile);
    expect(await screen.findByText(/only pdf files are allowed/i)).toBeInTheDocument();
  });

  it("shows validation error for oversized file", async () => {
    await renderUploadZone();
    const input = document.querySelector("input[type='file']:not([multiple])") as HTMLInputElement;
    const bigFile = new File([new ArrayBuffer(21 * 1024 * 1024)], "big.pdf", { type: "application/pdf" });
    await userEvent.upload(input, bigFile);
    expect(await screen.findByText(/exceeds 20 mb/i)).toBeInTheDocument();
  });

  it("shows file row with Pending status after valid PDF selected", async () => {
    await renderUploadZone();
    const input = document.querySelector("input[type='file']:not([multiple])") as HTMLInputElement;
    const pdf = new File(["%PDF-1.4 content"], "valid.pdf", { type: "application/pdf" });
    await userEvent.upload(input, pdf);
    expect(await screen.findByText("valid.pdf")).toBeInTheDocument();
  });

  it("shows bulk header when more than 3 files are selected", async () => {
    await renderUploadZone();
    const input = document.querySelector("input[multiple]") as HTMLInputElement;
    const files = Array.from({ length: 4 }, (_, i) =>
      new File(["%PDF"], `file${i + 1}.pdf`, { type: "application/pdf" })
    );
    await userEvent.upload(input, files);
    expect(await screen.findByText(/uploading 4 files/i)).toBeInTheDocument();
  });

  it("drag-over adds visual highlight class", async () => {
    await renderUploadZone();
    const dropZone = screen.getByText(/drop files here/i).closest("div")!;
    fireEvent.dragOver(dropZone, { preventDefault: vi.fn() });
    expect(dropZone.className).toMatch(/border-blue-400/);
  });

  it("remove button dismisses a file entry", async () => {
    await renderUploadZone();
    const input = document.querySelector("input[type='file']:not([multiple])") as HTMLInputElement;
    const pdf = new File(["%PDF"], "remove-me.pdf", { type: "application/pdf" });
    await userEvent.upload(input, pdf);
    expect(await screen.findByText("remove-me.pdf")).toBeInTheDocument();
    const removeBtn = screen.getByRole("button", { name: "" }); // X button
    await userEvent.click(removeBtn);
    expect(screen.queryByText("remove-me.pdf")).not.toBeInTheDocument();
  });
});
