-- Job Tracker: database schema
-- Run this once in the Supabase dashboard (SQL Editor) on a new project.

-- =============================================================================
-- Applications: one row per job the user is tracking.
-- =============================================================================

create table public.applications (
  -- A unique id for each application, created automatically.
  id uuid primary key default gen_random_uuid(),

  -- The owner of the row. It is filled in automatically with the id of the
  -- logged-in user, and if that user account is deleted, their applications
  -- are deleted too.
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,

  -- Company name and job title can never be left empty.
  company text not null,
  position text not null,

  -- The status must be one of these six words. A new application starts as
  -- "Backlog" (saved, but not applied to yet). "Rejected" means the company
  -- said no; "Withdrawn" means the user gave up on the application.
  status text not null default 'Backlog'
    check (status in ('Backlog', 'Applied', 'Interview', 'Offer', 'Rejected', 'Withdrawn')),

  applied_on date,
  notes text,

  -- Where the job is. All optional.
  country text,
  state text,
  city text,

  -- Expected yearly salary, as a range. Neither value can be negative.
  salary_min numeric(12, 2) check (salary_min >= 0),
  salary_max numeric(12, 2) check (salary_max >= 0),

  -- The currency must be a 3-letter code in capitals, like BRL, USD or EUR.
  salary_currency text check (salary_currency ~ '^[A-Z]{3}$'),

  -- The time the row was created, filled in automatically.
  created_at timestamptz not null default now(),

  -- If both ends of the salary range are filled in, the maximum cannot be
  -- lower than the minimum.
  constraint applications_salary_range_check
    check (salary_max is null or salary_min is null or salary_max >= salary_min)
);

comment on column public.applications.salary_min is 'Annual salary expectation, lower bound';
comment on column public.applications.salary_max is 'Annual salary expectation, upper bound';

-- Turn on row level security: from now on nobody can see or change any row
-- unless one of the rules below allows it.
alter table public.applications enable row level security;

-- Rule: a logged-in user can only see their own applications.
create policy "Users can read their own applications"
  on public.applications for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Rule: a logged-in user can only add applications that belong to themselves.
create policy "Users can create their own applications"
  on public.applications for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- Rule: a logged-in user can only edit their own applications, and cannot
-- hand an application over to another user.
create policy "Users can update their own applications"
  on public.applications for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Rule: a logged-in user can only delete their own applications.
create policy "Users can delete their own applications"
  on public.applications for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- =============================================================================
-- Tasks: to-dos that belong to one application.
-- =============================================================================

create table public.tasks (
  -- A unique id for each task, created automatically.
  id uuid primary key default gen_random_uuid(),

  -- The owner of the row, filled in automatically with the logged-in user's
  -- id. Deleting the user account deletes their tasks too.
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,

  -- The application this task belongs to. Every task must have one, and
  -- deleting the application deletes its tasks too.
  application_id uuid not null references public.applications (id) on delete cascade,

  -- A task always needs a title.
  title text not null,

  due_date date,

  -- A new task starts as not done.
  done boolean not null default false,

  -- The time the row was created, filled in automatically.
  created_at timestamptz not null default now()
);

-- Makes it fast to find all the tasks of one application.
create index tasks_application_id_idx on public.tasks (application_id);

-- Turn on row level security: from now on nobody can see or change any task
-- unless one of the rules below allows it.
alter table public.tasks enable row level security;

-- Rule: a logged-in user can only see their own tasks.
create policy "Users can read their own tasks"
  on public.tasks for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Rule: a logged-in user can only add a task for themselves, and only to an
-- application that they own (not to someone else's application).
create policy "Users can create their own tasks"
  on public.tasks for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.applications a
      where a.id = application_id and a.user_id = (select auth.uid())
    )
  );

-- Rule: a logged-in user can only edit their own tasks, and cannot move a
-- task to someone else's application or hand it over to another user.
create policy "Users can update their own tasks"
  on public.tasks for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.applications a
      where a.id = application_id and a.user_id = (select auth.uid())
    )
  );

-- Rule: a logged-in user can only delete their own tasks.
create policy "Users can delete their own tasks"
  on public.tasks for delete
  to authenticated
  using ((select auth.uid()) = user_id);
