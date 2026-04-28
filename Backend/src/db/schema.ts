import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const locations = sqliteTable(
  "locations",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull()
  },
  (table) => ({
    nameIdx: uniqueIndex("locations_name_idx").on(table.name)
  })
);

export const books = sqliteTable(
  "books",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    author: text("author"),
    publisher: text("publisher"),
    publishedDate: text("published_date"),
    isbn: text("isbn"),
    bookBarcode: text("book_barcode"),
    managementBarcode: text("management_barcode"),
    externalSource: text("external_source"),
    externalId: text("external_id"),
    locationId: text("location_id").references(() => locations.id),
    managementMemo: text("management_memo"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull()
  },
  (table) => ({
    managementBarcodeIdx: uniqueIndex("books_management_barcode_idx").on(table.managementBarcode)
  })
);

export const classificationTags = sqliteTable(
  "classification_tags",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    source: text("source", { enum: ["manual", "ndl_search", "open_library"] }).notNull(),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull()
  },
  (table) => ({
    nameIdx: uniqueIndex("classification_tags_name_idx").on(table.name)
  })
);

export const bookClassificationTags = sqliteTable(
  "book_classification_tags",
  {
    bookId: text("book_id")
      .notNull()
      .references(() => books.id),
    classificationTagId: text("classification_tag_id")
      .notNull()
      .references(() => classificationTags.id),
    createdAt: text("created_at").notNull()
  },
  (table) => ({
    bookTagIdx: uniqueIndex("book_classification_tags_book_tag_idx").on(
      table.bookId,
      table.classificationTagId
    )
  })
);

export const externalLookupCache = sqliteTable(
  "external_lookup_cache",
  {
    id: text("id").primaryKey(),
    isbn: text("isbn").notNull(),
    provider: text("provider", { enum: ["ndl_search", "open_library"] }).notNull(),
    status: text("status", { enum: ["hit", "miss"] }).notNull(),
    payload: text("payload"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    expiresAt: text("expires_at").notNull()
  },
  (table) => ({
    providerIsbnIdx: uniqueIndex("external_lookup_cache_provider_isbn_idx").on(
      table.provider,
      table.isbn
    )
  })
);
