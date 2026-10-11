"use client";

import { useActionState, useState } from "react";
import { Copy } from "lucide-react";
import { Banner } from "@/components/banner";
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
    <div className="flex flex-col gap-4 rounded-lg bg-surface-200 p-6 shadow-soft">
      {state.url ? (
        <div className="flex flex-col gap-2">
          <p className="text-body-sm">
            Copiez cette URL maintenant : elle ne sera plus affichée.
          </p>
          <div className="flex gap-2">
            <Input
              readOnly
              value={state.url}
              aria-label="URL du flux"
              data-testid="feed-url"
              className="min-w-0 flex-1 text-sm"
              onFocus={(e) => e.currentTarget.select()}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(state.url ?? "");
                setCopied(true);
              }}
            >
              <Copy aria-hidden />
              {copied ? "Copié" : "Copier"}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-body-sm" data-testid="feed-status">
          {activeSince ? `Flux actif depuis le ${activeSince}.` : "Aucun flux."}
        </p>
      )}
      {state.error && <Banner tone="late" role="alert" title={state.error} />}
      {activeSince && (
        <p className="text-body-sm text-ink-muted">
          Régénérer révoque l&apos;ancienne URL : elle cessera de fonctionner.
        </p>
      )}
      <form
        action={() => {
          setCopied(false);
          dispatch();
        }}
      >
        <Button
          type="submit"
          variant={activeSince ? "outline" : "default"}
          disabled={pending}
        >
          {activeSince ? "Régénérer" : "Générer"}
        </Button>
      </form>
    </div>
  );
}
