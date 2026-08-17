import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  targetRole: z.string().trim().min(2).max(80).optional()
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128)
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1).max(128),
  confirmation: z.literal("DELETE")
});

const memoryValueSchema = z
  .record(z.unknown())
  .refine((value) => Object.keys(value).length > 0, "Memory value is empty.")
  .refine((value) => JSON.stringify(value).length <= 4000, "Memory value is too large.");

export const createMemorySchema = z.object({
  type: z.enum(["FACT", "PREFERENCE"]),
  value: memoryValueSchema,
  expiresAt: z.string().datetime({ offset: true }).optional()
});

export const updateMemorySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("CONFIRM") }),
  z.object({ action: z.literal("REJECT") }),
  z.object({
    action: z.literal("UPDATE"),
    value: memoryValueSchema,
    expiresAt: z.string().datetime({ offset: true }).nullable().optional()
  })
]);
