"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCompanyUser } from "@/lib/auth/session";
import { companyProfileSchema, type CompanyProfileInput } from "@/lib/validations/settings";

export async function getCompanyProfile() {
  const ctx = await requireCompanyUser();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", ctx.companyId)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Company not found." };

  return {
    ok: true,
    data: {
      id: data.id,
      name: data.name,
      logoUrl: data.logo_url,
      gst: data.gst,
      address: data.address,
      timezone: data.timezone,
      currency: data.currency,
      financialYearStart: data.financial_year_start,
      theme: data.theme,
    } as CompanyProfileInput & { id: string },
  };
}

export async function updateCompanyProfile(input: CompanyProfileInput) {
  const ctx = await requireCompanyUser();

  const parsed = companyProfileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validation failed.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("companies")
    .update({
      name: parsed.data.name,
      logo_url: parsed.data.logoUrl,
      gst: parsed.data.gst,
      address: parsed.data.address,
      timezone: parsed.data.timezone,
      currency: parsed.data.currency,
      financial_year_start: parsed.data.financialYearStart,
      theme: parsed.data.theme,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ctx.companyId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  return { ok: true, data: undefined };
}