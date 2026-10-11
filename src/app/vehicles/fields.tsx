import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { selectClass } from "./labels";

/** Label + input pair, ids derived from the field name and an optional scope. */
export function Field({
  label,
  name,
  scope = "",
  ...props
}: { label: string; name: string; scope?: string } & ComponentProps<"input">) {
  const id = `${scope}${name}`;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} {...props} />
    </div>
  );
}

export function SelectField({
  label,
  name,
  scope = "",
  options,
  defaultValue,
}: {
  label: string;
  name: string;
  scope?: string;
  options: { value: string | number; label: string }[];
  defaultValue?: string | number;
}) {
  const id = `${scope}${name}`;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        name={name}
        defaultValue={defaultValue}
        className={selectClass}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
