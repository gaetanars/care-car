import "server-only";
import { headers } from "next/headers";
import { getAuth } from "./auth";

/** Current user, or null if not signed in or not on the allow-list (SPEC §13.6). */
export async function getAllowedUser() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session?.user.allowed) return null;
  return session.user;
}
