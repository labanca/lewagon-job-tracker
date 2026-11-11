import { redirect } from "next/navigation";

// The home page goes straight to the app. Logged-out visitors are then sent
// to the login page by the proxy (lib/supabase/proxy.ts).
export default function Home() {
  redirect("/applications");
}
