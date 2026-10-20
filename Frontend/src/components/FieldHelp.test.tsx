import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FieldHelp } from "./FieldHelp.js";

describe("FieldHelp", () => {
  it("renders a keyboard-accessible, initially closed help button", () => {
    const markup = renderToStaticMarkup(
      <div className="field-label-with-help">
        <label htmlFor="bookBarcode">本のバーコード / ISBN</label>
        <FieldHelp label="本のバーコード / ISBN">ISBNの説明</FieldHelp>
      </div>
    );

    expect(markup).toContain('for="bookBarcode"');
    expect(markup).toContain('aria-label="本のバーコード / ISBNの説明"');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain('type="button"');
    expect(markup).toContain('class="field-help-popover" hidden=""');
    expect(markup).toContain("ISBNの説明");
    expect(markup).not.toMatch(/<label[^>]*>.*<button/s);
  });
});
