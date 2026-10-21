import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConflictModal, SyncConflictData } from "./ConflictModal";

const mockConflict: SyncConflictData = {
  gameId: "game-123",
  gameName: "Chrono Cross",
  localHash: "aaaa1111bbbb2222",
  localTimestamp: new Date().toISOString(),
  localSizeBytes: 131072,
  remoteHash: "cccc3333dddd4444",
  remoteTimestamp: new Date().toISOString(),
  remoteSizeBytes: 135168,
};

describe("ConflictModal Component", () => {
  it("does not render when isOpen is false", () => {
    const { container } = render(
      <ConflictModal
        conflict={mockConflict}
        isOpen={false}
        onResolve={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders side-by-side local and cloud comparison", () => {
    render(
      <ConflictModal
        conflict={mockConflict}
        isOpen={true}
        onResolve={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText("Save Divergence Detected")).toBeInTheDocument();
    expect(screen.getByText(/Chrono Cross/i)).toBeInTheDocument();
    expect(screen.getByText("Local Device")).toBeInTheDocument();
    expect(screen.getByText("Google Drive")).toBeInTheDocument();
    expect(screen.getByText("aaaa1111")).toBeInTheDocument();
    expect(screen.getByText("cccc3333")).toBeInTheDocument();
  });

  it("handles Keep Local action", async () => {
    const user = userEvent.setup();
    const handleResolve = vi.fn().mockResolvedValue(undefined);
    const handleClose = vi.fn();

    render(
      <ConflictModal
        conflict={mockConflict}
        isOpen={true}
        onResolve={handleResolve}
        onClose={handleClose}
      />
    );

    const keepLocalBtn = screen.getByRole("button", {
      name: /keep local \(upload\)/i,
    });
    await user.click(keepLocalBtn);

    expect(handleResolve).toHaveBeenCalledWith("keep_local");
    expect(handleClose).toHaveBeenCalled();
  });

  it("handles Use Cloud action", async () => {
    const user = userEvent.setup();
    const handleResolve = vi.fn().mockResolvedValue(undefined);
    const handleClose = vi.fn();

    render(
      <ConflictModal
        conflict={mockConflict}
        isOpen={true}
        onResolve={handleResolve}
        onClose={handleClose}
      />
    );

    const useCloudBtn = screen.getByRole("button", {
      name: /use cloud \(download\)/i,
    });
    await user.click(useCloudBtn);

    expect(handleResolve).toHaveBeenCalledWith("use_cloud");
    expect(handleClose).toHaveBeenCalled();
  });

  it("handles Branch / Duplicate action", async () => {
    const user = userEvent.setup();
    const handleResolve = vi.fn().mockResolvedValue(undefined);
    const handleClose = vi.fn();

    render(
      <ConflictModal
        conflict={mockConflict}
        isOpen={true}
        onResolve={handleResolve}
        onClose={handleClose}
      />
    );

    const branchBtn = screen.getByRole("button", {
      name: /branch \/ duplicate \(safe both\)/i,
    });
    await user.click(branchBtn);

    expect(handleResolve).toHaveBeenCalledWith("branch_slot");
    expect(handleClose).toHaveBeenCalled();
  });
});
