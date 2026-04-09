export type PerfNetworkEntry = {
  atMs: number;
  method: string;
  /** Request path as provided to axios (often like "/auth/login"). */
  url: string;
  baseURL: string;
  status: number | 'ERR';
  durationMs: number;
};

type PerfState = {
  visible: boolean;
  entries: PerfNetworkEntry[];
  maxEntries: number;
};

const state: PerfState = {
  visible: false,
  entries: [],
  maxEntries: 40,
};

const listeners = new Set<() => void>();

export function perfSubscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function perfGetState(): PerfState {
  return state;
}

export function perfSetVisible(next: boolean): void {
  state.visible = next;
  listeners.forEach((l) => l());
}

export function perfToggleVisible(): void {
  perfSetVisible(!state.visible);
}

export function perfClear(): void {
  state.entries = [];
  listeners.forEach((l) => l());
}

export function perfAddNetworkEntry(e: Omit<PerfNetworkEntry, 'atMs'>): void {
  state.entries.unshift({ ...e, atMs: Date.now() });
  if (state.entries.length > state.maxEntries) {
    state.entries = state.entries.slice(0, state.maxEntries);
  }
  listeners.forEach((l) => l());
}

