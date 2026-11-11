import Link from "next/link";
import { Suspense } from "react";
import { TaskItem } from "@/components/task-item";
import type { Task } from "@/lib/job-tracker";
import { createClient } from "@/lib/supabase/server";

type TaskWithApplication = Task & {
  application: { id: string; company: string; position: string };
};

async function TasksList() {
  const supabase = await createClient();
  // Row level security only returns the logged-in user's tasks.
  const { data, error } = await supabase
    .from("tasks")
    .select(
      "id, application_id, title, due_date, done, application:applications(id, company, position)",
    )
    .order("due_date", { ascending: true, nullsFirst: false });

  if (error) {
    return (
      <p className="text-sm text-red-500">
        Could not load tasks: {error.message}
      </p>
    );
  }

  const tasks = data as unknown as TaskWithApplication[];
  if (!tasks.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No tasks yet. Open an{" "}
        <Link href="/applications" className="underline">
          application
        </Link>{" "}
        to add one.
      </p>
    );
  }

  return (
    <ul className="flex flex-col">
      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} application={task.application} />
      ))}
    </ul>
  );
}

export default function TasksPage() {
  return (
    <section className="flex flex-col gap-4">
      <h1 className="font-bold text-2xl">Tasks</h1>
      <Suspense
        fallback={<p className="text-sm text-muted-foreground">Loading...</p>}
      >
        <TasksList />
      </Suspense>
    </section>
  );
}
