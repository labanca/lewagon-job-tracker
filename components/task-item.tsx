"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import {
  deleteTask,
  setTaskDone,
  updateTask,
} from "@/app/(tracker)/actions";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { FormState, Task } from "@/lib/job-tracker";

// One action state for the whole row, so the latest message
// (done / edited / deleted) is the one shown.
async function taskAction(prev: FormState, formData: FormData) {
  switch (formData.get("intent")) {
    case "done":
      return setTaskDone(prev, formData);
    case "delete":
      return deleteTask(prev, formData);
    default:
      return updateTask(prev, formData);
  }
}

export function TaskItem({
  task,
  application,
}: {
  task: Task;
  // Shown on the Tasks page so each task links back to its application.
  application?: { id: string; company: string; position: string };
}) {
  const [state, formAction, pending] = useActionState(taskAction, null);
  const [editing, setEditing] = useState(false);

  function run(fields: Record<string, string>) {
    const formData = new FormData();
    formData.set("id", task.id);
    for (const [key, value] of Object.entries(fields)) formData.set(key, value);
    startTransition(() => formAction(formData));
  }

  function handleEdit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    run({
      intent: "edit",
      title: String(formData.get("title")),
      due_date: String(formData.get("due_date")),
    });
    setEditing(false);
  }

  return (
    <li className="flex flex-col gap-1 border-b border-b-foreground/10 py-3">
      {editing ? (
        <form onSubmit={handleEdit} className="flex flex-wrap items-center gap-2">
          <Input
            name="title"
            required
            defaultValue={task.title}
            aria-label="Title"
            className="flex-1 min-w-48"
          />
          <Input
            name="due_date"
            type="date"
            defaultValue={task.due_date ?? ""}
            aria-label="Due date"
            className="w-auto"
          />
          <Button type="submit" size="sm" disabled={pending}>
            Save
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setEditing(false)}
          >
            Cancel
          </Button>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Checkbox
            checked={task.done}
            disabled={pending}
            onCheckedChange={(checked) =>
              run({ intent: "done", done: String(checked === true) })
            }
            aria-label={task.done ? "Mark as not done" : "Mark as done"}
          />
          <span
            className={`flex-1 ${task.done ? "line-through text-muted-foreground" : ""}`}
          >
            {task.title}
          </span>
          {application && (
            <Link
              href={`/applications/${application.id}`}
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              {application.company}: {application.position}
            </Link>
          )}
          <span className="text-sm text-muted-foreground">
            {task.due_date ? `Due ${task.due_date}` : "No due date"}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => setEditing(true)}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={pending}
            onClick={() => run({ intent: "delete" })}
          >
            Delete
          </Button>
        </div>
      )}
      <FormMessage state={state} />
    </li>
  );
}
