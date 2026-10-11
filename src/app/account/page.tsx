import { Suspense } from "react";
import { requireUser } from "@/server/auth/session";
import { getActiveCalendarToken } from "@/server/data/calendar-tokens";
import { FeedForm } from "./feed-form";

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

async function Account() {
  const user = await requireUser();
  const active = getActiveCalendarToken(user.id);
  return (
    <>
      <p data-testid="account-email">{user.email}</p>
      <h2 className="font-medium">Flux iCal</h2>
      <p className="text-muted-foreground text-sm">
        Abonnez Apple Calendar à cette URL pour recevoir les échéances, avec une
        alerte 28 jours avant.
      </p>
      <FeedForm
        activeSince={active ? dateFormat.format(active.createdAt) : null}
      />
    </>
  );
}

export default function AccountPage() {
  return (
    <main className="flex flex-col gap-3 p-4">
      <h1 className="text-xl font-semibold">Paramètres</h1>
      <Suspense fallback={<p>Chargement…</p>}>
        <Account />
      </Suspense>
    </main>
  );
}
