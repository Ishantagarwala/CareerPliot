import { redirect } from "next/navigation";

/** Study With Me removed from nav — send users to AI Study Hub. */
export default function StudyRedirectPage() {
  redirect("/ai-hub");
}
