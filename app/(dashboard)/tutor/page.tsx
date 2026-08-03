import { redirect } from "next/navigation";

/** Legacy route — use AI Study Hub instead. */
export default function TutorRedirectPage() {
  redirect("/ai-hub");
}
