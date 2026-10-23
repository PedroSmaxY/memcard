import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DiscoveredSavesBanner } from "./DiscoveredSavesBanner";

describe("DiscoveredSavesBanner", () => {
  it("renders null if count is 0", () => {
    const { container } = render(
      <DiscoveredSavesBanner count={0} onReview={vi.fn()} onDismiss={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders banner with count and triggers review on click", async () => {
    const user = userEvent.setup();
    const handleReview = vi.fn();
    const handleDismiss = vi.fn();

    render(
      <DiscoveredSavesBanner count={3} onReview={handleReview} onDismiss={handleDismiss} />
    );

    expect(screen.getByText(/Found/i)).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();

    const reviewBtn = screen.getByRole("button", { name: /Review & Import/i });
    await user.click(reviewBtn);
    expect(handleReview).toHaveBeenCalled();

    const dismissBtn = screen.getByTitle("Dismiss");
    await user.click(dismissBtn);
    expect(handleDismiss).toHaveBeenCalled();
  });
});
