"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
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
  className = "flex flex-col gap-3",
  children,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  variant?: "default" | "outline" | "destructive";
  size?: "default" | "sm";
  className?: string;
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
    }
  }, [state]);

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
      {state.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      {warning && (
        <div role="alert" className="flex flex-col gap-2 text-sm">
          <p>{warning}</p>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="confirmMileage" value="1" required />
            Je confirme ce kilométrage
          </label>
        </div>
      )}
      <Button type="submit" variant={variant} size={size} disabled={pending}>
        {submitLabel}
      </Button>
    </form>
  );
}
