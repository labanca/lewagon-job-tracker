import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  ApplicationForm,
  DeleteApplicationForm,
} from "@/components/application-form";
import { TaskForm } from "@/components/task-form";
import { TaskItem } from "@/components/task-item";
import {
  APPLICATION_COLUMNS,
  type Application,
  type Task,
} from "@/lib/job-tracker";
import { createClient } from "@/lib/supabase/server";

async function ApplicationDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Row level security hides applications that belong to other users,
  // so someone else's id simply comes back as "not found".
  const [applicationResult, tasksResult] = await Promise.all([
    supabase
      .from("applications")
      .select(APPLICATION_COLUMNS)
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("tasks")
      .select("id, application_id, title, due_date, done")
      .eq("application_id", id)
      .order("due_date", { ascending: true, nullsFirst: false }),
  ]);

  const error = applicationResult.error ?? tasksResult.error;
  if (error) {
    return (
      <p className="text-sm text-red-500">
        Could not load this application: {error.message}
      </p>
    );
  }
  if (!applicationResult.data) notFound();

  const application = applicationResult.data as Application;
  const tasks = tasksResult.data as Task[];

  return (
    <>
      <section className="flex flex-col gap-4">
        <h1 className="font-bold text-2xl">
          {application.company}: {application.position}
        </h1>
        <ApplicationForm application={application} />
        <DeleteApplicationForm id={application.id} />
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="font-bold text-xl">Tasks</h2>
        <TaskForm applicationId={application.id} />
        {tasks.length ? (
          <ul className="flex flex-col">
            {tasks.map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No tasks for this application yet.
          </p>
        )}
      </section>
    </>
  );
}

export default function ApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <>
      <Link
        href="/applications"
        className="text-sm text-muted-foreground hover:underline"
      >
        ← Back to applications
      </Link>
      <Suspense
        fallback={<p className="text-sm text-muted-foreground">Loading...</p>}
      >
        <ApplicationDetail params={params} />
      </Suspense>
    </>
  );
}
