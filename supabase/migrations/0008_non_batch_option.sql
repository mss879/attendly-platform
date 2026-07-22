-- Attendly — Feature 8: "outside the batch" option on the batch field
-- Some events collect a batch year ("Class of 2005") from alumni, but also
-- admit people who were never part of that cohort — family and friends. Those
-- attendees now get one extra option next to the year.
--
-- The option is per event and OFF everywhere by default: non_batch_label is
-- null unless an organizer names it, so no other event's booking form changes.
-- The column doubles as the switch and the wording, which lets each event use
-- its own term ("Non RC", "Guest", "Non-alumni") without a code change.

alter table public.events
  add column if not exists non_batch_label text;

comment on column public.events.non_batch_label is
  'Label for the non-cohort option on the batch field (e.g. "Non RC"). Null = the option is not offered.';

-- Attendees who pick it are stored with this sentinel in registrations.batch.
-- It can never collide with a year, which is always 4 digits.
comment on column public.registrations.batch is
  'Batch year ("2005"), the sentinel "non-batch" for attendees outside the cohort, or "" when the event does not collect it.';

-- Turn it on for the Bradby viewing party only. Guarded on null so re-running
-- this migration never overwrites a label the organizer has since renamed.
update public.events
set non_batch_label = 'Non RC'
where slug = 'bradby-shield-2026'
  and non_batch_label is null;
