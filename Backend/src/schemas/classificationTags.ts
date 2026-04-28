import { z } from "zod";

export const classificationTagIdParamsSchema = z.object({
  id: z.string().uuid()
});

export const classificationTagSourceSchema = z.enum(["manual", "ndl_search", "open_library"]);

export const createClassificationTagRequestSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).optional(),
  source: classificationTagSourceSchema.optional()
});

export const updateClassificationTagRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(1000).nullable().optional(),
    source: classificationTagSourceSchema.optional(),
    isActive: z.boolean().optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required"
  });

export type CreateClassificationTagRequest = z.infer<
  typeof createClassificationTagRequestSchema
>;
export type UpdateClassificationTagRequest = z.infer<
  typeof updateClassificationTagRequestSchema
>;
