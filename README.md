# Job Tracker

A small web app to keep track of job applications and the to-dos that go with
them. Each user signs up with email and password and sees **only their own
data**: this is enforced by the database itself (Supabase row level security),
not just by the app.

Built as a Le Wagon course project on top of the official
[Next.js + Supabase starter](https://github.com/vercel/next.js/tree/canary/examples/with-supabase).

## Features

- **Accounts**: sign up, log in, log out, forgot / update password (from the
  starter template). Logging in takes you straight to your applications.
- **Applications**: create, list, view, edit and delete job applications with:
  - company and position (required)
  - status: `Backlog` (saved, not applied yet; the default), `Applied`,
    `Interview`, `Offer`, `Rejected` (the company said no) or `Withdrawn` (you
    gave up)
  - application date and notes
  - location: country, state / province, city
  - expected **annual** salary as a range (minimum and maximum) with a 3-letter
    currency code (e.g. `BRL`, `USD`, `EUR`)
- **Tasks**: each task belongs to one application and has a title, a due date
  and a done / not done checkbox. Add them on an application's page; the
  **Tasks** page lists all your tasks with a link back to their application.
  Tasks can be edited and deleted. Deleting an application (after a
  confirmation) also deletes its tasks.
- **CSV import**: upload a CSV file on the Applications page to add many
  applications at once. It is all-or-nothing: if any row is invalid, nothing is
  imported and you get the list of rows to fix.
- **Clear feedback**: every form shows a message when something is saved or
  goes wrong.
- **Light and dark theme** switcher in the navigation bar.

## Tech stack

| Part | Technology |
| --- | --- |
| Framework | [Next.js](https://nextjs.org) 16 (App Router, Server Components, Server Actions) |
| UI | React 19, TypeScript, Tailwind CSS 3, shadcn/ui components (Radix UI), lucide-react icons, next-themes |
| Backend | [Supabase](https://supabase.com): PostgreSQL database, Auth (email + password), row level security |
| Supabase client | `@supabase/ssr` + `@supabase/supabase-js` (session stored in cookies) |

## Setup (fresh clone)

### 1. Prerequisites

- [Node.js](https://nodejs.org) **20.9 or newer** (includes `npm`)
- [Git](https://git-scm.com)
- A free [Supabase](https://supabase.com) account

### 2. Clone and install

```bash
git clone https://github.com/labanca/lewagon-job-tracker.git
cd lewagon-job-tracker
npm install
```

### 3. Create a Supabase project

1. In the [Supabase dashboard](https://supabase.com/dashboard), click
   **New project** and wait until it is ready.
2. Go to **Authentication → URL Configuration** and set **Site URL** to
   `http://localhost:3000`, so the confirmation links in sign-up emails open
   your local app.

### 4. Set the environment variables

Copy the example file:

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in the values from your Supabase project
(**Project Settings → API**, or the **Connect** button on the project page):

| Variable | Where to find it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL, like `https://<your-project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | The **publishable** key (starts with `sb_publishable_`). The legacy `anon` key also works. |

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_<your-key>
```

These two are the only variables the app needs. The publishable key is safe
to expose in the browser because row level security decides what each user can
read and write.

> **Never commit `.env.local`.** It is already listed in `.gitignore`.
> Do **not** put the Supabase *secret* / `service_role` key in a
> `NEXT_PUBLIC_` variable: that key bypasses all security rules.

### 5. Create the database tables (SQL migration)

1. In the Supabase dashboard, open **SQL Editor** and click **New query**.
2. Copy the whole content of
   [`supabase/migrations/001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql),
   paste it and click **Run**. The expected result is
   `Success. No rows returned`.

This creates the `applications` and `tasks` tables and the row level security
rules (each rule has a plain-English comment above it).

You can check it worked in **Table Editor**: both tables should be listed with
**RLS enabled**.

> `supabase/migrations/002_withdrawn_status.sql` is only for databases created
> *before* the `Withdrawn` status existed. On a new project, `001` already
> includes it, so you can skip `002`.

### 6. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), click **Sign up**, confirm
your email using the link Supabase sends you, then log in. You will land on
**Applications**.

## Importing applications from CSV

On the **Applications** page, use **Import from CSV**. A ready-made example is
in [`supabase/sample_applications.csv`](supabase/sample_applications.csv).

- The first line must be a header with column names.
- Required columns: `company`, `position`.
- Optional columns: `status`, `applied_on` (format `YYYY-MM-DD`), `notes`,
  `country`, `state`, `city`, `salary_min`, `salary_max` (per year),
  `salary_currency` (3 letters).
- An empty `status` becomes `Backlog`; upper / lower case does not matter.
- Do not include `id` or `user_id`: imported rows are linked to the logged-in
  user automatically.

```csv
company,position,status,applied_on,notes
Brightline Software,Frontend Developer,Applied,2026-11-03,Applied through the careers page
```

## Project structure

```text
app/
  (tracker)/                  pages that share the navigation bar
    layout.tsx                navigation: Applications · Tasks · theme · login
    actions.ts                server actions: create / update / delete / CSV import
    applications/page.tsx     list + new application form + CSV import
    applications/[id]/page.tsx  application details, edit, delete, its tasks
    tasks/page.tsx            all tasks of the logged-in user
  auth/                       login, sign up, password pages (starter template)
  page.tsx                    redirects to /applications
components/                   forms and UI pieces (components/ui = shadcn/ui)
lib/
  job-tracker.ts              types and the list of statuses
  csv.ts                      small CSV reader used by the import
  supabase/                   Supabase clients for browser, server and proxy
proxy.ts                      sends logged-out visitors to the login page
supabase/
  migrations/                 SQL to run in the Supabase SQL Editor
  sample_applications.csv     example data for the CSV import
```

## Available scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server on http://localhost:3000 |
| `npm run build` | Build for production |
| `npm start` | Run the production build |
| `npm run lint` | Run ESLint |

> `npm run lint` also scans the generated `.next` folder and reports errors
> there. To lint only the source code, run `npx eslint app components lib proxy.ts`.
