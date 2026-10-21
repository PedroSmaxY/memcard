import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsModal } from "./SettingsModal";
import { soundEngine } from "../../utils/audio";

describe("SettingsModal Component", () => {
  it("does not render when isOpen is false", () => {
    const { container } = render(<SettingsModal isOpen={false} onClose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders preferences and toggles mute setting", async () => {
    const user = userEvent.setup();
    const setMutedSpy = vi.spyOn(soundEngine, "setMuted");

    render(<SettingsModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText("MemCard Preferences")).toBeInTheDocument();
    expect(screen.getByText("Synthesized Chimes")).toBeInTheDocument();
    expect(screen.getByText("Gamer Mode Notifications")).toBeInTheDocument();

    const chimesRow = screen.getByText("Synthesized Chimes").closest(".rounded-xl");
    const muteBtn = chimesRow?.querySelector("button");
    expect(muteBtn).toBeInTheDocument();
    await user.click(muteBtn!);

    expect(setMutedSpy).toHaveBeenCalled();
  });

  it("toggles gamer mode notifications setting", async () => {
    const user = userEvent.setup();

    render(<SettingsModal isOpen={true} onClose={vi.fn()} />);

    const notifRow = screen.getByText("Gamer Mode Notifications").closest(".rounded-xl");
    const notifBtn = notifRow?.querySelector("button");
    expect(notifBtn).toBeInTheDocument();
    expect(notifBtn?.textContent).toBe("Active");

    await user.click(notifBtn!);
    expect(notifBtn?.textContent).toBe("Disabled");

    await user.click(notifBtn!);
    expect(notifBtn?.textContent).toBe("Active");
  });

  it("calls onClose when close icon is clicked", async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    render(<SettingsModal isOpen={true} onClose={handleClose} />);

    const closeBtn = screen.getByRole("button", { name: "" }); // X icon
    await user.click(closeBtn);

    expect(handleClose).toHaveBeenCalled();
  });
});
