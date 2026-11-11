import Link from "next/link";
import { Suspense } from "react";
import {
  BarList,
  ColumnChart,
  StatTile,
} from "@/components/dashboard/charts";
import { computeStats, upcomingTasks } from "@/lib/dashboard-stats";
import type { Application, Task } from "@/lib/job-tracker";
import { createClient } from "@/lib/supabase/server";

type UpcomingTask = Task & {
  application: { id: string; company: string; position: string };
};

async function DashboardContent() {
  const supabase = await createClient();
  // Row level security only returns the logged-in user's rows.
  const [appsResult, tasksResult] = await Promise.all([
    supabase.from("applications").select("status, applied_on, country"),
    supabase
      .from("tasks")
      .select(
        "id, application_id, title, due_date, done, application:applications(id, company, position)",
      ),
  ]);

  const error = appsResult.error ?? tasksResult.error;
  if (error) {
    return (
      <p className="text-sm text-red-500">
        Could not load the dashboard: {error.message}
      </p>
    );
  }

  const applications = appsResult.data as Pick<
    Application,
    "status" | "applied_on" | "country"
  >[];
  const tasks = tasksResult.data as unknown as UpcomingTask[];

  if (!applications.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No data yet.{" "}
        <Link href="/applications" className="underline">
          Add or import your first applications
        </Link>{" "}
        to see your stats here.
      </p>
    );
  }

  // Today's date on the server, as YYYY-MM-DD.
  const today = new Date().toLocaleDateString("en-CA");
  const stats = computeStats(applications, tasks, today);
  const upcoming = upcomingTasks(tasks, today);

  return (
    <>
      <section className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Total applications" value={String(stats.total)} />
        <StatTile
          label="Sent"
          value={String(stats.sent)}
          hint="Everything except Backlog"
        />
        <StatTile
          label="In progress"
          value={String(stats.active)}
          hint="Applied + Interview"
        />
        <StatTile
          label="Interview rate"
          value={
            stats.interviewRate === null
              ? "–"
              : `${Math.round(stats.interviewRate * 100)}%`
          }
          hint="Interview + Offer ÷ sent"
        />
        <StatTile label="Offers" value={String(stats.offers)} />
        <StatTile
          label="Overdue tasks"
          value={String(stats.overdueTasks)}
          alert={stats.overdueTasks > 0}
          hint="All caught up"
        />
      </section>
      <p className="-mt-6 text-xs text-muted-foreground">
        Rates use each application&apos;s current status only: an application
        rejected after an interview counts as Rejected.
      </p>

      <div className="grid gap-10 md:grid-cols-2">
        <section className="flex flex-col gap-3">
          <h2 className="font-bold text-xl">Applications by status</h2>
          <BarList
            data={stats.byStatus}
            total={stats.total}
            labelHeader="Status"
          />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-bold text-xl">Top countries</h2>
          <BarList data={stats.byCountry} labelHeader="Country" />
        </section>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-bold text-xl">Applications per week</h2>
        <p className="text-sm text-muted-foreground">
          Last 12 weeks, by application date (weeks start on Monday).
          {stats.withoutDate > 0 &&
            ` ${stats.withoutDate} application${stats.withoutDate === 1 ? " has" : "s have"} no date and ${stats.withoutDate === 1 ? "is" : "are"} not shown.`}
        </p>
        <ColumnChart data={stats.byWeek} labelHeader="Week of" />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-bold text-xl">Upcoming tasks</h2>
        <p className="text-sm text-muted-foreground">
          Open tasks that are overdue or due in the next 7 days.
        </p>
        {upcoming.length ? (
          <ul className="flex flex-col">
            {upcoming.map((task) => {
              const overdue = task.due_date! < today;
              return (
                <li
                  key={task.id}
                  className="flex flex-wrap items-center gap-3 border-b border-b-foreground/10 py-2"
                >
                  <span className="flex-1">{task.title}</span>
                  <Link
                    href={`/applications/${task.application.id}`}
                    className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                  >
                    {task.application.company}: {task.application.position}
                  </Link>
                  <span
                    className={`text-sm tabular-nums ${overdue ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}
                  >
                    {overdue ? `Overdue (${task.due_date})` : `Due ${task.due_date}`}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nothing due in the next 7 days.
          </p>
        )}
      </section>
    </>
  );
}

export default function DashboardPage() {
  return (
    <>
      <h1 className="font-bold text-2xl">Dashboard</h1>
      <Suspense
        fallback={<p className="text-sm text-muted-foreground">Loading...</p>}
      >
        <DashboardContent />
      </Suspense>
    </>
  );
}
