import { z } from "zod";

const nullableText = z.string().nullable();
const dateText = z.string().min(1);
const uuidText = z.string().uuid();

export const exportLocationSchema = z.object({
  id: uuidText,
  name: z.string().trim().min(1).max(200),
  description: nullableText,
  sortOrder: z.number().int().min(0),
  isActive: z.boolean(),
  createdAt: dateText,
  updatedAt: dateText
});

export const exportClassificationTagSchema = z.object({
  id: uuidText,
  name: z.string().trim().min(1).max(200),
  description: nullableText,
  source: z.enum(["manual", "open_library"]),
  isActive: z.boolean(),
  createdAt: dateText,
  updatedAt: dateText
});

export const exportBookSchema = z.object({
  id: uuidText,
  title: z.string().trim().min(1).max(200),
  author: nullableText,
  publisher: nullableText,
  publishedDate: nullableText,
  isbn: nullableText,
  bookBarcode: nullableText,
  managementBarcode: nullableText,
  externalSource: nullableText,
  externalId: nullableText,
  locationId: uuidText.nullable(),
  managementMemo: nullableText,
  createdAt: dateText,
  updatedAt: dateText
});

export const exportBookClassificationTagSchema = z.object({
  bookId: uuidText,
  classificationTagId: uuidText,
  createdAt: dateText
});

export const importPayloadSchema = z.object({
  version: z.literal(1),
  books: z.array(exportBookSchema),
  locations: z.array(exportLocationSchema),
  classificationTags: z.array(exportClassificationTagSchema),
  bookClassificationTags: z.array(exportBookClassificationTagSchema)
});

export const importActionSchema = z.enum(["overwrite", "skip"]);
export const importEntitySchema = z.enum(["book", "location", "classificationTag"]);

export const importRequestSchema = importPayloadSchema.extend({
  conflictResolution: z
    .object({
      defaultAction: importActionSchema.default("skip"),
      items: z
        .array(
          z.object({
            entity: importEntitySchema,
            incomingId: uuidText,
            existingId: uuidText,
            action: importActionSchema
          })
        )
        .default([])
    })
    .default({
      defaultAction: "skip",
      items: []
    })
});

export type ExportLocation = z.infer<typeof exportLocationSchema>;
export type ExportClassificationTag = z.infer<typeof exportClassificationTagSchema>;
export type ExportBook = z.infer<typeof exportBookSchema>;
export type ExportBookClassificationTag = z.infer<typeof exportBookClassificationTagSchema>;
export type ImportPayload = z.infer<typeof importPayloadSchema>;
export type ImportRequest = z.infer<typeof importRequestSchema>;
export type ImportAction = z.infer<typeof importActionSchema>;
export type ImportEntity = z.infer<typeof importEntitySchema>;
