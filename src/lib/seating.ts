// Pure seating helpers, safe to import from client components.
// Every event carries its own SeatingConfig; nothing here is event-specific.

import type { SeatingConfig } from "./types";

/** Zero-pad width for seat numbers, e.g. 75 seats -> 2 ("A01"…"A75"). */
export function seatPad(seating: Pick<SeatingConfig, "seatsPerRow">): number {
  return Math.max(2, String(seating.seatsPerRow).length);
}

export function seatId(seating: Pick<SeatingConfig, "seatsPerRow">, row: string, n: number): string {
  return `${row}${String(n).padStart(seatPad(seating), "0")}`;
}

/** The full set of valid seat ids for an event — used for validation. */
export function validSeatIds(seating: SeatingConfig): Set<string> {
  const ids = new Set<string>();
  for (const row of seating.rows) {
    for (let n = 1; n <= seating.seatsPerRow; n++) {
      ids.add(seatId(seating, row, n));
    }
  }
  return ids;
}

export function formatLKR(amount: number): string {
  return `Rs ${amount.toLocaleString("en-LK")}`;
}

/** Sensible defaults for the "create event" wizard (the Bradby grandstand). */
export const DEFAULT_SEATING: SeatingConfig = {
  rows: ["A", "B", "C", "D", "E", "F"],
  seatsPerRow: 75,
  blocks: [20, 35, 20],
  pricePerSeat: 1500,
  maxSeatsPerBooking: 10,
};
