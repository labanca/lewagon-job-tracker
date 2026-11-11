import { redirect } from "next/navigation";

// Leftover page from the starter template: send it to the app instead.
export default function ProtectedPage() {
  redirect("/applications");
}
