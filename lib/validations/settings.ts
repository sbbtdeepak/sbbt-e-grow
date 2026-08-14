import { z } from "zod";

export const companyProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Business name is required.")
    .max(200, "Business name must be at most 200 characters."),
  legalName: z
    .string()
    .trim()
    .max(200, "Legal name must be at most 200 characters.")
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  logoUrl: z
    .string()
    .url("Logo URL must be a valid URL.")
    .max(500, "Logo URL is too long.")
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  gst: z
    .string()
    .trim()
    .max(50, "GST number is too long.")
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  address: z
    .string()
    .trim()
    .max(500, "Address is too long.")
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  city: z
    .string()
    .trim()
    .max(100, "City name is too long.")
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  state: z
    .string()
    .trim()
    .max(100, "State name is too long.")
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  pincode: z
    .string()
    .trim()
    .max(20, "Pincode is too long.")
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  country: z
    .string()
    .trim()
    .max(100, "Country name is too long.")
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  timezone: z.string().trim().min(1, "Timezone is required.").default("UTC"),
  currency: z.string().trim().min(1, "Currency is required.").default("INR"),
  financialYearStart: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  theme: z.enum(["light", "dark"]).default("light"),
});

export type CompanyProfileInput = z.infer<typeof companyProfileSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required."),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters.")
    .max(128, "New password is too long."),
  confirmPassword: z.string().min(1, "Please confirm your new password."),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "New passwords do not match.",
  path: ["confirmPassword"],
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;