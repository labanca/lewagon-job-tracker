import { AlertTriangle } from "lucide-react";

// Single-series bar colour: blue, with its own step for the dark theme.
const BAR = "bg-[#2a78d6] dark:bg-[#3987e5]";

export type Datum = { label: string; value: number };

const formatNumber = (n: number) => n.toLocaleString("en-US");

function percent(value: number, total: number) {
  return total ? `${Math.round((value / total) * 100)}%` : "0%";
}

// KPI tile ---------------------------------------------------------------------

export function StatTile({
  label,
  value,
  hint,
  alert = false,
}: {
  label: string;
  value: string;
  hint?: string;
  // Shows a warning icon and label (never colour alone).
  alert?: boolean;
}) {
  return (
    <div className="rounded-lg border p-4 flex flex-col gap-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-3xl font-semibold">{value}</span>
      {alert ? (
        <span className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
          <AlertTriangle size={14} aria-hidden /> Needs attention
        </span>
      ) : (
        hint && <span className="text-xs text-muted-foreground">{hint}</span>
      )}
    </div>
  );
}

// Tooltip shown on hover / keyboard focus of a bar ----------------------------

function Tooltip({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <span
      role="tooltip"
      className={`${className} pointer-events-none absolute z-10 hidden whitespace-nowrap rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md group-hover:block group-focus-visible:block`}
    >
      {children}
    </span>
  );
}

// "View as table" for every chart ---------------------------------------------

function DataTable({
  data,
  labelHeader,
  total,
}: {
  data: Datum[];
  labelHeader: string;
  total?: number;
}) {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-muted-foreground">
        View as table
      </summary>
      <table className="mt-2 w-full max-w-sm">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="font-medium py-1">{labelHeader}</th>
            <th className="font-medium py-1 text-right">Count</th>
            {total !== undefined && (
              <th className="font-medium py-1 text-right">Share</th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.label} className="border-t border-t-foreground/10">
              <td className="py-1">{d.label}</td>
              <td className="py-1 text-right tabular-nums">
                {formatNumber(d.value)}
              </td>
              {total !== undefined && (
                <td className="py-1 text-right tabular-nums">
                  {percent(d.value, total)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

// Horizontal bars: one row per category, value at the bar's tip --------------

export function BarList({
  data,
  total,
  labelHeader,
}: {
  data: Datum[];
  // When given, each value also shows its share of this total.
  total?: number;
  labelHeader: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-1">
        {data.map((d) => {
          const text =
            total !== undefined
              ? `${formatNumber(d.value)} (${percent(d.value, total)})`
              : formatNumber(d.value);
          return (
            <li
              key={d.label}
              tabIndex={0}
              aria-label={`${d.label}: ${text}`}
              className="group relative grid grid-cols-[7rem_1fr] items-center gap-3 rounded-sm py-1 hover:bg-accent focus-visible:bg-accent outline-none"
            >
              <span className="truncate text-sm">{d.label}</span>
              <span className="flex items-center gap-2">
                {d.value > 0 && (
                  <span
                    className={`${BAR} h-5 shrink-0 rounded-r-[4px]`}
                    style={{ width: `${(d.value / max) * 70}%` }}
                  />
                )}
                <span className="whitespace-nowrap text-sm text-muted-foreground tabular-nums">
                  {text}
                </span>
              </span>
              <Tooltip className="bottom-full left-28 mb-1">
                {d.label}: {text}
              </Tooltip>
            </li>
          );
        })}
      </ul>
      <DataTable data={data} labelHeader={labelHeader} total={total} />
    </div>
  );
}

// Vertical columns over time, value on each non-zero cap ----------------------

export function ColumnChart({
  data,
  labelHeader,
}: {
  data: Datum[];
  labelHeader: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-44 items-end gap-[2px] border-b border-b-foreground/20">
        {data.map((d) => (
          <div
            key={d.label}
            tabIndex={0}
            aria-label={`${d.label}: ${formatNumber(d.value)}`}
            className="group relative flex h-full flex-1 flex-col items-center justify-end outline-none hover:bg-accent focus-visible:bg-accent rounded-t-sm"
          >
            {d.value > 0 && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {formatNumber(d.value)}
              </span>
            )}
            <span
              className={`${BAR} w-full max-w-6 rounded-t-[4px]`}
              style={{ height: `${(d.value / max) * 80}%` }}
            />
            <Tooltip className="bottom-full mb-1">
              {d.label}: {formatNumber(d.value)}
            </Tooltip>
          </div>
        ))}
      </div>
      <div className="flex gap-[2px]">
        {data.map((d, i) => (
          <span
            key={d.label}
            className="flex-1 text-center text-[10px] text-muted-foreground"
          >
            {/* Label every other week (always the latest) so the axis is not crowded. */}
            {i % 2 === (data.length - 1) % 2 ? d.label : ""}
          </span>
        ))}
      </div>
      <DataTable data={data} labelHeader={labelHeader} />
    </div>
  );
}
