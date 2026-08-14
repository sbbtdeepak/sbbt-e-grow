import { z } from "zod";

export const inviteSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  fullName: z.string().optional(),
});

export type InviteInput = z.infer<typeof inviteSchema>;
