import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Web Audio API mock for jsdom
class MockAudioContext {
  state = "running";
  currentTime = 0;
  destination = {};

  createGain() {
    return {
      connect: vi.fn(),
      disconnect: vi.fn(),
      gain: {
        value: 1,
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
    };
  }

  createOscillator() {
    return {
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      type: "sine",
      frequency: {
        value: 440,
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
    };
  }

  resume() {
    return Promise.resolve();
  }

  close() {
    return Promise.resolve();
  }
}

// Attach mocks to global window
Object.defineProperty(window, "AudioContext", {
  writable: true,
  value: MockAudioContext,
});

Object.defineProperty(window, "webkitAudioContext", {
  writable: true,
  value: MockAudioContext,
});
