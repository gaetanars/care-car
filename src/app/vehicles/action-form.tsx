"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Banner } from "@/components/banner";
import { Button } from "@/components/ui/button";

/** `warning`: non-blocking, resubmit with `confirmMileage=1` to confirm (SPEC §7). */
export type FormState = { error?: string; warning?: string };

const INITIAL: FormState = {};

/**
 * `<form>` bound to a server action that may return an error or a warning.
 * Submits by hand rather than through `action=` so the fields survive an error
 * or a warning (React would reset them); they are cleared on success only.
 */
export function ActionForm({
  action,
  submitLabel,
  variant = "default",
  size = "default",
  className = "flex flex-col gap-4",
  total,
  onSuccess,
  children,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  variant?: "default" | "outline" | "secondary" | "destructive";
  size?: "default" | "sm";
  className?: string;
  /** Sticky total bar shown with the submit button (intervention form). */
  total?: ReactNode;
  /** Called after a successful submission, next to the form reset. */
  onSuccess?: () => void;
  children?: ReactNode;
}) {
  const [state, dispatch, pending] = useActionState(action, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);
  // A warning only covers the values that triggered it: editing a field dismisses it.
  const [dismissed, setDismissed] = useState<FormState | null>(null);
  const warning = state.warning && dismissed !== state ? state.warning : null;

  useEffect(() => {
    if (state !== INITIAL && !state.error && !state.warning) {
      formRef.current?.reset();
      onSuccess?.();
    }
  }, [state, onSuccess]);

  return (
    <form
      ref={formRef}
      className={className}
      onChange={(event) => {
        if (
          state.warning &&
          (event.target as unknown as HTMLInputElement).name !==
            "confirmMileage"
        ) {
          setDismissed(state);
        }
      }}
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(
          event.currentTarget,
          (event.nativeEvent as SubmitEvent).submitter,
        );
        startTransition(() => dispatch(data));
      }}
    >
      {children}
      {state.error && <Banner tone="late" role="alert" title={state.error} />}
      {warning && (
        <Banner tone="warn" role="alert" title={warning}>
          <label className="mt-2 flex min-h-11 items-center gap-3 font-semibold">
            <input
              type="checkbox"
              name="confirmMileage"
              value="1"
              required
              className="size-[22px] accent-brand"
            />
            Je confirme ce kilométrage
          </label>
        </Banner>
      )}
      {total ? (
        <div className="sticky bottom-24 z-30 flex items-center justify-between gap-4 rounded-lg bg-surface-200 px-4 py-3 shadow-lift min-[900px]:bottom-4">
          {total}
          <Button
            type="submit"
            variant={variant}
            size={size}
            disabled={pending}
          >
            {submitLabel}
          </Button>
        </div>
      ) : (
        <Button
          type="submit"
          variant={variant}
          size={size}
          disabled={pending}
          className="w-full sm:w-auto sm:self-start"
        >
          {submitLabel}
        </Button>
      )}
    </form>
  );
}
