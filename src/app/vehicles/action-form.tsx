"use client";

import { useActionState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

export type FormState = { error?: string };

/** `<form>` bound to a server action that may return an error message. */
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
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className={className}>
      {children}
      {state.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      <Button type="submit" variant={variant} size={size} disabled={pending}>
        {submitLabel}
      </Button>
    </form>
  );
}
