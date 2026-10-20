import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BookDetailPage } from "./BookDetailPage.js";

describe("BookDetailPage", () => {
  it("places the back-to-list link above and outside the detail card", () => {
    const markup = renderToStaticMarkup(<BookDetailPage bookId="test-book" />);

    expect(markup).toContain('href="/books"');
    expect(markup).toContain("← 一覧へ戻る");
    expect(markup.indexOf("book-detail-back-link")).toBeLessThan(markup.indexOf("page-panel"));
  });
});
