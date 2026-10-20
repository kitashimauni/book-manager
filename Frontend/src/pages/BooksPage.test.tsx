import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Book } from "../api/client.js";
import { BookCard } from "./BooksPage.js";

const book: Book = {
  id: "book-123",
  title: "タイトルの視認性を確認する本",
  author: "テスト著者",
  publisher: "出版社",
  publishedDate: "2024-03",
  isbn: "9780132350884",
  bookBarcode: "9780132350884",
  managementBarcode: null,
  externalSource: null,
  externalId: null,
  location: null,
  classificationTags: [],
  managementMemo: null,
  createdAt: "2026-01-02T03:04:05Z",
  updatedAt: "2026-01-02T03:04:05Z"
};

describe("BookCard", () => {
  it("emphasizes title and author and shows the publication date", () => {
    const html = renderToStaticMarkup(<BookCard book={book} isDeleting={false} onDelete={() => {}} />);

    expect(html).toContain('class="book-card-title"');
    expect(html).toContain('class="book-card-author"');
    expect(html).toContain("タイトルの視認性を確認する本");
    expect(html).toContain("テスト著者");
    expect(html).toContain('class="book-card-primary"');
    expect(html).toContain('class="book-card-secondary"');
    expect(html).toContain('<p class="book-card-publication">出版日：<span>2024-03</span></p>');
    expect(html).toContain('<details class="book-card-identifiers">');
    expect(html).toContain("ISBN・バーコードなどの詳細情報");
    expect(html.indexOf('class="book-card-title"')).toBeLessThan(html.indexOf('class="book-card-identifiers"'));
    expect(html).toContain("<dt>ISBN</dt><dd>9780132350884</dd>");
    expect(html).toContain("保管場所未設定");
  });

  it("shows an explicit fallback if publication date or author is unknown", () => {
    const html = renderToStaticMarkup(
      <BookCard book={{ ...book, publishedDate: null, author: null }} isDeleting={false} onDelete={() => {}} />
    );
    expect(html).toContain("出版日：<span>未設定</span>");
    expect(html).toContain("著者未設定");
  });
});
