"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { rotateCalendarTokenAction, type FeedState } from "./actions";

/** iCal feed: the URL is shown once, right after generation (SPEC §7, §9). */
export function FeedForm({ activeSince }: { activeSince: string | null }) {
  const [state, dispatch, pending] = useActionState<FeedState>(
    rotateCalendarTokenAction,
    {},
  );
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      {state.url ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm">
            Copiez cette URL maintenant : elle ne sera plus affichée.
          </p>
          <Input
            readOnly
            value={state.url}
            aria-label="URL du flux"
            data-testid="feed-url"
          />
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              await navigator.clipboard.writeText(state.url ?? "");
              setCopied(true);
            }}
          >
            {copied ? "Copié" : "Copier"}
          </Button>
        </div>
      ) : (
        <p className="text-sm" data-testid="feed-status">
          {activeSince ? `Flux actif depuis le ${activeSince}.` : "Aucun flux."}
        </p>
      )}
      {state.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      {activeSince && (
        <p className="text-muted-foreground text-sm">
          Régénérer révoque l&apos;ancienne URL : elle cessera de fonctionner.
        </p>
      )}
      <form
        action={() => {
          setCopied(false);
          dispatch();
        }}
      >
        <Button type="submit" disabled={pending}>
          {activeSince ? "Régénérer" : "Générer"}
        </Button>
      </form>
    </div>
  );
}
