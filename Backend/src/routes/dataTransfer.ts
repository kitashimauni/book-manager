import { eq, inArray } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { DatabaseClient } from "../db/client.js";
import { bookClassificationTags, books, classificationTags, locations } from "../db/schema.js";
import { validationError, type ApiFieldError } from "../errors.js";
import {
  importPayloadSchema,
  importRequestSchema,
  type ExportBook,
  type ExportBookClassificationTag,
  type ExportClassificationTag,
  type ExportLocation,
  type ImportAction,
  type ImportEntity,
  type ImportPayload,
  type ImportRequest
} from "../schemas/dataTransfer.js";

export type DataTransferRouteOptions = {
  database: DatabaseClient;
};

type ImportConflict = {
  entity: ImportEntity;
  matchBy: "id" | "managementBarcode" | "name";
  incomingId: string;
  existingId: string;
  defaultAction: "skip";
  availableActions: ["overwrite", "skip"];
};

type ImportPreview = {
  summary: {
    create: number;
    conflict: number;
    error: number;
  };
  conflicts: ImportConflict[];
  errors: ApiFieldError[];
};

type ExistingMaps = {
  booksById: Map<string, { id: string }>;
  booksByManagementBarcode: Map<string, { id: string }>;
  locationsById: Map<string, { id: string }>;
  locationsByName: Map<string, { id: string }>;
  tagsById: Map<string, { id: string }>;
  tagsByName: Map<string, { id: string }>;
};

export async function registerDataTransferRoutes(
  app: FastifyInstance,
  options: DataTransferRouteOptions
) {
  const { db } = options.database;

  app.get("/api/export", async () =>
    db.transaction(() => ({
      version: 1,
      exportedAt: new Date().toISOString(),
      books: db.select().from(books).all(),
      locations: db.select().from(locations).all(),
      classificationTags: db.select().from(classificationTags).all(),
      bookClassificationTags: db.select().from(bookClassificationTags).all()
    }))
  );

  app.post("/api/import/preview", async (request, reply) => {
    const parsed = importPayloadSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send(toValidationError(parsed.error.issues));
    }

    const preview = buildPreview(parsed.data, getExistingMaps());

    return preview;
  });

  app.post("/api/import", async (request, reply) => {
    const parsed = importRequestSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send(toValidationError(parsed.error.issues));
    }

    const existingMaps = getExistingMaps();
    const preview = buildPreview(parsed.data, existingMaps);

    if (preview.errors.length > 0) {
      return reply.status(400).send(validationError(preview.errors));
    }

    const result = importData(parsed.data, existingMaps, preview.conflicts);

    return result;
  });

  function getExistingMaps(): ExistingMaps {
    const existingBooks = db.select().from(books).all();
    const existingLocations = db.select().from(locations).all();
    const existingTags = db.select().from(classificationTags).all();

    return {
      booksById: new Map(existingBooks.map((book) => [book.id, { id: book.id }])),
      booksByManagementBarcode: new Map(
        existingBooks
          .filter((book) => book.managementBarcode)
          .map((book) => [book.managementBarcode as string, { id: book.id }])
      ),
      locationsById: new Map(existingLocations.map((location) => [location.id, { id: location.id }])),
      locationsByName: new Map(
        existingLocations.map((location) => [location.name, { id: location.id }])
      ),
      tagsById: new Map(existingTags.map((tag) => [tag.id, { id: tag.id }])),
      tagsByName: new Map(existingTags.map((tag) => [tag.name, { id: tag.id }]))
    };
  }

  function importData(
    payload: ImportRequest,
    existingMaps: ExistingMaps,
    conflicts: ImportConflict[]
  ) {
    const resolution = createResolutionMap(payload, conflicts);
    const locationIdMap = new Map<string, string>();
    const tagIdMap = new Map<string, string>();
    const bookIdMap = new Map<string, string>();
    const skippedBookIds = new Set<string>();
    const imported = { books: 0, locations: 0, classificationTags: 0 };
    const overwritten = { books: 0, locations: 0, classificationTags: 0 };
    const skipped = { books: 0, locations: 0, classificationTags: 0 };

    db.transaction(() => {
      for (const location of payload.locations) {
        const conflict = findConflict(conflicts, "location", location.id);
        const action = getAction(resolution, conflict);
        const existingId = conflict?.existingId;

        if (existingId) {
          locationIdMap.set(location.id, existingId);
        }

        if (action === "skip" && conflict) {
          skipped.locations += 1;
          continue;
        }

        if (action === "overwrite" && existingId) {
          updateLocation(existingId, location);
          overwritten.locations += 1;
          continue;
        }

        insertLocation(location);
        locationIdMap.set(location.id, location.id);
        imported.locations += 1;
      }

      for (const tag of payload.classificationTags) {
        const conflict = findConflict(conflicts, "classificationTag", tag.id);
        const action = getAction(resolution, conflict);
        const existingId = conflict?.existingId;

        if (existingId) {
          tagIdMap.set(tag.id, existingId);
        }

        if (action === "skip" && conflict) {
          skipped.classificationTags += 1;
          continue;
        }

        if (action === "overwrite" && existingId) {
          updateClassificationTag(existingId, tag);
          overwritten.classificationTags += 1;
          continue;
        }

        insertClassificationTag(tag);
        tagIdMap.set(tag.id, tag.id);
        imported.classificationTags += 1;
      }

      for (const book of payload.books) {
        const conflict = findConflict(conflicts, "book", book.id);
        const action = getAction(resolution, conflict);
        const existingId = conflict?.existingId;
        const mappedLocationId = book.locationId ? locationIdMap.get(book.locationId) : null;

        if (existingId) {
          bookIdMap.set(book.id, existingId);
        }

        if (action === "skip" && conflict) {
          skipped.books += 1;
          skippedBookIds.add(book.id);
          continue;
        }

        if (action === "overwrite" && existingId) {
          updateBook(existingId, book, mappedLocationId ?? null);
          overwritten.books += 1;
          continue;
        }

        insertBook(book, mappedLocationId ?? null);
        bookIdMap.set(book.id, book.id);
        imported.books += 1;
      }

      replaceBookClassificationTags(payload.bookClassificationTags, bookIdMap, tagIdMap, skippedBookIds);
    });

    return {
      imported,
      overwritten,
      skipped
    };
  }

  function insertLocation(location: ExportLocation) {
    db.insert(locations).values(location).run();
  }

  function updateLocation(id: string, location: ExportLocation) {
    db.update(locations)
      .set({
        name: location.name,
        description: location.description,
        sortOrder: location.sortOrder,
        isActive: location.isActive,
        createdAt: location.createdAt,
        updatedAt: new Date().toISOString()
      })
      .where(eq(locations.id, id))
      .run();
  }

  function insertClassificationTag(tag: ExportClassificationTag) {
    db.insert(classificationTags).values(tag).run();
  }

  function updateClassificationTag(id: string, tag: ExportClassificationTag) {
    db.update(classificationTags)
      .set({
        name: tag.name,
        description: tag.description,
        source: tag.source,
        isActive: tag.isActive,
        createdAt: tag.createdAt,
        updatedAt: new Date().toISOString()
      })
      .where(eq(classificationTags.id, id))
      .run();
  }

  function insertBook(book: ExportBook, locationId: string | null) {
    db.insert(books).values({ ...book, locationId }).run();
  }

  function updateBook(id: string, book: ExportBook, locationId: string | null) {
    db.update(books)
      .set({
        title: book.title,
        author: book.author,
        publisher: book.publisher,
        publishedDate: book.publishedDate,
        isbn: book.isbn,
        bookBarcode: book.bookBarcode,
        managementBarcode: book.managementBarcode,
        externalSource: book.externalSource,
        externalId: book.externalId,
        locationId,
        managementMemo: book.managementMemo,
        createdAt: book.createdAt,
        updatedAt: new Date().toISOString()
      })
      .where(eq(books.id, id))
      .run();
  }

  function replaceBookClassificationTags(
    incomingRelations: ExportBookClassificationTag[],
    bookIdMap: Map<string, string>,
    tagIdMap: Map<string, string>,
    skippedBookIds: Set<string>
  ) {
    const touchedBookIds = [
      ...new Set(
        incomingRelations
          .map((relation) => relation.bookId)
          .filter((incomingBookId) => !skippedBookIds.has(incomingBookId))
          .map((incomingBookId) => bookIdMap.get(incomingBookId))
          .filter((bookId): bookId is string => Boolean(bookId))
      )
    ];

    if (touchedBookIds.length > 0) {
      db.delete(bookClassificationTags)
        .where(inArray(bookClassificationTags.bookId, touchedBookIds))
        .run();
    }

    const values = incomingRelations
      .filter((relation) => !skippedBookIds.has(relation.bookId))
      .map((relation) => ({
        bookId: bookIdMap.get(relation.bookId),
        classificationTagId: tagIdMap.get(relation.classificationTagId),
        createdAt: relation.createdAt
      }))
      .filter(
        (
          relation
        ): relation is { bookId: string; classificationTagId: string; createdAt: string } =>
          Boolean(relation.bookId && relation.classificationTagId)
      );

    if (values.length > 0) {
      db.insert(bookClassificationTags).values(values).onConflictDoNothing().run();
    }
  }
}

function buildPreview(payload: ImportPayload, existingMaps: ExistingMaps): ImportPreview {
  const errors = validateImportReferences(payload);
  const conflicts = collectConflicts(payload, existingMaps);
  const conflictKeys = new Set(conflicts.map((conflict) => `${conflict.entity}:${conflict.incomingId}`));
  const create =
    payload.locations.filter((location) => !conflictKeys.has(`location:${location.id}`)).length +
    payload.classificationTags.filter((tag) => !conflictKeys.has(`classificationTag:${tag.id}`)).length +
    payload.books.filter((book) => !conflictKeys.has(`book:${book.id}`)).length;

  return {
    summary: {
      create,
      conflict: conflicts.length,
      error: errors.length
    },
    conflicts,
    errors
  };
}

function collectConflicts(payload: ImportPayload, existingMaps: ExistingMaps) {
  const conflicts: ImportConflict[] = [];
  const seen = new Set<string>();

  function pushConflict(conflict: Omit<ImportConflict, "availableActions" | "defaultAction">) {
    const key = `${conflict.entity}:${conflict.incomingId}`;

    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    conflicts.push({
      ...conflict,
      defaultAction: "skip",
      availableActions: ["overwrite", "skip"]
    });
  }

  for (const location of payload.locations) {
    const byId = existingMaps.locationsById.get(location.id);
    const byName = existingMaps.locationsByName.get(location.name);
    const existing = byName ?? byId;

    if (existing) {
      pushConflict({
        entity: "location",
        matchBy: byName ? "name" : "id",
        incomingId: location.id,
        existingId: existing.id
      });
    }
  }

  for (const tag of payload.classificationTags) {
    const byId = existingMaps.tagsById.get(tag.id);
    const byName = existingMaps.tagsByName.get(tag.name);
    const existing = byName ?? byId;

    if (existing) {
      pushConflict({
        entity: "classificationTag",
        matchBy: byName ? "name" : "id",
        incomingId: tag.id,
        existingId: existing.id
      });
    }
  }

  for (const book of payload.books) {
    const byId = existingMaps.booksById.get(book.id);
    const byManagementBarcode = book.managementBarcode
      ? existingMaps.booksByManagementBarcode.get(book.managementBarcode)
      : undefined;
    const existing = byManagementBarcode ?? byId;

    if (existing) {
      pushConflict({
        entity: "book",
        matchBy: byManagementBarcode ? "managementBarcode" : "id",
        incomingId: book.id,
        existingId: existing.id
      });
    }
  }

  return conflicts;
}

function validateImportReferences(payload: ImportPayload): ApiFieldError[] {
  const errors: ApiFieldError[] = validateImportPayloadDuplicates(payload);
  const locationIds = new Set(payload.locations.map((location) => location.id));
  const bookIds = new Set(payload.books.map((book) => book.id));
  const tagIds = new Set(payload.classificationTags.map((tag) => tag.id));

  payload.books.forEach((book, index) => {
    if (book.locationId && !locationIds.has(book.locationId)) {
      errors.push({
        field: `books.${index}.locationId`,
        message: `Location was not found in import payload: ${book.locationId}`
      });
    }
  });

  payload.bookClassificationTags.forEach((relation, index) => {
    if (!bookIds.has(relation.bookId)) {
      errors.push({
        field: `bookClassificationTags.${index}.bookId`,
        message: `Book was not found in import payload: ${relation.bookId}`
      });
    }

    if (!tagIds.has(relation.classificationTagId)) {
      errors.push({
        field: `bookClassificationTags.${index}.classificationTagId`,
        message: `Classification tag was not found in import payload: ${relation.classificationTagId}`
      });
    }
  });

  return errors;
}

function validateImportPayloadDuplicates(payload: ImportPayload): ApiFieldError[] {
  return [
    ...findDuplicateValues(payload.locations, "locations", "id", (location) => location.id),
    ...findDuplicateValues(payload.locations, "locations", "name", (location) => location.name),
    ...findDuplicateValues(payload.classificationTags, "classificationTags", "id", (tag) => tag.id),
    ...findDuplicateValues(payload.classificationTags, "classificationTags", "name", (tag) => tag.name),
    ...findDuplicateValues(payload.books, "books", "id", (book) => book.id),
    ...findDuplicateValues(payload.books, "books", "managementBarcode", (book) =>
      book.managementBarcode?.trim() || null
    ),
    ...findDuplicateValues(
      payload.bookClassificationTags,
      "bookClassificationTags",
      "classificationTagId",
      (relation) => `${relation.bookId}:${relation.classificationTagId}`,
      "bookId/classificationTagId pair"
    )
  ];
}

function findDuplicateValues<T>(
  items: T[],
  collectionName: string,
  fieldName: string,
  getValue: (item: T) => string | null,
  label = fieldName
): ApiFieldError[] {
  const errors: ApiFieldError[] = [];
  const seen = new Map<string, number>();

  items.forEach((item, index) => {
    const value = getValue(item);

    if (!value) {
      return;
    }

    const firstIndex = seen.get(value);

    if (firstIndex === undefined) {
      seen.set(value, index);
      return;
    }

    errors.push({
      field: `${collectionName}.${index}.${fieldName}`,
      message: `Duplicate ${label} in import payload: ${value} (first seen at ${collectionName}.${firstIndex}.${fieldName})`
    });
  });

  return errors;
}

function createResolutionMap(payload: ImportRequest, conflicts: ImportConflict[]) {
  const map = new Map<string, ImportAction>();

  for (const conflict of conflicts) {
    map.set(conflictKey(conflict), payload.conflictResolution.defaultAction);
  }

  for (const item of payload.conflictResolution.items) {
    map.set(conflictKey(item), item.action);
  }

  return map;
}

function getAction(
  resolution: Map<string, ImportAction>,
  conflict: ImportConflict | undefined
): ImportAction | "create" {
  if (!conflict) {
    return "create";
  }

  return resolution.get(conflictKey(conflict)) ?? conflict.defaultAction;
}

function findConflict(conflicts: ImportConflict[], entity: ImportEntity, incomingId: string) {
  return conflicts.find((conflict) => conflict.entity === entity && conflict.incomingId === incomingId);
}

function conflictKey(value: Pick<ImportConflict, "entity" | "incomingId" | "existingId">) {
  return `${value.entity}:${value.incomingId}:${value.existingId}`;
}

function toValidationError(issues: Array<{ path: PropertyKey[]; message: string }>) {
  return validationError(
    issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message
    }))
  );
}
