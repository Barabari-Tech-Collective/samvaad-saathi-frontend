import { redirect } from "next/navigation";

// Resume screening is a staff tool and lives in the staff workspace.
export default function Page() {
  redirect("/home");
}
