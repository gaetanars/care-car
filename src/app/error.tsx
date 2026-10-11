"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6">
      <h1 className="text-title">Une erreur est survenue</h1>
      <div>
        <Button onClick={reset}>Réessayer</Button>
      </div>
    </main>
  );
}
