import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddGameModal } from "./AddGameModal";

describe("AddGameModal Component", () => {
  it("does not render when isOpen is false", () => {
    const { container } = render(
      <AddGameModal
        isOpen={false}
        initialPlatform="ps1"
        onClose={vi.fn()}
        onAdd={vi.fn()}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders modal and validates empty fields", async () => {
    const user = userEvent.setup();
    const handleAdd = vi.fn();

    render(
      <AddGameModal
        isOpen={true}
        initialPlatform="ps1"
        onClose={vi.fn()}
        onAdd={handleAdd}
      />
    );

    expect(screen.getByText("Enroll Game Save")).toBeInTheDocument();

    const submitBtn = screen.getByRole("button", { name: /enroll save/i });
    await user.click(submitBtn);

    expect(screen.getByText("Please enter a game title")).toBeInTheDocument();
    expect(handleAdd).not.toHaveBeenCalled();
  });

  it("auto-populates title and path when selecting an emulator preset", async () => {
    const user = userEvent.setup();

    render(
      <AddGameModal
        isOpen={true}
        initialPlatform="ps1"
        onClose={vi.fn()}
        onAdd={vi.fn()}
      />
    );

    const presetSelect = screen.getByRole("combobox");
    await user.selectOptions(presetSelect, "duckstation");

    const titleInput = screen.getByPlaceholderText(/final fantasy vii/i);
    expect((titleInput as HTMLInputElement).value).toBe("DuckStation");

    const pathInput = screen.getByPlaceholderText(/\/path\/to\/save/i);
    expect((pathInput as HTMLInputElement).value).toContain("shared_card_1.mcd");
  });

  it("submits valid game payload and calls onClose", async () => {
    const user = userEvent.setup();
    const handleAdd = vi.fn().mockResolvedValue(undefined);
    const handleClose = vi.fn();

    render(
      <AddGameModal
        isOpen={true}
        initialPlatform="ps1"
        onClose={handleClose}
        onAdd={handleAdd}
      />
    );

    const titleInput = screen.getByPlaceholderText(/final fantasy vii/i);
    await user.type(titleInput, "Grandia");

    const pathInput = screen.getByPlaceholderText(/\/path\/to\/save/i);
    await user.type(pathInput, "/Users/player/grandia.mcd");

    const submitBtn = screen.getByRole("button", { name: /enroll save/i });
    await user.click(submitBtn);

    expect(handleAdd).toHaveBeenCalledWith({
      name: "Grandia",
      platform: "ps1",
      savePath: "/Users/player/grandia.mcd",
      emulatorPreset: undefined,
    });
    expect(handleClose).toHaveBeenCalled();
  });

  it("displays error message if onAdd rejects", async () => {
    const user = userEvent.setup();
    const handleAdd = vi.fn().mockRejectedValue(new Error("Zero-Byte save rejected"));

    render(
      <AddGameModal
        isOpen={true}
        initialPlatform="ps1"
        onClose={vi.fn()}
        onAdd={handleAdd}
      />
    );

    const titleInput = screen.getByPlaceholderText(/final fantasy vii/i);
    await user.type(titleInput, "Corrupted Game");

    const pathInput = screen.getByPlaceholderText(/\/path\/to\/save/i);
    await user.type(pathInput, "/saves/empty.sav");

    const submitBtn = screen.getByRole("button", { name: /enroll save/i });
    await user.click(submitBtn);

    expect(screen.getByText(/Zero-Byte save rejected/i)).toBeInTheDocument();
  });
});
