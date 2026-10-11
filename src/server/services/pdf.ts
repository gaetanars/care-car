import "server-only";
import {
  PDFDocument,
  StandardFonts,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import { logger } from "@/server/logger";

export type SheetStyle = "title" | "section" | "subsection" | "body" | "muted";

/** One already-formatted line of the logbook sheet; this service only lays out. */
export interface SheetLine {
  text: string;
  style?: SheetStyle;
  indent?: number;
}

export interface LogbookSheet {
  lines: SheetLine[];
}

export interface InvoiceInput {
  /** Shown in the sheet if the invoice cannot be merged. */
  label: string;
  bytes: Uint8Array | null;
}

const PAGE = { width: 595.28, height: 841.89 };
const MARGIN = 50;
const FOOTER_Y = 28;
const STYLES: Record<
  SheetStyle,
  { size: number; bold: boolean; before: number }
> = {
  title: { size: 20, bold: true, before: 0 },
  section: { size: 14, bold: true, before: 16 },
  subsection: { size: 11, bold: true, before: 8 },
  body: { size: 10, bold: false, before: 0 },
  muted: { size: 9, bold: false, before: 0 },
};

/** Standard fonts are WinAnsi: NNBSP (Intl fr-FR thousands) → NBSP, anything else unknown → `?`. */
function sanitize(text: string, font: PDFFont): string {
  const known = new Set(font.getCharacterSet());
  return [...text.replaceAll(" ", " ")]
    .map((c) => (known.has(c.codePointAt(0)!) ? c : "?"))
    .join("");
}

/** Greedy word wrap; words wider than the line are cut by character. */
function wrap(text: string, font: PDFFont, size: number, width: number) {
  const fits = (s: string) => font.widthOfTextAtSize(s, size) <= width;
  const out: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const candidate = line ? `${line} ${word}` : word;
    if (fits(candidate)) {
      line = candidate;
      continue;
    }
    if (line) out.push(line);
    line = "";
    let rest = word;
    while (!fits(rest)) {
      let n = rest.length - 1;
      while (n > 1 && !fits(rest.slice(0, n))) n--;
      out.push(rest.slice(0, n));
      rest = rest.slice(n);
    }
    line = rest;
  }
  out.push(line);
  return out;
}

type Merged =
  { label: string; pages: PDFPage[] } | { label: string; pages: null };

async function loadInvoice(
  doc: PDFDocument,
  { label, bytes }: InvoiceInput,
): Promise<Merged> {
  if (bytes === null) return { label, pages: null };
  try {
    const source = await PDFDocument.load(bytes);
    return {
      label,
      pages: await doc.copyPages(source, source.getPageIndices()),
    };
  } catch (error) {
    logger.error("invoice not merged in logbook", {
      label,
      error: String(error),
    });
    return { label, pages: null };
  }
}

/** A4 sheet laid out from `sheet`, followed by the readable invoices in the given order (SPEC §10). */
export async function buildLogbookPdf(
  sheet: LogbookSheet,
  invoices: InvoiceInput[],
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  // Merged before drawing: unreadable invoices are listed in the sheet.
  const merged: Merged[] = [];
  for (const invoice of invoices) merged.push(await loadInvoice(doc, invoice));
  const skipped = merged.filter((m) => m.pages === null);
  const lines: SheetLine[] = [...sheet.lines];
  if (skipped.length > 0) {
    lines.push({ text: "Factures non incluses", style: "section" });
    for (const m of skipped) lines.push({ text: `- ${m.label}`, indent: 12 });
  }

  const sheetPages: PDFPage[] = [];
  const newPage = () => {
    const page = doc.addPage([PAGE.width, PAGE.height]);
    sheetPages.push(page);
    return page;
  };
  let page = newPage();
  let y = PAGE.height - MARGIN;
  for (const { text, style = "body", indent = 0 } of lines) {
    const { size, bold: isBold, before } = STYLES[style];
    const font = isBold ? bold : regular;
    const leading = size * 1.35;
    const rows = wrap(
      sanitize(text, font),
      font,
      size,
      PAGE.width - 2 * MARGIN - indent,
    );
    if (y - before - leading < MARGIN) {
      page = newPage();
      y = PAGE.height - MARGIN;
    } else if (y < PAGE.height - MARGIN) {
      y -= before;
    }
    for (const row of rows) {
      if (y - leading < MARGIN) {
        page = newPage();
        y = PAGE.height - MARGIN;
      }
      y -= leading;
      page.drawText(row, { x: MARGIN + indent, y, size, font });
    }
  }
  sheetPages.forEach((p, i) => {
    const text = `page ${i + 1}/${sheetPages.length}`;
    p.drawText(text, {
      x: PAGE.width - MARGIN - regular.widthOfTextAtSize(text, 9),
      y: FOOTER_Y,
      size: 9,
      font: regular,
    });
  });

  for (const m of merged) for (const p of m.pages ?? []) doc.addPage(p);
  return doc.save();
}
