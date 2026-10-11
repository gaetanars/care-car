"use client";

import { useCallback, useState, type ReactNode } from "react";
import { ActionForm, type FormState } from "@/app/vehicles/action-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * Text button opening a dialog around an `ActionForm` (bottom sheet on mobile).
 * Fields are `children`, laid out on a grid; `danger` (e.g. a delete form) sits
 * at the foot of the dialog.
 */
export function EditDialog({
  triggerLabel,
  title,
  action,
  submitLabel,
  triggerVariant = "secondary",
  danger,
  children,
}: {
  triggerLabel: string;
  title: string;
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  triggerVariant?: "default" | "outline" | "secondary";
  danger?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant={triggerVariant} size="sm" />}
        className="min-h-11"
      >
        {triggerLabel}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-heading">{title}</DialogTitle>
        </DialogHeader>
        <ActionForm
          action={action}
          submitLabel={submitLabel}
          onSuccess={close}
          className="grid gap-4 sm:grid-cols-3 [&>[role=alert]]:col-span-full [&>button]:col-span-full"
        >
          {children}
        </ActionForm>
        {danger && <div className="border-t border-line pt-4">{danger}</div>}
      </DialogContent>
    </Dialog>
  );
}
