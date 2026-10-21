import { describe, it, expect } from "vitest";
import { EMULATOR_PRESETS } from "./presets";

describe("Emulator Presets", () => {
  it("contains major emulator configurations", () => {
    const ids = EMULATOR_PRESETS.map((p) => p.id);
    expect(ids).toContain("duckstation");
    expect(ids).toContain("pcsx2");
    expect(ids).toContain("dolphin");
    expect(ids).toContain("ryujinx");
    expect(ids).toContain("retroarch-ps1");
  });

  it("assigns valid platforms to each preset", () => {
    const validPlatforms = ["ps1", "ps2", "nintendo", "modern", "pc"];
    for (const preset of EMULATOR_PRESETS) {
      expect(validPlatforms).toContain(preset.platform);
      expect(preset.suggestedFileName.length).toBeGreaterThan(0);
      expect(preset.name.length).toBeGreaterThan(0);
    }
  });
});
