import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Km } from "./km";

describe("Km", () => {
  it("renders a real non-breaking space, not a literal escape", () => {
    const html = renderToStaticMarkup(
      createElement(Km, { displayedKm: 11967, realKm: 11967 }),
    );
    expect(html).toContain(" km");
    expect(html).not.toContain("\\u00a0");
  });

  it("renders a real non-breaking space in the popover trigger", () => {
    const html = renderToStaticMarkup(
      createElement(Km, { displayedKm: 11967, realKm: 12500 }),
    );
    expect(html).toContain(" km");
    expect(html).not.toContain("\\u00a0");
  });
});
