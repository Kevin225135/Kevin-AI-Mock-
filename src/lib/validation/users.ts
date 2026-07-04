import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  targetRole: z.string().trim().min(2).max(80).optional()
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128)
});
