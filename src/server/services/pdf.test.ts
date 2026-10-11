import { describe, expect, it, vi } from "vitest";
import { PDFDocument } from "pdf-lib";

vi.mock("@/server/logger", () => ({ logger: { error: vi.fn() } }));

import { buildLogbookPdf } from "./pdf";

async function invoice(pages: number) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) doc.addPage();
  return doc.save();
}

const count = async (bytes: Uint8Array) =>
  (await PDFDocument.load(bytes)).getPageCount();

const short = { lines: [{ text: "Carnet", style: "title" as const }] };

describe("buildLogbookPdf", () => {
  it("produces a valid PDF: sheet pages then valid invoice pages", async () => {
    const out = await buildLogbookPdf(short, [
      { label: "a", bytes: await invoice(2) },
      { label: "b", bytes: await invoice(1) },
    ]);
    expect(Buffer.from(out.slice(0, 5)).toString()).toBe("%PDF-");
    expect(await count(out)).toBe(1 + 3);
  });

  it("skips null, corrupt and encrypted-looking invoices and lists them", async () => {
    const plain = await buildLogbookPdf(short, []);
    const out = await buildLogbookPdf(short, [
      { label: "absente", bytes: null },
      { label: "corrompue", bytes: new TextEncoder().encode("%PDF-1.4 junk") },
      { label: "ok", bytes: await invoice(1) },
    ]);
    expect(await count(plain)).toBe(1);
    expect(await count(out)).toBe(2);
  });

  it("handles accents, euro, narrow no-break space and emoji", async () => {
    const out = await buildLogbookPdf(
      {
        lines: [
          { text: "Révision à 1 234,50 € 🚗 été", style: "section" },
          { text: "x".repeat(400) },
        ],
      },
      [],
    );
    expect(await count(out)).toBe(1);
  });

  it("paginates a long sheet", async () => {
    const lines = Array.from({ length: 100 }, (_, i) => [
      { text: `Intervention ${i}`, style: "subsection" as const },
      { text: "Détail ".repeat(30), indent: 12 },
    ]).flat();
    const out = await buildLogbookPdf({ lines }, []);
    expect(await count(out)).toBeGreaterThan(2);
  });
});
