-- Job Tracker: add the "Withdrawn" status.
-- Run this once in the Supabase dashboard (SQL Editor) on a database that
-- already has 001_initial_schema.sql. (A new database created from the
-- current 001 already includes it, so there you can skip this file.)

-- Replace the list of allowed statuses with one that also accepts "Withdrawn".
-- "Rejected" means the company said no; "Withdrawn" means the user gave up.
alter table public.applications
  drop constraint applications_status_check;

alter table public.applications
  add constraint applications_status_check
  check (status in ('Backlog', 'Applied', 'Interview', 'Offer', 'Rejected', 'Withdrawn'));
