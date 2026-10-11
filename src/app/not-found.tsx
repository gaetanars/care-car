import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6">
      <h1 className="text-title">Page introuvable</h1>
      <Link href="/" className="underline">
        Retour à l&apos;accueil
      </Link>
    </main>
  );
}
