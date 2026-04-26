import { z } from "zod";

export const locationIdParamsSchema = z.object({
  id: z.string().uuid()
});

export const createLocationRequestSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).optional(),
  sortOrder: z.number().int().min(0).optional()
});

export const updateLocationRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(1000).nullable().optional(),
    sortOrder: z.number().int().min(0).optional(),
    isActive: z.boolean().optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required"
  });

export type CreateLocationRequest = z.infer<typeof createLocationRequestSchema>;
export type UpdateLocationRequest = z.infer<typeof updateLocationRequestSchema>;
