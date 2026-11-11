"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { createTask } from "@/app/(tracker)/actions";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function TaskForm({ applicationId }: { applicationId: string }) {
  const [state, formAction, pending] = useActionState(createTask, null);
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the form only after a successful save.
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-2">
      <input type="hidden" name="application_id" value={applicationId} />
      <div className="flex flex-wrap items-end gap-2">
        <div className="grid gap-2 flex-1 min-w-48">
          <Label htmlFor="task-title">New task</Label>
          <Input id="task-title" name="title" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="task-due-date">Due date</Label>
          <Input id="task-due-date" name="due_date" type="date" />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Add task"}
        </Button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
