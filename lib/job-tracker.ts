export const STATUSES = [
  "Backlog",
  "Applied",
  "Interview",
  "Offer",
  "Rejected",
  "Withdrawn",
] as const;

export type Status = (typeof STATUSES)[number];

export type Application = {
  id: string;
  company: string;
  position: string;
  status: Status;
  applied_on: string | null;
  notes: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  // Annual salary expectation range.
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
};

// Columns to select whenever an Application is loaded.
export const APPLICATION_COLUMNS =
  "id, company, position, status, applied_on, notes, country, state, city, salary_min, salary_max, salary_currency";

export type Task = {
  id: string;
  application_id: string;
  title: string;
  due_date: string | null;
  done: boolean;
};

// Result returned by every server action, shown to the user under the form.
export type FormState = { ok: boolean; message: string } | null;
