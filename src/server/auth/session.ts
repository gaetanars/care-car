import "server-only";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getAuth } from "./auth";

/** Current user, or null if not signed in or not on the allow-list (SPEC §13.6). */
export async function getAllowedUser() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session?.user.allowed) return null;
  return session.user;
}

/** Redirects to the login page when not signed in or not allowed. */
export async function requireUser() {
  const user = await getAllowedUser();
  if (!user) redirect("/login");
  return user;
}

/** Non-admins get a 404: the admin area is not advertised. */
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") notFound();
  return user;
}
