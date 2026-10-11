import { Check, Info, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

const TONES = {
  late: { box: "bg-late-fill text-late-ink", Icon: TriangleAlert },
  warn: { box: "bg-warn-fill text-warn-ink", Icon: TriangleAlert },
  ok: { box: "bg-ok-fill text-ok-ink", Icon: Check },
  neutral: { box: "bg-surface-300 text-ink", Icon: Info },
};

/** Boxed message: the title states the fact, the body the consequence or the action. */
export function Banner({
  tone,
  title,
  children,
  className,
  ...props
}: {
  tone: keyof typeof TONES;
  title?: string;
  children?: ReactNode;
  className?: string;
} & Omit<React.ComponentProps<"div">, "title">) {
  const { box, Icon } = TONES[tone];
  return (
    <div
      className={`flex items-start gap-3 rounded-md p-4 text-[15px] leading-[22px] ${box} ${className ?? ""}`}
      {...props}
    >
      <Icon className="mt-px size-5 shrink-0" aria-hidden />
      <div className="min-w-0">
        {title && <strong className="block font-semibold">{title}</strong>}
        {children}
      </div>
    </div>
  );
}
