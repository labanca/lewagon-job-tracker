"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import {
  createApplication,
  deleteApplication,
  updateApplication,
} from "@/app/(tracker)/actions";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { STATUSES, type Application } from "@/lib/job-tracker";

const fieldClass =
  "w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

// Without `application` the form creates a new one; with it, it edits it.
export function ApplicationForm({
  application,
}: {
  application?: Application;
}) {
  const [state, formAction, pending] = useActionState(
    application ? updateApplication : createApplication,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the "new application" form only after a successful save, so the
  // user does not lose what they typed when something goes wrong.
  useEffect(() => {
    if (state?.ok && !application) formRef.current?.reset();
  }, [state, application]);

  function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-4">
      {application && <input type="hidden" name="id" value={application.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="company">Company</Label>
          <Input
            id="company"
            name="company"
            required
            defaultValue={application?.company}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="position">Position</Label>
          <Input
            id="position"
            name="position"
            required
            defaultValue={application?.position}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            defaultValue={application?.status ?? "Backlog"}
            className={`${fieldClass} h-9`}
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="applied_on">Application date</Label>
          <Input
            id="applied_on"
            name="applied_on"
            type="date"
            defaultValue={application?.applied_on ?? ""}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="country">Country</Label>
          <Input
            id="country"
            name="country"
            defaultValue={application?.country ?? ""}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="state">State / Province</Label>
          <Input
            id="state"
            name="state"
            defaultValue={application?.state ?? ""}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" defaultValue={application?.city ?? ""} />
        </div>
      </div>
      <fieldset className="grid gap-4 grid-cols-[1fr_1fr_8rem]">
        <legend className="text-sm font-medium mb-2">
          Annual salary expectation (per year)
        </legend>
        <div className="grid gap-2">
          <Label htmlFor="salary_min">Minimum per year</Label>
          <Input
            id="salary_min"
            name="salary_min"
            type="number"
            min="0"
            step="0.01"
            defaultValue={application?.salary_min ?? ""}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="salary_max">Maximum per year</Label>
          <Input
            id="salary_max"
            name="salary_max"
            type="number"
            min="0"
            step="0.01"
            defaultValue={application?.salary_max ?? ""}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="salary_currency">Currency</Label>
          <Input
            id="salary_currency"
            name="salary_currency"
            placeholder="BRL"
            maxLength={3}
            className="uppercase"
            defaultValue={application?.salary_currency ?? ""}
          />
        </div>
      </fieldset>
      <div className="grid gap-2">
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={application?.notes ?? ""}
          className={fieldClass}
        />
      </div>
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending
            ? "Saving..."
            : application
              ? "Save changes"
              : "Add application"}
        </Button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function DeleteApplicationForm({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState(deleteApplication, null);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (
          !confirm(
            "Delete this application? Its tasks will be deleted too. This cannot be undone.",
          )
        ) {
          e.preventDefault();
        }
      }}
      className="flex items-center gap-4"
    >
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="destructive" disabled={pending}>
        {pending ? "Deleting..." : "Delete application"}
      </Button>
      <FormMessage state={state} />
    </form>
  );
}
