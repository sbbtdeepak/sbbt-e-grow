import { z } from "zod";

export const loginSchema = z.object({
  // "identifier" is a User ID (e.g. acme.admin) or a registered email
  // (master admin, legacy accounts). Deliberately NOT validated as an
  // email — usernames never contain "@" but must be accepted here.
  identifier: z
    .string()
    .trim()
    .min(1, "Enter your User ID or email.")
    .max(254, "That value is too long.")
    .transform((v) => v.toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export type LoginState = {
  errors?: {
    identifier?: string[];
    password?: string[];
  };
  message?: string;
};

export const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email address.").trim(),
});

export type ForgotPasswordState = {
  message?: string;
};

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(72, "Password must be 72 characters or fewer.")
      .regex(/[a-zA-Z]/, "Password must include at least one letter.")
      .regex(/[0-9]/, "Password must include at least one number."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type ResetPasswordState = {
  errors?: {
    password?: string[];
    confirmPassword?: string[];
  };
  message?: string;
};