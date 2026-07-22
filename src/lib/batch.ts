// The batch ("Class of") field, and the opt-out some events offer beside it.
// Pure helpers — safe to import from client components.

/**
 * Stored in registrations.batch when the attendee isn't part of the event's
 * batch cohort (family, friends, guests). A year is always 4 digits, so this
 * can never be mistaken for one.
 */
export const NON_BATCH_VALUE = "non-batch";

/** Fallback wording if an event enables the option without naming it. */
const NON_BATCH_FALLBACK = "Not applicable";

/** Does this event offer the non-cohort option? */
export function allowsNonBatch(nonBatchLabel: string | null | undefined): boolean {
  return Boolean(nonBatchLabel?.trim());
}

export function nonBatchText(nonBatchLabel: string | null | undefined): string {
  return nonBatchLabel?.trim() || NON_BATCH_FALLBACK;
}

/**
 * How a stored batch value reads on screen and in email:
 * "2005" -> "Class of 2005", the sentinel -> the event's label, "" -> "".
 */
export function formatBatch(
  batch: string | null | undefined,
  nonBatchLabel?: string | null
): string {
  if (!batch) return "";
  if (batch === NON_BATCH_VALUE) return nonBatchText(nonBatchLabel);
  return `Class of ${batch}`;
}

/** Compact form for table cells and badges, where "Class of" is just noise. */
export function shortBatch(
  batch: string | null | undefined,
  nonBatchLabel?: string | null
): string {
  if (!batch) return "—";
  return batch === NON_BATCH_VALUE ? nonBatchText(nonBatchLabel) : batch;
}

/** True when the value is a plausible stored batch for this event. */
export function isValidBatch(value: string, allowNonBatch: boolean): boolean {
  if (value === NON_BATCH_VALUE) return allowNonBatch;
  return /^(19|20)\d{2}$/.test(value);
}
