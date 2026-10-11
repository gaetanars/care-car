import "server-only";
import { notFound } from "next/navigation";
import { getIntervention } from "@/server/data/interventions";
import { id as idSchema } from "../../../schemas";
import { loadVehicle } from "../../load";

/** Owned vehicle + one of its interventions, or 404. */
export async function loadIntervention(
  params: Promise<{ id: string; interventionId: string }>,
) {
  const { vehicle, user } = await loadVehicle(params);
  const parsed = idSchema.safeParse((await params).interventionId);
  const intervention = parsed.success
    ? getIntervention(user.id, parsed.data)
    : null;
  if (!intervention || intervention.vehicleId !== vehicle.id) notFound();
  return { user, vehicle, intervention };
}
