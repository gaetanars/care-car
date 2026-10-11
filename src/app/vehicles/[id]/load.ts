import "server-only";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { getVehicle } from "@/server/data/vehicles";
import { id as idSchema } from "../schemas";

/** Session + owned vehicle, or 404 (not owned and unknown ids look the same). */
export async function loadVehicle(params: Promise<{ id: string }>) {
  const user = await requireUser();
  const parsed = idSchema.safeParse((await params).id);
  const vehicle = parsed.success ? getVehicle(user.id, parsed.data) : null;
  if (!vehicle) notFound();
  return { user, vehicle };
}
