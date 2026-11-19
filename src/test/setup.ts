import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

/**
 * Node 25 以降はグローバルに実験的な localStorage を持っており、
 * --localstorage-file を指定しないと undefined になって jsdom の localStorage を隠してしまう。
 * 使えない場合はメモリ上の Storage に差し替える。
 */
class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }
  clear() {
    this.store.clear();
  }
  getItem(key: string) {
    return this.store.get(key) ?? null;
  }
  key(index: number) {
    return [...this.store.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
}

function isUsable(storage: Storage | undefined): boolean {
  try {
    return typeof storage?.getItem === "function";
  } catch {
    return false;
  }
}

if (!isUsable(globalThis.localStorage)) {
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, "localStorage", {
    value: storage,
    configurable: true,
    writable: true,
  });
  if (typeof window !== "undefined" && window !== globalThis) {
    Object.defineProperty(window, "localStorage", {
      value: storage,
      configurable: true,
      writable: true,
    });
  }
}

afterEach(() => {
  // モックとタイマーは先に戻す（後片付けの途中で失敗しても他のテストに影響させない）
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.useRealTimers();
  cleanup();
  localStorage.clear();
});
