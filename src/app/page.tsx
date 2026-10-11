import { Suspense } from "react";
import Link from "next/link";
import { getAllowedUser } from "@/server/auth/session";
import { SignInButton } from "./login/sign-in-button";
import { SignOutButton } from "./sign-out-button";

async function Home() {
  const user = await getAllowedUser();
  if (!user) return <SignInButton />;
  return (
    <>
      <p data-testid="home-email">{user.email}</p>
      {user.role === "admin" && (
        <Link href="/admin" className="underline">
          Administration
        </Link>
      )}
      <div>
        <SignOutButton />
      </div>
    </>
  );
}

export default function HomePage() {
  return (
    <main className="flex flex-col gap-3 p-4">
      <h1 className="text-xl font-semibold">care-car</h1>
      <p className="text-muted-foreground">Carnet d&apos;entretien véhicules</p>
      <Suspense fallback={<p>Chargement…</p>}>
        <Home />
      </Suspense>
    </main>
  );
}
