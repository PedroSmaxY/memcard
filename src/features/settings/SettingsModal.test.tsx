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

    const muteBtn = screen.getByRole("button", { name: /active|muted/i });
    await user.click(muteBtn);

    expect(setMutedSpy).toHaveBeenCalled();
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
