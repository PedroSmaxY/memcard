import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UpdateBanner } from "./UpdateBanner";

describe("UpdateBanner Component", () => {
  it("renders nothing when no update is available and not downloading", () => {
    const { container } = render(
      <UpdateBanner
        available={false}
        version={null}
        body={null}
        isDownloading={false}
        progress={0}
        statusMessage={null}
        error={null}
        onInstall={() => {}}
        onDismiss={() => {}}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders update available banner with version tag and triggers install", async () => {
    const handleInstall = vi.fn();
    const handleDismiss = vi.fn();

    render(
      <UpdateBanner
        available={true}
        version="0.3.0"
        body="Fixed audio chime and improved save detection."
        isDownloading={false}
        progress={0}
        statusMessage="Version 0.3.0 is available!"
        error={null}
        onInstall={handleInstall}
        onDismiss={handleDismiss}
      />
    );

    expect(screen.getByText(/Update Available/i)).toBeInTheDocument();
    expect(screen.getByText("v0.3.0")).toBeInTheDocument();
    expect(screen.getByText("Version 0.3.0 is available!")).toBeInTheDocument();

    const updateBtn = screen.getByRole("button", { name: /Update & Restart/i });
    await userEvent.click(updateBtn);
    expect(handleInstall).toHaveBeenCalledTimes(1);

    const dismissBtn = screen.getByTitle("Dismiss");
    await userEvent.click(dismissBtn);
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });

  it("renders downloading progress bar and percentage", () => {
    render(
      <UpdateBanner
        available={true}
        version="0.3.0"
        body={null}
        isDownloading={true}
        progress={65}
        statusMessage="Downloading update..."
        error={null}
        onInstall={() => {}}
        onDismiss={() => {}}
      />
    );

    expect(screen.getByText(/Updating/i)).toBeInTheDocument();
    expect(screen.getByText("Downloading update...")).toBeInTheDocument();
  });
});
