import type { FormState } from "@/lib/job-tracker";

export function FormMessage({ state }: { state: FormState }) {
  if (!state) return null;
  return (
    <p
      role={state.ok ? "status" : "alert"}
      className={
        state.ok
          ? "text-sm text-green-600 dark:text-green-400"
          : "text-sm text-red-500 whitespace-pre-line"
      }
    >
      {state.message}
    </p>
  );
}
