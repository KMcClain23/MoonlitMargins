import { redirect } from "next/navigation";

// Orientation management consolidated onto /admin/orientation (steps,
// mentor assignment, and check-in history all in one place) -- this route
// stays only so an old bookmark or nav-cache link doesn't 404.
export default function AdminOrientationStepsRedirect() {
  redirect("/admin/orientation");
}
