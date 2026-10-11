"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="flex flex-col gap-3 p-4">
      <h1 className="text-xl font-semibold">Une erreur est survenue</h1>
      <div>
        <Button onClick={reset}>Réessayer</Button>
      </div>
    </main>
  );
}
