import { Suspense } from "react";
import { requireUser } from "@/server/auth/session";

async function Account() {
  const user = await requireUser();
  return <p data-testid="account-email">{user.email}</p>;
}

export default function AccountPage() {
  return (
    <main className="p-4">
      <h1 className="text-xl font-semibold">Compte</h1>
      <Suspense fallback={<p>Chargement…</p>}>
        <Account />
      </Suspense>
    </main>
  );
}
