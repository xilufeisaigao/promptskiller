import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearPracticedDrills,
  listPracticedDrillIds,
  markDrillPracticed,
} from "./drill-progress";

describe("drill progress local state", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    const localStorageMock = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    };
    vi.stubGlobal("window", {
      localStorage: localStorageMock,
      dispatchEvent: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("marks drill ids without duplicates", () => {
    clearPracticedDrills();
    markDrillPracticed("drill-a");
    markDrillPracticed("drill-a");
    markDrillPracticed("drill-b");

    expect(listPracticedDrillIds()).toEqual(["drill-a", "drill-b"]);
  });
});
