"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { importApplications } from "@/app/(tracker)/actions";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ImportApplicationsForm() {
  const [state, formAction, pending] = useActionState(importApplications, null);
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the chosen file only after a successful import.
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
      <Label htmlFor="csv-file">Import from CSV</Label>
      <p className="text-sm text-muted-foreground">
        First line must be a header. Required columns: company, position.
        Optional: status, applied_on (YYYY-MM-DD), notes, country, state, city,
        salary_min, salary_max (per year), salary_currency.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          id="csv-file"
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
          className="w-auto"
        />
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Importing..." : "Import"}
        </Button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
