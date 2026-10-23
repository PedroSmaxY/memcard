import { describe, it, expect } from "vitest";
import { EMULATOR_PRESETS, fetchCommunityPresets } from "./presets";

describe("Emulator Presets", () => {
  it("contains major emulator configurations", () => {
    const ids = EMULATOR_PRESETS.map((p) => p.id);
    expect(ids).toContain("duckstation");
    expect(ids).toContain("pcsx2");
    expect(ids).toContain("dolphin");
    expect(ids).toContain("ryujinx");
    expect(ids).toContain("retroarch");
    expect(ids).toContain("citra");
    expect(ids).toContain("cemu");
    expect(ids).toContain("zelda_wwhd");
    expect(ids).toContain("dusklight");
    expect(ids).toContain("ship_of_harkinian");
    expect(ids).toContain("2ship2harkinian");
    expect(ids).toContain("sm64ex");
    expect(ids).toContain("opengoal");
  });

  it("assigns valid platforms to each preset", () => {
    const validPlatforms = ["ps1", "ps2", "nintendo", "modern", "pc"];
    for (const preset of EMULATOR_PRESETS) {
      expect(validPlatforms).toContain(preset.platform);
      expect(preset.suggestedFileName.length).toBeGreaterThan(0);
      expect(preset.name.length).toBeGreaterThan(0);
    }
  });

  it("fetches community presets gracefully in fallback mode", async () => {
    const presets = await fetchCommunityPresets();
    expect(presets.length).toBeGreaterThanOrEqual(10);
    expect(presets.some((p) => p.id === "duckstation")).toBe(true);
  });
});
