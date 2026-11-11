import { STATUSES, type Application, type Task } from "./job-tracker";

const DAY = 24 * 60 * 60 * 1000;

// Dates are handled as "YYYY-MM-DD" strings read as UTC midnight, so that
// time zones never shift a day.
function toTime(date: string) {
  return Date.parse(`${date}T00:00:00Z`);
}

function toDate(time: number) {
  return new Date(time).toISOString().slice(0, 10);
}

// Monday of the week that contains `date`.
function weekStart(date: string) {
  const time = toTime(date);
  const daysSinceMonday = (new Date(time).getUTCDay() + 6) % 7;
  return toDate(time - daysSinceMonday * DAY);
}

export type DashboardStats = {
  total: number;
  sent: number;
  active: number;
  offers: number;
  interviewRate: number | null;
  overdueTasks: number;
  byStatus: { label: string; value: number }[];
  byWeek: { label: string; value: number }[];
  withoutDate: number;
  byCountry: { label: string; value: number }[];
};

export function computeStats(
  applications: Pick<Application, "status" | "applied_on" | "country">[],
  tasks: Pick<Task, "done" | "due_date">[],
  today: string,
  weeks = 12,
): DashboardStats {
  const count = (status: string) =>
    applications.filter((a) => a.status === status).length;

  // "Sent" = everything except Backlog (jobs saved but not applied to yet).
  const sent = applications.length - count("Backlog");
  // Based on the current status only: an application rejected after an
  // interview no longer counts as interviewed.
  const interviewed = count("Interview") + count("Offer");

  // Applications per week (by application date), oldest week first.
  const thisWeek = weekStart(today);
  const byWeek = Array.from({ length: weeks }, (_, i) => {
    const start = toDate(toTime(thisWeek) - (weeks - 1 - i) * 7 * DAY);
    return {
      start,
      label: new Date(toTime(start)).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
      value: 0,
    };
  });
  for (const app of applications) {
    if (!app.applied_on) continue;
    const week = byWeek.find((w) => w.start === weekStart(app.applied_on!));
    if (week) week.value++;
  }

  // Top 5 countries; applications without a country are grouped as "Not set".
  const countries = new Map<string, number>();
  for (const app of applications) {
    const country = app.country?.trim() || "Not set";
    countries.set(country, (countries.get(country) ?? 0) + 1);
  }
  const byCountry = [...countries]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
    .slice(0, 5);

  return {
    total: applications.length,
    sent,
    active: count("Applied") + count("Interview"),
    offers: count("Offer"),
    interviewRate: sent ? interviewed / sent : null,
    overdueTasks: tasks.filter(
      (t) => !t.done && t.due_date !== null && t.due_date < today,
    ).length,
    byStatus: STATUSES.map((status) => ({
      label: status,
      value: count(status),
    })),
    byWeek: byWeek.map(({ label, value }) => ({ label, value })),
    withoutDate: applications.filter((a) => !a.applied_on).length,
    byCountry,
  };
}

// Open tasks that are overdue or due within the next `days` days.
export function upcomingTasks<T extends Pick<Task, "done" | "due_date">>(
  tasks: T[],
  today: string,
  days = 7,
): T[] {
  const until = toDate(toTime(today) + days * DAY);
  return tasks
    .filter((t) => !t.done && t.due_date !== null && t.due_date <= until)
    .sort((a, b) => a.due_date!.localeCompare(b.due_date!));
}
