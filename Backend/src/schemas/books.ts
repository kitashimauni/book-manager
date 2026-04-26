import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => (value ? value : null));

const optionalBarcode = z
  .string()
  .trim()
  .max(200)
  .optional()
  .nullable()
  .transform((value) => (value ? value : null));

export const bookIdParamsSchema = z.object({
  id: z.string().uuid()
});

export const listBooksQuerySchema = z.object({
  q: z.string().trim().optional(),
  locationId: z.string().uuid().optional(),
  classificationTagId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20)
});

export const createBookRequestSchema = z.object({
  title: z.string().trim().min(1).max(200),
  author: optionalText(500),
  publisher: optionalText(200),
  publishedDate: optionalText(50),
  isbn: optionalBarcode,
  bookBarcode: optionalBarcode,
  managementBarcode: optionalBarcode,
  externalSource: optionalText(100),
  externalId: optionalText(200),
  locationId: z.string().uuid().optional().nullable(),
  classificationTagIds: z.array(z.string().uuid()).optional().default([]),
  managementMemo: optionalText(5000)
});

export const updateBookRequestSchema = createBookRequestSchema
  .partial()
  .extend({
    classificationTagIds: z.array(z.string().uuid()).optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required"
  });

export const bookLookupRequestSchema = z.object({
  bookBarcode: z.string().trim().min(1)
});

export type BookIdParams = z.infer<typeof bookIdParamsSchema>;
export type ListBooksQuery = z.infer<typeof listBooksQuerySchema>;
export type CreateBookRequest = z.infer<typeof createBookRequestSchema>;
export type UpdateBookRequest = z.infer<typeof updateBookRequestSchema>;
export type BookLookupRequest = z.infer<typeof bookLookupRequestSchema>;

export type BookLookupResult = {
  title: string;
  author?: string;
  publisher?: string;
  publishedDate?: string;
  isbn?: string;
  externalSource: "open_library";
  externalId?: string;
  classificationTagCandidates: string[];
};
