import { redirect } from "next/navigation";

// Interview and Collab were merged into one page with a toggle -- this
// route stays alive as a redirect so any existing bookmarks/links keep working.
export default function InterviewRedirect() {
  redirect("/partner?type=interview");
}
