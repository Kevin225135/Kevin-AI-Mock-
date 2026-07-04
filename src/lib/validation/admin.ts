import { z } from "zod";

export const adminUpdateUserSchema = z.object({
  name: z.string().trim().min(1).max(80).nullable().optional(),
  targetRole: z.string().trim().min(2).max(80).nullable().optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  planCode: z.enum(["FREE", "PRO", "ADMIN"]).optional()
});

export const quotaAdjustmentSchema = z.object({
  delta: z.coerce.number().int().min(-1000).max(1000).refine((value) => value !== 0, {
    message: "Delta cannot be zero."
  }),
  reason: z.string().trim().min(2).max(160).optional()
});
