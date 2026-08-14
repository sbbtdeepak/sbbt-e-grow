"use strict";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function createCompanyAction(
  prevState: {
    success?: boolean;
    message?: string;
  },
  formData: FormData
): Promise<{
  success: boolean;
  message?: string;
}> {
  "use server";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Not authenticated" };
  }

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const selectedPlan = formData.get("selected_plan") as string | null;

  if (!name?.trim()) {
    return { success: false, message: "Company name is required" };
  }
  if (!email?.trim()) {
    return { success: false, message: "Email is required" };
  }
  if (!selectedPlan) {
    return { success: false, message: "Plan selection is required" };
  }

  try {
    // 1. Validate plan exists and is active
    const { data: plan, error: planError } = await supabase
      .from("plans")
      .select("id, is_active, slug")
      .eq("slug", selectedPlan)
      .single();

    if (planError || !plan || !plan.is_active) {
      return {
        success: false,
        message: planError ? planError.message : "Invalid or inactive plan",
      };
    }

    // 2. Create the company
    const { error: companyError } = await supabase.from("companies").insert({
      name,
      slug: name.toLowerCase().replace(/\s+/g, "-"),
      gst: formData.get("gst") as string,
      address: formData.get("address") as string,
      city: formData.get("city") as string,
      state: formData.get("state") as string,
      pincode: formData.get("pincode") as string,
      country: formData.get("country") as string,
      timezone: "UTC",
      currency: "INR",
      theme: "light",
      is_active: true,
      created_by: user.id,
    });

    if (companyError) {
      return { success: false, message: companyError.message };
    }

    // 3. Create initial subscription (exactly one)
    const { error: subError } = await supabase.from("subscriptions").insert({
      company_id: "",
      plan_id: plan.id,
      status: "active",
      trial_start: new Date().toISOString(),
      trial_end: null,
      current_period_start: new Date().toISOString(),
      current_period_end: "",
    });

    if (subError) {
      return { success: false, message: subError.message };
    }

    // 4. Create company usage record (exactly one current period)
    const today = new Date();
    const { error: usageError } = await supabase.from("company_usage").insert({
      company_id: "",
      period_start: today.toISOString().split("T")[0],
      period_end: null,
      products_count: 0,
      marketplaces_count: 0,
      seller_accounts_count: 0,
      orders_count: 0,
      ai_usage_count: 0,
    });

    if (usageError) {
      return { success: false, message: usageError.message };
    }

    revalidatePath("/master/companies");
    revalidatePath("/master");

    return { success: true };
  } catch {
    return { success: false, message: "Unexpected error" };
  }
}

export async function inviteAdminAction(
  prevState: {
    success?: boolean;
    message?: string;
  },
  formData: FormData
): Promise<{
  success: boolean;
  message?: string;
}> {
  "use server";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Not authenticated" };
  }

  const email = formData.get("email") as string;
  const companyId = formData.get("company_id") as string;

  if (!email?.trim()) {
    return { success: false, message: "Email is required" };
  }
  if (!companyId?.trim()) {
    return { success: false, message: "Company ID is required" };
  }

  try {
    // Check if user already exists by looking up in auth.users via admin API
    // Use listUsers to search for existing email
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      return { success: false, message: listError.message };
    }

    const matchingUser =
      existingUsers?.users?.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase()
      ) ?? null;

    if (!matchingUser) {
      // New user - invite via Supabase Auth
      const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
        data: {
          full_name: "",
          company_id: companyId,
          role: "company_admin",
        },
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?company_id=${companyId}`,
      });

      if (inviteError) {
        return { success: false, message: inviteError.message };
      }

      revalidatePath("/master/companies");
      revalidatePath("/master");

      return { success: true, message: "Invitation sent successfully" };
    }

    // Existing user found
    const userId = matchingUser.id;

    // Check if user already has membership in this company
    const { data: existingMemberships } = await supabase
      .from("user_company_roles")
      .select("id, role, is_active")
      .eq("user_id", userId)
      .eq("company_id", companyId)
      .maybeSingle();

    if (existingMemberships) {
      return {
        success: false,
        message: "User is already a member of this company",
      };
    }

    // Add membership for the new company
    const { error: membershipError } = await supabase.from("user_company_roles").insert({
      user_id: userId,
      company_id: companyId,
      role: "company_admin",
      is_active: true,
    });

    if (membershipError) {
      return { success: false, message: membershipError.message };
    }

    revalidatePath("/master/companies");
    revalidatePath("/master");

    return { success: true, message: "Membership added successfully" };
  } catch {
    return { success: false, message: "Unexpected error" };
  }
}
