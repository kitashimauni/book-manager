import { z } from "zod";

export const bookLookupRequestSchema = z.object({
  bookBarcode: z.string().trim().min(1)
});

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
