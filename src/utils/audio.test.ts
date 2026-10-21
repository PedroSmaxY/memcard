import { describe, it, expect } from "vitest";
import { soundEngine } from "./audio";

describe("SoundEngine Synthesizer", () => {
  it("allows muting and unmuting without throwing errors", () => {
    soundEngine.setMuted(true);
    expect(soundEngine.getIsMuted()).toBe(true);

    // Audio methods should not throw when muted
    expect(() => soundEngine.playSaveChime()).not.toThrow();
    expect(() => soundEngine.playRestoreChime()).not.toThrow();
    expect(() => soundEngine.playClick()).not.toThrow();
    expect(() => soundEngine.playAlert()).not.toThrow();

    soundEngine.setMuted(false);
    expect(soundEngine.getIsMuted()).toBe(false);
  });

  it("handles browser environments gracefully", () => {
    // In node/vitest, window may lack web audio or AudioContext
    expect(() => soundEngine.playClick()).not.toThrow();
  });
});
