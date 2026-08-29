import type { HistoryEntry } from "./command";

export interface StoreHistoryEntry extends HistoryEntry {
  readonly beforeToken: number;
  readonly afterToken: number;
}
