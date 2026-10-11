import { getAllowedUser } from "@/server/auth/session";
import { NavLinks } from "./nav-links";

/** Rendered for signed-in users only; the login page has no navigation. */
export async function AppNav() {
  const user = await getAllowedUser();
  if (!user) return null;
  return <NavLinks isAdmin={user.role === "admin"} />;
}
