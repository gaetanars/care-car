import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Banner } from "@/components/banner";
import { getAllowedUser } from "@/server/auth/session";
import { SignInButton } from "./sign-in-button";

const REFUSED = ["signup_disabled", "not_allowed"];

async function LoginForm({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getAllowedUser()) redirect("/");
  const { error } = await searchParams;
  return (
    <>
      {error && (
        <Banner tone="late" role="alert" title="Connexion refusée">
          {REFUSED.includes(error)
            ? "Cette adresse n'est pas autorisée. Demandez à l'administrateur de l'ajouter."
            : "La connexion a échoué. Réessayez."}
        </Banner>
      )}
      <SignInButton />
    </>
  );
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-col gap-4 px-4 py-10">
      <h1 className="text-display">CareCar</h1>
      <p className="text-ink-muted">Carnet d&apos;entretien véhicules</p>
      <Suspense fallback={<p>Chargement…</p>}>
        <LoginForm searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
