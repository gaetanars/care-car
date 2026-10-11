import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-col gap-3 p-4">
      <h1 className="text-xl font-semibold">Page introuvable</h1>
      <Link href="/" className="underline">
        Retour à l&apos;accueil
      </Link>
    </main>
  );
}
