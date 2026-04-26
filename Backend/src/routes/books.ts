import { and, desc, eq, inArray, like, ne, or, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import type { AppConfig } from "../config/env.js";
import type { DatabaseClient } from "../db/client.js";
import { bookClassificationTags, books, classificationTags, locations } from "../db/schema.js";
import { validationError } from "../errors.js";
import {
  bookIdParamsSchema,
  bookLookupRequestSchema,
  createBookRequestSchema,
  listBooksQuerySchema,
  updateBookRequestSchema,
  type CreateBookRequest,
  type UpdateBookRequest
} from "../schemas/books.js";
import { lookupBookByIsbn } from "../services/openLibrary.js";

export type BookRouteOptions = {
  config: AppConfig;
  database: DatabaseClient;
};

export async function registerBookRoutes(app: FastifyInstance, options: BookRouteOptions) {
  const { db } = options.database;

  function mapValidationIssues(issues: Array<{ path: PropertyKey[]; message: string }>) {
    return validationError(
      issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message
      }))
    );
  }

  function getBookWithRelations(id: string) {
    const book = db
      .select({
        id: books.id,
        title: books.title,
        author: books.author,
        publisher: books.publisher,
        publishedDate: books.publishedDate,
        isbn: books.isbn,
        bookBarcode: books.bookBarcode,
        managementBarcode: books.managementBarcode,
        externalSource: books.externalSource,
        externalId: books.externalId,
        managementMemo: books.managementMemo,
        createdAt: books.createdAt,
        updatedAt: books.updatedAt,
        locationId: locations.id,
        locationName: locations.name
      })
      .from(books)
      .leftJoin(locations, eq(books.locationId, locations.id))
      .where(eq(books.id, id))
      .get();

    if (!book) {
      return null;
    }

    const tags = db
      .select({
        id: classificationTags.id,
        name: classificationTags.name
      })
      .from(bookClassificationTags)
      .innerJoin(
        classificationTags,
        eq(bookClassificationTags.classificationTagId, classificationTags.id)
      )
      .where(eq(bookClassificationTags.bookId, id))
      .orderBy(classificationTags.name)
      .all();

    return {
      id: book.id,
      title: book.title,
      author: book.author,
      publisher: book.publisher,
      publishedDate: book.publishedDate,
      isbn: book.isbn,
      bookBarcode: book.bookBarcode,
      managementBarcode: book.managementBarcode,
      externalSource: book.externalSource,
      externalId: book.externalId,
      location: book.locationId
        ? {
            id: book.locationId,
            name: book.locationName
          }
        : null,
      classificationTags: tags,
      managementMemo: book.managementMemo,
      createdAt: book.createdAt,
      updatedAt: book.updatedAt
    };
  }

  function assertLocationExists(locationId: string | null | undefined) {
    if (!locationId) {
      return true;
    }

    return Boolean(
      db.select({ id: locations.id }).from(locations).where(eq(locations.id, locationId)).get()
    );
  }

  function getMissingClassificationTagIds(tagIds: string[]) {
    const uniqueIds = [...new Set(tagIds)];

    if (uniqueIds.length === 0) {
      return [];
    }

    const found = db
      .select({ id: classificationTags.id })
      .from(classificationTags)
      .where(inArray(classificationTags.id, uniqueIds))
      .all()
      .map((tag) => tag.id);

    return uniqueIds.filter((id) => !found.includes(id));
  }

  function assertManagementBarcodeIsUnique(
    managementBarcode: string | null | undefined,
    ignoreBookId?: string
  ) {
    if (!managementBarcode) {
      return true;
    }

    const existing = db
      .select({ id: books.id })
      .from(books)
      .where(
        ignoreBookId
          ? and(eq(books.managementBarcode, managementBarcode), ne(books.id, ignoreBookId))
          : eq(books.managementBarcode, managementBarcode)
      )
      .get();

    return !existing;
  }

  function replaceClassificationTags(bookId: string, tagIds: string[]) {
    const now = new Date().toISOString();
    const uniqueIds = [...new Set(tagIds)];

    db.delete(bookClassificationTags).where(eq(bookClassificationTags.bookId, bookId)).run();

    if (uniqueIds.length === 0) {
      return;
    }

    db.insert(bookClassificationTags)
      .values(
        uniqueIds.map((classificationTagId) => ({
          bookId,
          classificationTagId,
          createdAt: now
        }))
      )
      .run();
  }

  function validateBookRelations(payload: CreateBookRequest | UpdateBookRequest) {
    if ("locationId" in payload && !assertLocationExists(payload.locationId)) {
      return {
        field: "locationId",
        message: "Location was not found."
      };
    }

    const missingTagIds =
      "classificationTagIds" in payload && payload.classificationTagIds
        ? getMissingClassificationTagIds(payload.classificationTagIds)
        : [];

    if (missingTagIds.length > 0) {
      return {
        field: "classificationTagIds",
        message: `Classification tags were not found: ${missingTagIds.join(", ")}`
      };
    }

    return null;
  }

  app.get("/api/books", async (request, reply) => {
    const parsed = listBooksQuerySchema.safeParse(request.query);

    if (!parsed.success) {
      return reply.status(400).send(mapValidationIssues(parsed.error.issues));
    }

    const conditions = [];

    if (parsed.data.q) {
      const keyword = `%${parsed.data.q}%`;

      conditions.push(
        or(
          like(books.title, keyword),
          like(books.author, keyword),
          like(books.isbn, keyword),
          like(books.bookBarcode, keyword),
          like(books.managementBarcode, keyword)
        )
      );
    }

    if (parsed.data.locationId) {
      conditions.push(eq(books.locationId, parsed.data.locationId));
    }

    if (parsed.data.classificationTagId) {
      const bookIds = db
        .select({ bookId: bookClassificationTags.bookId })
        .from(bookClassificationTags)
        .where(eq(bookClassificationTags.classificationTagId, parsed.data.classificationTagId))
        .all()
        .map((item) => item.bookId);

      if (bookIds.length === 0) {
        return {
          items: [],
          page: parsed.data.page,
          limit: parsed.data.limit,
          total: 0
        };
      }

      conditions.push(inArray(books.id, bookIds));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const total = db
      .select({ count: sql<number>`count(*)` })
      .from(books)
      .where(where)
      .get()?.count;

    const rows = db
      .select({ id: books.id })
      .from(books)
      .where(where)
      .orderBy(desc(books.updatedAt))
      .limit(parsed.data.limit)
      .offset((parsed.data.page - 1) * parsed.data.limit)
      .all();

    return {
      items: rows.map((row) => getBookWithRelations(row.id)),
      page: parsed.data.page,
      limit: parsed.data.limit,
      total: total ?? 0
    };
  });

  app.post("/api/books", async (request, reply) => {
    const parsed = createBookRequestSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send(mapValidationIssues(parsed.error.issues));
    }

    const relationError = validateBookRelations(parsed.data);

    if (relationError) {
      return reply.status(400).send(validationError([relationError]));
    }

    if (!assertManagementBarcodeIsUnique(parsed.data.managementBarcode)) {
      return reply.status(409).send({
        message: "Management barcode already exists."
      });
    }

    const now = new Date().toISOString();
    const id = randomUUID();

    db.transaction(() => {
      db.insert(books)
        .values({
          id,
          title: parsed.data.title,
          author: parsed.data.author,
          publisher: parsed.data.publisher,
          publishedDate: parsed.data.publishedDate,
          isbn: parsed.data.isbn,
          bookBarcode: parsed.data.bookBarcode,
          managementBarcode: parsed.data.managementBarcode,
          externalSource: parsed.data.externalSource,
          externalId: parsed.data.externalId,
          locationId: parsed.data.locationId ?? null,
          managementMemo: parsed.data.managementMemo,
          createdAt: now,
          updatedAt: now
        })
        .run();

      replaceClassificationTags(id, parsed.data.classificationTagIds);
    });

    return reply.status(201).send(getBookWithRelations(id));
  });

  app.get("/api/books/:id", async (request, reply) => {
    const params = bookIdParamsSchema.safeParse(request.params);

    if (!params.success) {
      return reply.status(400).send(mapValidationIssues(params.error.issues));
    }

    const book = getBookWithRelations(params.data.id);

    if (!book) {
      return reply.status(404).send({
        message: "Book was not found."
      });
    }

    return book;
  });

  app.put("/api/books/:id", async (request, reply) => {
    const params = bookIdParamsSchema.safeParse(request.params);

    if (!params.success) {
      return reply.status(400).send(mapValidationIssues(params.error.issues));
    }

    const parsed = updateBookRequestSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send(mapValidationIssues(parsed.error.issues));
    }

    const current = db.select().from(books).where(eq(books.id, params.data.id)).get();

    if (!current) {
      return reply.status(404).send({
        message: "Book was not found."
      });
    }

    const relationError = validateBookRelations(parsed.data);

    if (relationError) {
      return reply.status(400).send(validationError([relationError]));
    }

    if (!assertManagementBarcodeIsUnique(parsed.data.managementBarcode, params.data.id)) {
      return reply.status(409).send({
        message: "Management barcode already exists."
      });
    }

    db.transaction(() => {
      db.update(books)
        .set({
          title: parsed.data.title ?? current.title,
          author: parsed.data.author === undefined ? current.author : parsed.data.author,
          publisher: parsed.data.publisher === undefined ? current.publisher : parsed.data.publisher,
          publishedDate:
            parsed.data.publishedDate === undefined
              ? current.publishedDate
              : parsed.data.publishedDate,
          isbn: parsed.data.isbn === undefined ? current.isbn : parsed.data.isbn,
          bookBarcode:
            parsed.data.bookBarcode === undefined ? current.bookBarcode : parsed.data.bookBarcode,
          managementBarcode:
            parsed.data.managementBarcode === undefined
              ? current.managementBarcode
              : parsed.data.managementBarcode,
          externalSource:
            parsed.data.externalSource === undefined
              ? current.externalSource
              : parsed.data.externalSource,
          externalId: parsed.data.externalId === undefined ? current.externalId : parsed.data.externalId,
          locationId: parsed.data.locationId === undefined ? current.locationId : parsed.data.locationId,
          managementMemo:
            parsed.data.managementMemo === undefined
              ? current.managementMemo
              : parsed.data.managementMemo,
          updatedAt: new Date().toISOString()
        })
        .where(eq(books.id, params.data.id))
        .run();

      if (parsed.data.classificationTagIds) {
        replaceClassificationTags(params.data.id, parsed.data.classificationTagIds);
      }
    });

    return getBookWithRelations(params.data.id);
  });

  app.delete("/api/books/:id", async (request, reply) => {
    const params = bookIdParamsSchema.safeParse(request.params);

    if (!params.success) {
      return reply.status(400).send(mapValidationIssues(params.error.issues));
    }

    const current = db
      .select({ id: books.id })
      .from(books)
      .where(eq(books.id, params.data.id))
      .get();

    if (!current) {
      return reply.status(404).send({
        message: "Book was not found."
      });
    }

    db.transaction(() => {
      db.delete(bookClassificationTags)
        .where(eq(bookClassificationTags.bookId, params.data.id))
        .run();
      db.delete(books).where(eq(books.id, params.data.id)).run();
    });

    return reply.status(204).send();
  });

  app.post("/api/books/lookup", async (request, reply) => {
    const parsed = bookLookupRequestSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send(mapValidationIssues(parsed.error.issues));
    }

    const result = await lookupBookByIsbn(parsed.data.bookBarcode, options.config);

    if (!result) {
      return reply.status(404).send({
        message: "Book metadata was not found. Please enter it manually."
      });
    }

    return result;
  });
}
