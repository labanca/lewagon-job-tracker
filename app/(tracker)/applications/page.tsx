import Link from "next/link";
import { Suspense } from "react";
import { ApplicationForm } from "@/components/application-form";
import { ImportApplicationsForm } from "@/components/import-applications-form";
import { Badge } from "@/components/ui/badge";
import { APPLICATION_COLUMNS, type Application } from "@/lib/job-tracker";
import { createClient } from "@/lib/supabase/server";

async function ApplicationsList() {
  const supabase = await createClient();
  // Row level security only returns the logged-in user's applications.
  const { data, error } = await supabase
    .from("applications")
    .select(APPLICATION_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <p className="text-sm text-red-500">
        Could not load applications: {error.message}
      </p>
    );
  }

  const applications = data as Application[];
  if (!applications.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No applications yet. Add your first one above.
      </p>
    );
  }

  return (
    <ul className="flex flex-col">
      {applications.map((app) => (
        <li key={app.id} className="border-b border-b-foreground/10">
          <Link
            href={`/applications/${app.id}`}
            className="flex flex-wrap items-center gap-3 py-3 hover:bg-accent px-2 rounded-md"
          >
            <span className="font-medium">{app.company}</span>
            <span className="flex-1 text-muted-foreground">{app.position}</span>
            <span className="text-sm text-muted-foreground">
              {app.applied_on ?? "No date"}
            </span>
            <Badge variant="outline">{app.status}</Badge>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function ApplicationsPage() {
  return (
    <>
      <section className="flex flex-col gap-4">
        <h1 className="font-bold text-2xl">Job Applications</h1>
        <ApplicationForm />
      </section>
      <section className="flex flex-col gap-4">
        <ImportApplicationsForm />
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="font-bold text-xl">Your applications</h2>
        <Suspense
          fallback={<p className="text-sm text-muted-foreground">Loading...</p>}
        >
          <ApplicationsList />
        </Suspense>
      </section>
    </>
  );
}
