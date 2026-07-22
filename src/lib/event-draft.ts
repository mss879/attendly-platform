import type { EventDraftInput } from "./validation";

// Shared "create event" payload → events-row mapping, used by the create
// and update API routes.

export function draftToRow(draft: EventDraftInput) {
  const blockSum = draft.seating.blocks.reduce((a, b) => a + b, 0);
  return {
    slug: draft.slug,
    name: draft.name,
    banner_url: draft.bannerUrl || null,
    edition: draft.edition || null,
    subtitle: draft.subtitle || null,
    // tagline is deliberately absent: the draft form doesn't edit it, and
    // including it here would wipe the stored value on every update.
    description: draft.description,
    venue: draft.venue,
    schedule: draft.schedule,
    teams: draft.teams,
    starts_at: draft.startsAt || null,
    gates_open_at: draft.gatesOpenAt || null,
    seating: {
      ...draft.seating,
      // Blocks must tile the row exactly; fall back to one solid block.
      blocks:
        blockSum === draft.seating.seatsPerRow
          ? draft.seating.blocks
          : [draft.seating.seatsPerRow],
    },
    bank: draft.bank,
    collect_batch: draft.collectBatch,
    non_batch_label: draft.nonBatchLabel || null,
  };
}

/** Returns an error message when a submitted timestamp is unparseable. */
export function draftDateError(draft: EventDraftInput): string | null {
  for (const value of [draft.startsAt, draft.gatesOpenAt]) {
    if (value && isNaN(new Date(value).getTime())) {
      return "Invalid date — please re-pick the event times.";
    }
  }
  return null;
}
