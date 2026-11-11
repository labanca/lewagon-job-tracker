"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { parseCsv } from "@/lib/csv";
import { createClient } from "@/lib/supabase/server";
import { STATUSES, type FormState, type Status } from "@/lib/job-tracker";

// Every action checks the session first. Row ownership is enforced by the
// row level security policies in supabase/migrations/001_initial_schema.sql.
async function getSupabase() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims ? supabase : null;
}

const NOT_LOGGED_IN: FormState = {
  ok: false,
  message: "You are not logged in. Please log in again.",
};

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function readApplication(formData: FormData) {
  const status = text(formData, "status");
  const salaryMin = text(formData, "salary_min");
  const salaryMax = text(formData, "salary_max");
  return {
    company: text(formData, "company"),
    position: text(formData, "position"),
    status: (STATUSES as readonly string[]).includes(status)
      ? (status as Status)
      : null,
    applied_on: text(formData, "applied_on") || null,
    notes: text(formData, "notes") || null,
    country: text(formData, "country") || null,
    state: text(formData, "state") || null,
    city: text(formData, "city") || null,
    // NaN when the user typed something that is not a number.
    salary_min: salaryMin ? Number(salaryMin) : null,
    salary_max: salaryMax ? Number(salaryMax) : null,
    salary_currency: text(formData, "salary_currency").toUpperCase() || null,
  };
}

function validateApplication(
  values: ReturnType<typeof readApplication>,
): FormState {
  if (!values.company || !values.position) {
    return { ok: false, message: "Company and position are required." };
  }
  if (!values.status) {
    return { ok: false, message: "Please choose a valid status." };
  }
  for (const salary of [values.salary_min, values.salary_max]) {
    if (salary !== null && !(salary >= 0)) {
      return {
        ok: false,
        message: "Annual salary values must be numbers of 0 or more.",
      };
    }
  }
  if (
    values.salary_min !== null &&
    values.salary_max !== null &&
    values.salary_max < values.salary_min
  ) {
    return {
      ok: false,
      message: "Maximum annual salary cannot be lower than the minimum.",
    };
  }
  if (values.salary_currency && !/^[A-Z]{3}$/.test(values.salary_currency)) {
    return {
      ok: false,
      message: "Currency must be a 3-letter code, like BRL, USD or EUR.",
    };
  }
  return null;
}

// Applications ----------------------------------------------------------------

export async function createApplication(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await getSupabase();
  if (!supabase) return NOT_LOGGED_IN;

  const values = readApplication(formData);
  const invalid = validateApplication(values);
  if (invalid) return invalid;

  // user_id is filled in by the database with the logged-in user's id.
  const { error } = await supabase.from("applications").insert(values);
  if (error) {
    return { ok: false, message: `Could not save: ${error.message}` };
  }

  refresh();
  return { ok: true, message: "Application saved." };
}

export async function updateApplication(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await getSupabase();
  if (!supabase) return NOT_LOGGED_IN;

  const values = readApplication(formData);
  const invalid = validateApplication(values);
  if (invalid) return invalid;

  const { data, error } = await supabase
    .from("applications")
    .update(values)
    .eq("id", text(formData, "id"))
    .select("id");
  if (error) {
    return { ok: false, message: `Could not save: ${error.message}` };
  }
  if (!data.length) {
    return { ok: false, message: "Application not found." };
  }

  refresh();
  return { ok: true, message: "Changes saved." };
}

export async function deleteApplication(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await getSupabase();
  if (!supabase) return NOT_LOGGED_IN;

  // Its tasks are deleted too (on delete cascade).
  const { data, error } = await supabase
    .from("applications")
    .delete()
    .eq("id", text(formData, "id"))
    .select("id");
  if (error) {
    return { ok: false, message: `Could not delete: ${error.message}` };
  }
  if (!data.length) {
    return { ok: false, message: "Application not found." };
  }

  redirect("/applications");
}

// CSV import --------------------------------------------------------------------

const IMPORT_COLUMNS = [
  "company",
  "position",
  "status",
  "applied_on",
  "notes",
  "country",
  "state",
  "city",
  "salary_min",
  "salary_max",
  "salary_currency",
];

function isValidDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}

// Imports every row of the uploaded CSV, or nothing at all if any row is
// invalid, so a fixed file can simply be uploaded again.
export async function importApplications(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await getSupabase();
  if (!supabase) return NOT_LOGGED_IN;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Please choose a CSV file." };
  }

  const [header, ...rows] = parseCsv(await file.text());
  if (!header) return { ok: false, message: "The file is empty." };

  const columns = header.map((name) => name.trim().toLowerCase());
  const unknown = columns.filter((name) => !IMPORT_COLUMNS.includes(name));
  if (unknown.length) {
    return {
      ok: false,
      message: `Unknown column(s): ${unknown.join(", ")}. Allowed columns: ${IMPORT_COLUMNS.join(", ")}.`,
    };
  }
  if (!columns.includes("company") || !columns.includes("position")) {
    return {
      ok: false,
      message: "The first line must be a header with at least the columns company and position.",
    };
  }
  if (!rows.length) {
    return { ok: false, message: "The file has no rows after the header." };
  }

  const errors: string[] = [];
  const applications: ReturnType<typeof readApplication>[] = [];

  rows.forEach((row, index) => {
    const label = `Row ${index + 1}`;
    if (row.length !== columns.length) {
      errors.push(
        `${label}: has ${row.length} values but the header has ${columns.length} columns.`,
      );
      return;
    }

    const fields = new FormData();
    columns.forEach((name, i) => fields.set(name, row[i]));

    // Empty status means Backlog; otherwise match it ignoring upper/lower case.
    const status = text(fields, "status");
    const match = status
      ? STATUSES.find((s) => s.toLowerCase() === status.toLowerCase())
      : "Backlog";
    if (!match) {
      errors.push(
        `${label}: unknown status "${status}". Use one of: ${STATUSES.join(", ")}.`,
      );
      return;
    }
    fields.set("status", match);

    const values = readApplication(fields);
    if (values.applied_on && !isValidDate(values.applied_on)) {
      errors.push(
        `${label}: applied_on "${values.applied_on}" must be a date like 2026-11-30.`,
      );
      return;
    }
    const invalid = validateApplication(values);
    if (invalid) {
      errors.push(`${label}: ${invalid.message}`);
      return;
    }
    applications.push(values);
  });

  if (errors.length) {
    const shown = errors.slice(0, 10);
    if (errors.length > shown.length) {
      shown.push(`...and ${errors.length - shown.length} more.`);
    }
    return {
      ok: false,
      message: `Nothing was imported. Fix these rows (row 1 is the first line after the header) and try again:\n${shown.join("\n")}`,
    };
  }

  // One insert for all rows: the database saves all of them or none.
  // user_id is filled in by the database with the logged-in user's id.
  const { error } = await supabase.from("applications").insert(applications);
  if (error) {
    return { ok: false, message: `Nothing was imported: ${error.message}` };
  }

  refresh();
  return {
    ok: true,
    message: `Imported ${applications.length} application${applications.length === 1 ? "" : "s"}.`,
  };
}

// Tasks -----------------------------------------------------------------------

export async function createTask(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await getSupabase();
  if (!supabase) return NOT_LOGGED_IN;

  const title = text(formData, "title");
  if (!title) return { ok: false, message: "Title is required." };

  const { error } = await supabase.from("tasks").insert({
    application_id: text(formData, "application_id"),
    title,
    due_date: text(formData, "due_date") || null,
  });
  if (error) {
    return { ok: false, message: `Could not save: ${error.message}` };
  }

  refresh();
  return { ok: true, message: "Task saved." };
}

export async function updateTask(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await getSupabase();
  if (!supabase) return NOT_LOGGED_IN;

  const title = text(formData, "title");
  if (!title) return { ok: false, message: "Title is required." };

  const { data, error } = await supabase
    .from("tasks")
    .update({ title, due_date: text(formData, "due_date") || null })
    .eq("id", text(formData, "id"))
    .select("id");
  if (error) {
    return { ok: false, message: `Could not save: ${error.message}` };
  }
  if (!data.length) return { ok: false, message: "Task not found." };

  refresh();
  return { ok: true, message: "Task saved." };
}

export async function setTaskDone(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await getSupabase();
  if (!supabase) return NOT_LOGGED_IN;

  const done = text(formData, "done") === "true";
  const { data, error } = await supabase
    .from("tasks")
    .update({ done })
    .eq("id", text(formData, "id"))
    .select("id");
  if (error) {
    return { ok: false, message: `Could not save: ${error.message}` };
  }
  if (!data.length) return { ok: false, message: "Task not found." };

  refresh();
  return {
    ok: true,
    message: done ? "Task marked as done." : "Task marked as not done.",
  };
}

export async function deleteTask(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await getSupabase();
  if (!supabase) return NOT_LOGGED_IN;

  const { data, error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", text(formData, "id"))
    .select("id");
  if (error) {
    return { ok: false, message: `Could not delete: ${error.message}` };
  }
  if (!data.length) return { ok: false, message: "Task not found." };

  refresh();
  return { ok: true, message: "Task deleted." };
}
