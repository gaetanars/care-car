"use server";

import { revalidatePath } from "next/cache";
import { getAllowedUser } from "@/server/auth/session";
import { rotateCalendarToken } from "@/server/data/calendar-tokens";
import {
  hashCalendarToken,
  newCalendarToken,
} from "@/server/services/calendar-token";

export type FeedState = { url?: string; error?: string };

/** Generates or regenerates the iCal token; the URL is returned once, only its hash is stored (SPEC §9). */
export async function rotateCalendarTokenAction(): Promise<FeedState> {
  const user = await getAllowedUser();
  if (!user) return { error: "Session expirée : reconnectez-vous." };
  const token = newCalendarToken();
  rotateCalendarToken(user.id, hashCalendarToken(token));
  revalidatePath("/account");
  return { url: `${process.env.APP_URL}/calendar/${token}.ics` };
}
