/**
 * SBBT E-Grow — Development & Demo Seed Script
 *
 * Creates demo data for development and testing:
 *   - Company: SBBT Demo (slug: sbbt-demo)
 *   - Users: master@sbbt.in (master_admin), admin@sbbt.in (company_admin),
 *            user@sbbt.in (staff)
 *   - Products: 10
 *   - Marketplaces: 3 (Amazon, Meesho, Website)
 *   - Seller Accounts: 6 (2 per marketplace)
 *   - Orders: 100 across the full stage workflow
 *            (entry → purchase → packing → dispatch → delivery + payments)
 *
 * Idempotent: safe to run multiple times.
 *
 * Usage: npm run seed
 */

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

type SeedResult = {
  companyId: string;
  userIds: { master: string; admin: string; staff: string };
  marketplaceIds: { amazon: string; meesho: string; website: string };
  sellerAccountIds: {
    amazon1: string;
    amazon2: string;
    meesho1: string;
    meesho2: string;
    website1: string;
    website2: string;
  };
  productIds: string[];
  orderIds: string[];
};

async function seedCompany(): Promise<string> {
  const { data: existing } = await supabase
    .from("companies")
    .select("id")
    .eq("name", "SBBT Demo")
    .maybeSingle();

  if (existing) {
    console.log("✓ Company already exists");
    return existing.id;
  }

  const { data, error } = await supabase
    .from("companies")
    .insert({
      name: "SBBT Demo",
      slug: "sbbt-demo",
      is_active: true,
      timezone: "Asia/Kolkata",
      currency: "INR",
      theme: "light",
    })
    .select("id")
    .single();

  if (error) throw error;
  console.log("✓ Created company: SBBT Demo");
  return data.id;
}

async function seedUsers(companyId: string): Promise<SeedResult["userIds"]> {
  const users = [
    {
      email: "master@sbbt.in",
      password: "Master@123",
      role: "master_admin" as const,
      fullName: "Master Admin",
    },
    {
      email: "admin@sbbt.in",
      password: "Admin@123",
      role: "company_admin" as const,
      fullName: "Company Admin",
    },
    {
      email: "user@sbbt.in",
      password: "User@123",
      role: "staff" as const,
      fullName: "Staff User",
    },
  ];

  const userIds: SeedResult["userIds"] = { master: "", admin: "", staff: "" };

  for (const user of users) {
    const { data: existing } = await supabase.auth.admin.listUsers();
    const found = existing.users.find((u) => u.email === user.email);

    let userId = found?.id;

    if (!found) {
      const { data: created, error: authError } =
        await supabase.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
        });

      if (authError) throw authError;
      if (!created.user) throw new Error(`Failed to create user: ${user.email}`);

      userId = created.user.id;
      console.log(`✓ Created user: ${user.email} (${user.role})`);
    } else {
      console.log(`✓ User exists: ${user.email}`);
    }

    if (!userId) throw new Error(`No user ID for ${user.email}`);

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userId,
      company_id: companyId,
      role: user.role,
      full_name: user.fullName,
    });

    if (profileError) throw profileError;

    const key =
      user.role === "master_admin"
        ? "master"
        : user.role === "company_admin"
          ? "admin"
          : "staff";
    userIds[key] = userId;
  }

  return userIds;
}

async function seedMarketplaces(
  companyId: string,
): Promise<SeedResult["marketplaceIds"]> {
  const marketplaces = [
    { name: "Amazon", slug: "amazon" },
    { name: "Meesho", slug: "meesho" },
    { name: "Website", slug: "website" },
  ];

  const ids: SeedResult["marketplaceIds"] = {
    amazon: "",
    meesho: "",
    website: "",
  };

  for (const m of marketplaces) {
    const { data: existing } = await supabase
      .from("marketplaces")
      .select("id")
      .eq("company_id", companyId)
      .eq("slug", m.slug)
      .maybeSingle();

    if (existing) {
      ids[m.slug as keyof SeedResult["marketplaceIds"]] = existing.id;
      console.log(`✓ Marketplace exists: ${m.name}`);
      continue;
    }

    const { data, error } = await supabase
      .from("marketplaces")
      .insert({
        company_id: companyId,
        name: m.name,
        slug: m.slug,
        is_active: true,
      })
      .select("id")
      .single();

    if (error) throw error;
    ids[m.slug as keyof SeedResult["marketplaceIds"]] = data.id;
    console.log(`✓ Created marketplace: ${m.name}`);
  }

  return ids;
}

async function seedSellerAccounts(
  companyId: string,
  marketplaceIds: SeedResult["marketplaceIds"],
): Promise<SeedResult["sellerAccountIds"]> {
  const sellers = [
    { name: "Amazon Seller 1", marketplaceId: marketplaceIds.amazon },
    { name: "Amazon Seller 2", marketplaceId: marketplaceIds.amazon },
    { name: "Meesho Seller 1", marketplaceId: marketplaceIds.meesho },
    { name: "Meesho Seller 2", marketplaceId: marketplaceIds.meesho },
    { name: "Website Seller 1", marketplaceId: marketplaceIds.website },
    { name: "Website Seller 2", marketplaceId: marketplaceIds.website },
  ];

  const ids: SeedResult["sellerAccountIds"] = {
    amazon1: "",
    amazon2: "",
    meesho1: "",
    meesho2: "",
    website1: "",
    website2: "",
  };

  const keys = Object.keys(
    ids,
  ) as (keyof SeedResult["sellerAccountIds"])[];

  for (let i = 0; i < sellers.length; i++) {
    const seller = sellers[i];
    const key = keys[i];

    const { data: existing } = await supabase
      .from("seller_accounts")
      .select("id")
      .eq("company_id", companyId)
      .eq("name", seller.name)
      .maybeSingle();

    if (existing) {
      ids[key] = existing.id;
      console.log(`✓ Seller exists: ${seller.name}`);
      continue;
    }

    const { data, error } = await supabase
      .from("seller_accounts")
      .insert({
        company_id: companyId,
        marketplace_id: seller.marketplaceId,
        name: seller.name,
        is_active: true,
      })
      .select("id")
      .single();

    if (error) throw error;
    ids[key] = data.id;
    console.log(`✓ Created seller: ${seller.name}`);
  }

  return ids;
}

async function seedProducts(companyId: string): Promise<string[]> {
  const products = [
    { sku: "PLT-001", name: "Ficus Bonsai", buyingPrice: 250, category: "Bonsai", status: "active" },
    { sku: "PLT-002", name: "Snake Plant", buyingPrice: 180, category: "Indoor", status: "active" },
    { sku: "PLT-003", name: "Peace Lily", buyingPrice: 220, category: "Indoor", status: "active" },
    { sku: "PLT-004", name: "Areca Palm", buyingPrice: 350, category: "Palm", status: "active" },
    { sku: "PLT-005", name: "Money Plant", buyingPrice: 150, category: "Climber", status: "active" },
    { sku: "PLT-006", name: "Aloe Vera", buyingPrice: 120, category: "Succulent", status: "active" },
    { sku: "PLT-007", name: "Rose Plant", buyingPrice: 200, category: "Flowering", status: "active" },
    { sku: "PLT-008", name: "Jasmine", buyingPrice: 180, category: "Flowering", status: "active" },
    { sku: "PLT-009", name: "Cactus Mix", buyingPrice: 100, category: "Succulent", status: "active" },
    { sku: "PLT-010", name: "Fern Plant", buyingPrice: 160, category: "Indoor", status: "active" },
  ];

  const ids: string[] = [];

  for (const product of products) {
    const { data: existing } = await supabase
      .from("products")
      .select("id")
      .eq("company_id", companyId)
      .eq("sku", product.sku)
      .maybeSingle();

    if (existing) {
      ids.push(existing.id);
      console.log(`✓ Product exists: ${product.name}`);
      continue;
    }

    const { data, error } = await supabase
      .from("products")
      .insert({
        company_id: companyId,
        sku: product.sku,
        name: product.name,
        buying_price: product.buyingPrice,
        category: product.category,
        status: product.status as "active" | "inactive",
      })
      .select("id")
      .single();

    if (error) throw error;
    ids.push(data.id);
    console.log(`✓ Created product: ${product.name}`);
  }

  return ids;
}

function randomDate(start: Date, end: Date): string {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime()),
  )
    .toISOString()
    .split("T")[0];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFrom<T>(arr: readonly T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}

/**
 * Maps a marketplace key to its two seller account keys so every
 * order links a seller that actually belongs to the chosen marketplace.
 */
const SELLER_KEYS_BY_MARKETPLACE: Record<
  keyof SeedResult["marketplaceIds"],
  (keyof SeedResult["sellerAccountIds"])[]
> = {
  amazon: ["amazon1", "amazon2"],
  meesho: ["meesho1", "meesho2"],
  website: ["website1", "website2"],
};

async function seedOrders(
  companyId: string,
  productIds: string[],
  marketplaceIds: SeedResult["marketplaceIds"],
  sellerAccountIds: SeedResult["sellerAccountIds"],
): Promise<string[]> {
  // Clean up any demo orders from previous failed runs.
  const { data: demoOrders } = await supabase
    .from("orders")
    .select("id")
    .eq("company_id", companyId)
    .ilike("notes", "Demo order %");

  if (demoOrders && demoOrders.length > 0) {
    const ids = demoOrders.map((o) => o.id);

    // Delete dependent rows first (order_items, payments), then orders.
    const { error: itemDeleteError } = await supabase
      .from("order_items")
      .delete()
      .in("order_id", ids);
    if (itemDeleteError)
      console.warn("Order items cleanup:", itemDeleteError.message);

    const { error: paymentDeleteError } = await supabase
      .from("payments")
      .delete()
      .in("order_id", ids);
    if (paymentDeleteError)
      console.warn("Payments cleanup:", paymentDeleteError.message);

    const { error: orderDeleteError } = await supabase
      .from("orders")
      .delete()
      .in("id", ids);
    if (orderDeleteError)
      console.warn("Orders cleanup:", orderDeleteError.message);

    console.log(`✓ Cleaned up ${ids.length} previous demo orders`);
  }

  // Full workflow stages.
  // order stage → packing.qty / dispatch.qty / delivered.qty
  // entry     → ordered only
  // purchase  → buy_qty set
  // packing   → packed_qty set
  // dispatch  → dispatch_qty set
  // delivery  → delivered_qty set + payment created
  const stages = ["entry", "purchase", "packing", "dispatch", "delivery"] as const;

  const marketplaceKeys = Object.keys(
    marketplaceIds,
  ) as (keyof SeedResult["marketplaceIds"])[];

  const orderIds: string[] = [];

  console.log("→ Creating 100 demo orders.");

  for (let i = 0; i < 100; i++) {
    const marketplaceKey = randomFrom(marketplaceKeys);
    const sellerKeys = SELLER_KEYS_BY_MARKETPLACE[marketplaceKey];
    const sellerKey = randomFrom(sellerKeys);
    const productId = randomFrom(productIds);
    const orderQty = randomInt(5, 50);
    const sellingPrice = randomInt(300, 800);
    const buyingPrice = randomInt(150, 400);
    const stage = randomFrom(stages);

    const orderDate = randomDate(new Date("2024-01-01"), new Date("2025-12-31"));
    const orderId = randomUUID();

    const { error: orderError } = await supabase.from("orders").insert({
      id: orderId,
      company_id: companyId,
      order_date: orderDate,
      marketplace_id: marketplaceIds[marketplaceKey],
      seller_account_id: sellerAccountIds[sellerKey],
      stage,
      notes: `Demo order ${i + 1}`,
    });

    if (orderError) {
      console.warn("Order insert error:", orderError.message);
      continue;
    }

    // Quantities advance along the pipeline; delivered <= dispatched <=
    // packed <= bought <= ordered.
    const buyQty = stage === "entry" ? orderQty : randomInt(1, orderQty);
    const packedQty =
      stage === "packing" || stage === "dispatch" || stage === "delivery"
        ? buyQty
        : 0;
    const dispatchQty =
      stage === "dispatch" || stage === "delivery" ? packedQty : 0;
    const deliveredQty = stage === "delivery" ? dispatchQty : 0;

    // total_sale, total_purchase, profit are GENERATED columns — skip them.
    const { error: itemError } = await supabase.from("order_items").insert({
      id: randomUUID(),
      company_id: companyId,
      order_id: orderId,
      product_id: productId,
      ordered_qty: orderQty,
      buy_qty: buyQty,
      packed_qty: packedQty,
      dispatch_qty: dispatchQty,
      delivered_qty: deliveredQty,
      selling_price: sellingPrice,
      buying_price: buyingPrice,
      delivery_status: stage === "delivery" ? "delivered" : null,
      delivery_date: stage === "delivery" ? orderDate : null,
    });

    if (itemError) {
      console.warn("Order item error:", itemError.message);
      continue;
    }

    if (stage === "delivery") {
      const deliveryDate = new Date(orderDate);
      deliveryDate.setDate(deliveryDate.getDate() + randomInt(1, 7));
      const expectedPaymentDate = new Date(deliveryDate);
      expectedPaymentDate.setDate(
        expectedPaymentDate.getDate() + randomInt(0, 5),
      );

      const amountExpected = deliveredQty * sellingPrice;
      const amountReceived =
        Math.random() > 0.3
          ? amountExpected
          : randomInt(0, amountExpected);
      const status =
        amountReceived >= amountExpected
          ? "received"
          : amountReceived > 0
            ? "partial"
            : "expected";

      // pending is a GENERATED column — skip it.
      const { error: paymentError } = await supabase.from("payments").insert({
        id: randomUUID(),
        company_id: companyId,
        order_id: orderId,
        delivery_date: deliveryDate.toISOString().split("T")[0],
        expected_payment_date: expectedPaymentDate.toISOString().split("T")[0],
        amount_expected: amountExpected,
        amount_received: amountReceived,
        status: status as "expected" | "partial" | "received",
      });

      if (paymentError) {
        console.warn("Payment error:", paymentError.message);
      }
    }

    orderIds.push(orderId);
  }

  console.log(`✓ Created ${orderIds.length} demo orders`);
  return orderIds;
}

async function main() {
  console.log("🌱 Starting seed.\n");

  try {
    const companyId = await seedCompany();
    await seedUsers(companyId);
    const marketplaceIds = await seedMarketplaces(companyId);
    const sellerAccountIds = await seedSellerAccounts(
      companyId,
      marketplaceIds,
    );
    const productIds = await seedProducts(companyId);
    const orderIds = await seedOrders(
      companyId,
      productIds,
      marketplaceIds,
      sellerAccountIds,
    );

    console.log("\n✅ Seed completed successfully!");
    console.log("\nTest accounts:");
    console.log("  Master: master@sbbt.in / Master@123");
    console.log("  Admin:  admin@sbbt.in / Admin@123");
    console.log("  Staff:  user@sbbt.in / User@123");
    console.log(`\nCompany ID: ${companyId}`);
    console.log(`Products: ${productIds.length}`);
    console.log(`Orders: ${orderIds.length}`);
  } catch (error) {
    console.error("\n❌ Seed failed:", error);
    process.exit(1);
  }
}

main();