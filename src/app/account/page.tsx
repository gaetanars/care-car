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
      <p data-testid="account-email" className="text-caption text-ink-muted">
        {user.email}
      </p>
      <h2 className="text-heading">Flux iCal</h2>
      <p className="text-body-sm text-ink-muted">
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
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6">
      <h1 className="text-title">Paramètres</h1>
      <Suspense fallback={<p>Chargement…</p>}>
        <Account />
      </Suspense>
    </main>
  );
}
