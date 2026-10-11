import { Suspense } from "react";
import { redirect } from "next/navigation";
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
        <p role="alert" className="text-destructive">
          {REFUSED.includes(error)
            ? "Cette adresse n'est pas autorisée. Demandez à l'administrateur de l'ajouter."
            : "La connexion a échoué. Réessayez."}
        </p>
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
    <main className="mx-auto flex max-w-sm flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">care-car</h1>
      <p className="text-muted-foreground">Carnet d&apos;entretien véhicules</p>
      <Suspense fallback={<p>Chargement…</p>}>
        <LoginForm searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
