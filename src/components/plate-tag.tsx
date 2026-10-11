/** Registration plate as a pill (`AB-123-CD`); does not imitate the official plate. */
export function PlateTag({
  plate,
  className,
}: {
  plate: string;
  className?: string;
}) {
  return (
    <span
      className={`text-label inline-flex h-[26px] items-center rounded-full border-[1.5px] border-line-strong bg-surface-200 px-3 tracking-[0.12em] whitespace-nowrap text-ink tabular-nums ${className ?? ""}`}
    >
      {plate}
    </span>
  );
}
