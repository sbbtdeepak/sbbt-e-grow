import { z } from "zod";

export const companyProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Business name is required.")
    .max(200, "Business name must be at most 200 characters."),
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