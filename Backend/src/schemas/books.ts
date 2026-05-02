import { z } from "zod";
import { isValidIsbn, normalizeIsbn } from "../utils/isbn.js";

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

const optionalIsbn = z
  .string()
  .trim()
  .max(200)
  .optional()
  .nullable()
  .transform((value) => (value ? normalizeIsbn(value) : null))
  .refine((value) => value === null || isValidIsbn(value), {
    message: "ISBN must be ISBN-10 or ISBN-13."
  });

const optionalPublicationDate = z
  .string()
  .trim()
  .max(50)
  .optional()
  .nullable()
  .transform((value) => (value ? normalizePublicationDate(value) : null))
  .refine((value) => value === null || isValidPublicationDate(value), {
    message: "Publication date must be YYYY, YYYY-MM, or YYYY-MM-DD."
  });

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
  publishedDate: optionalPublicationDate,
  isbn: optionalIsbn,
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
  externalSource: "ndl_search" | "open_library";
  externalId?: string;
  classificationTagCandidates: string[];
};

function normalizePublicationDate(value: string) {
  const dotSeparated = /^(\d{4})\.(\d{1,2})(?:\.(\d{1,2}))?$/.exec(value);

  if (!dotSeparated) {
    return value;
  }

  const [, year, month, day] = dotSeparated;
  const normalizedMonth = month.padStart(2, "0");

  return day ? `${year}-${normalizedMonth}-${day.padStart(2, "0")}` : `${year}-${normalizedMonth}`;
}

function isValidPublicationDate(value: string) {
  if (/^\d{4}$/.test(value)) {
    return true;
  }

  const yearMonth = /^(\d{4})-(\d{2})$/.exec(value);

  if (yearMonth) {
    const month = Number(yearMonth[2]);

    return month >= 1 && month <= 12;
  }

  const fullDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!fullDate) {
    return false;
  }

  const year = Number(fullDate[1]);
  const month = Number(fullDate[2]);
  const day = Number(fullDate[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}
