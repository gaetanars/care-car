import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const number = new Intl.NumberFormat("fr-FR");

/** Displayed km; when the real km differs (counter change), it shows in a popover (SPEC §6.1). */
export function Km({
  displayedKm,
  realKm,
}: {
  displayedKm: number;
  realKm: number;
}) {
  if (displayedKm === realKm) return <>{number.format(displayedKm)} km</>;
  return (
    <Popover>
      <PopoverTrigger
        className="underline decoration-dotted"
        aria-label={`${number.format(displayedKm)} km affichés, voir le km réel`}
      >
        {number.format(displayedKm)} km
      </PopoverTrigger>
      <PopoverContent>
        Km réel : {number.format(realKm)} km (compteur remplacé).
      </PopoverContent>
    </Popover>
  );
}
