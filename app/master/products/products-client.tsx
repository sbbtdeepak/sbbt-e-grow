"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import {
  getSaaSProducts,
  createSaaSProduct,
  updateSaaSProduct,
  deleteSaaSProduct,
  setProductActive,
  createProductFeature,
  updateProductFeature,
  deleteProductFeature,
  createProductPricing,
  updateProductPricing,
  deleteProductPricing,
} from "./actions";

type SaasProduct = {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  short_description: string;
  features: string[];
  target_audience: string | null;
  hero_image_url: string | null;
  image_url: string | null;
  accent_color: string | null;
  external_app_url: string | null;
  cta_label: string | null;
  cta_type: string | null;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  product_features: {
    id: string;
    feature_key: string;
    feature_name: string;
    feature_description: string;
    feature_type: string;
    is_highlighted: boolean;
    is_active: boolean;
    sort_order: number;
  }[];
  product_pricing: {
    id: string;
    tier_name: string;
    description: string | null;
    price_monthly: number;
    price_yearly: number;
    currency: string;
    is_popular: boolean;
    is_active: boolean;
    features: Record<string, unknown>;
    limits: Record<string, unknown>;
    sort_order: number;
  }[];
};

export function MasterProductsClient() {
  const [products, setProducts] = useState<SaasProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [featureDialogOpen, setFeatureDialogOpen] = useState(false);
  const [pricingDialogOpen, setPricingDialogOpen] = useState(false);

  const [editingProduct, setEditingProduct] = useState<SaasProduct | null>(null);
  const [editingFeature, setEditingFeature] = useState<{
    id?: string;
    saas_product_id: string;
    feature_key: string;
    feature_name: string;
    feature_description: string;
    feature_type: string;
    is_highlighted: boolean;
    is_active: boolean;
    sort_order: number;
  } | null>(null);
  const [editingPricing, setEditingPricing] = useState<{
    id?: string;
    saas_product_id: string;
    plan_id?: string | null;
    tier_name: string;
    description: string | null;
    price_monthly: number;
    price_yearly: number;
    currency: string;
    is_popular: boolean;
    is_active: boolean;
    features: Record<string, unknown>;
    limits: Record<string, unknown>;
    sort_order: number;
  } | null>(null);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getSaaSProducts();
    if (!result.ok) {
      setError(result.error);
    } else {
      setProducts(result.data as SaasProduct[]);
    }
    setLoading(false);
  }, []);

  // Data fetching on mount is a valid useEffect use case.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProducts();
  }, [loadProducts]);

  const openProductDialog = (product?: SaasProduct) => {
    setFormError(null);
    if (product) {
      setEditingProduct(product);
    } else {
      setEditingProduct({
        id: "",
        name: "",
        slug: "",
        tagline: "",
        description: "",
        short_description: "",
        features: [],
        target_audience: null,
        hero_image_url: null,
        image_url: null,
        accent_color: null,
        external_app_url: null,
        cta_label: null,
        cta_type: null,
        is_active: true,
        is_featured: false,
        sort_order: 0,
        product_features: [],
        product_pricing: [],
      });
    }
    setProductDialogOpen(true);
  };

  const openFeatureDialog = (
    product: SaasProduct,
    feature?: SaasProduct["product_features"][0],
  ) => {
    setFormError(null);
    if (feature) {
      setEditingFeature({ ...feature, saas_product_id: product.id });
    } else {
      setEditingFeature({
        saas_product_id: product.id,
        feature_key: "",
        feature_name: "",
        feature_description: "",
        feature_type: "capability",
        is_highlighted: false,
        is_active: true,
        sort_order: 0,
      });
    }
    setFeatureDialogOpen(true);
  };

  const openPricingDialog = (
    product: SaasProduct,
    tier?: SaasProduct["product_pricing"][0],
  ) => {
    setFormError(null);
    if (tier) {
      setEditingPricing({
        ...tier,
        saas_product_id: product.id,
        features: (tier as { features?: Record<string, unknown> }).features ?? {},
        limits: (tier as { limits?: Record<string, unknown> }).limits ?? {},
      });
    } else {
      setEditingPricing({
        saas_product_id: product.id,
        plan_id: null,
        tier_name: "",
        description: null,
        price_monthly: 0,
        price_yearly: 0,
        currency: "INR",
        is_popular: false,
        is_active: true,
        features: {},
        limits: {},
        sort_order: 0,
      });
    }
    setPricingDialogOpen(true);
  };

  const saveProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    const formData = new FormData(e.currentTarget);
    const featuresRaw = formData.get("features");
    const features = featuresRaw
      ? String(featuresRaw)
          .split("\n")
          .map((f) => f.trim())
          .filter(Boolean)
      : [];

    const payload = {
      name: String(formData.get("name") ?? ""),
      slug: String(formData.get("slug") ?? ""),
      tagline: String(formData.get("tagline") ?? ""),
      description: String(formData.get("description") ?? ""),
      short_description: String(formData.get("short_description") ?? ""),
      features,
      target_audience: formData.get("target_audience") ? String(formData.get("target_audience")) : null,
      hero_image_url: formData.get("hero_image_url") ? String(formData.get("hero_image_url")) : null,
      image_url: formData.get("image_url") ? String(formData.get("image_url")) : null,
      accent_color: formData.get("accent_color") ? String(formData.get("accent_color")) : null,
      external_app_url: formData.get("external_app_url") ? String(formData.get("external_app_url")) : null,
      cta_label: formData.get("cta_label") ? String(formData.get("cta_label")) : null,
      cta_type: (formData.get("cta_type")
        ? String(formData.get("cta_type"))
        : null) as "learn_more" | "launch" | "contact" | "login" | null,
      is_active: formData.get("is_active") === "on",
      is_featured: formData.get("is_featured") === "on",
      sort_order: Number(formData.get("sort_order")),
    };

    const result = editingProduct?.id
      ? await updateSaaSProduct(editingProduct.id, payload)
      : await createSaaSProduct(payload);

    if (!result.ok) {
      setFormError(result.error);
    } else {
      setProductDialogOpen(false);
      setEditingProduct(null);
      loadProducts();
    }
    setSaving(false);
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Delete this product and all its features/pricing?")) return;
    const result = await deleteSaaSProduct(id);
    if (result.ok) {
      loadProducts();
    } else {
      alert(result.error ?? "Failed to delete product.");
    }
  };

  const toggleProductActive = async (product: SaasProduct) => {
    const result = await setProductActive(product.id, !product.is_active);
    if (result.ok) {
      loadProducts();
    } else {
      alert(result.error ?? "Failed to update product visibility.");
    }
  };

  const saveFeature = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    const formData = new FormData(e.currentTarget);
    const payload = {
      saas_product_id: String(formData.get("saas_product_id") ?? ""),
      feature_key: String(formData.get("feature_key") ?? ""),
      feature_name: String(formData.get("feature_name") ?? ""),
      feature_description: String(formData.get("feature_description") ?? ""),
      feature_type: String(formData.get("feature_type") ?? "capability") as
        | "capability"
        | "integration"
        | "support"
        | "limit",
      is_highlighted: formData.get("is_highlighted") === "on",
      is_active: formData.get("is_active") === "on",
      sort_order: Number(formData.get("sort_order")),
    };

    const result = editingFeature?.id
      ? await updateProductFeature(editingFeature.id, payload)
      : await createProductFeature(payload);

    if (!result.ok) {
      setFormError(result.error);
    } else {
      setFeatureDialogOpen(false);
      setEditingFeature(null);
      loadProducts();
    }
    setSaving(false);
  };

  const deleteFeature = async (id: string) => {
    if (!confirm("Delete this feature?")) return;
    const result = await deleteProductFeature(id);
    if (result.ok) {
      loadProducts();
    } else {
      alert(result.error ?? "Failed to delete feature.");
    }
  };

  const savePricing = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    const formData = new FormData(e.currentTarget);
    const featuresRaw = formData.get("features");
    const limitsRaw = formData.get("limits");

    let features: Record<string, unknown> = {};
    let limits: Record<string, unknown> = {};
    try {
      if (featuresRaw && String(featuresRaw).trim()) features = JSON.parse(String(featuresRaw));
      if (limitsRaw && String(limitsRaw).trim()) limits = JSON.parse(String(limitsRaw));
    } catch {
      setFormError("Invalid JSON in features or limits.");
      setSaving(false);
      return;
    }

    const payload = {
      saas_product_id: String(formData.get("saas_product_id") ?? ""),
      plan_id: formData.get("plan_id") ? String(formData.get("plan_id")) : null,
      tier_name: String(formData.get("tier_name") ?? ""),
      description: formData.get("description") ? String(formData.get("description")) : null,
      price_monthly: Number(formData.get("price_monthly")),
      price_yearly: Number(formData.get("price_yearly")),
      currency: String(formData.get("currency") ?? "INR"),
      is_popular: formData.get("is_popular") === "on",
      is_active: formData.get("is_active") === "on",
      features,
      limits,
      sort_order: Number(formData.get("sort_order")),
    };

    const result = editingPricing?.id
      ? await updateProductPricing(editingPricing.id, payload)
      : await createProductPricing(payload);

    if (!result.ok) {
      setFormError(result.error);
    } else {
      setPricingDialogOpen(false);
      setEditingPricing(null);
      loadProducts();
    }
    setSaving(false);
  };

  const deletePricing = async (id: string) => {
    if (!confirm("Delete this pricing tier?")) return;
    const result = await deleteProductPricing(id);
    if (result.ok) {
      loadProducts();
    } else {
      alert(result.error ?? "Failed to delete pricing tier.");
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {products.length} product{products.length === 1 ? "" : "s"}
        </p>
        <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openProductDialog()}>
              <Plus className="size-4" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingProduct?.id ? "Edit Product" : "New Product"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={saveProduct} className="space-y-4">
              {formError && (
                <p className="text-sm text-destructive">{formError}</p>
              )}
              <input type="hidden" name="id" value={editingProduct?.id ?? ""} />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    name="name"
                    required
                    defaultValue={editingProduct?.name}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    name="slug"
                    required
                    defaultValue={editingProduct?.slug}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="tagline">Tagline</Label>
                <Input
                  id="tagline"
                  name="tagline"
                  required
                  defaultValue={editingProduct?.tagline}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="short_description">Short Description</Label>
                <Textarea
                  id="short_description"
                  name="short_description"
                  required
                  defaultValue={editingProduct?.short_description}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  required
                  defaultValue={editingProduct?.description}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="features">Features (one per line)</Label>
                <Textarea
                  id="features"
                  name="features"
                  defaultValue={
                    editingProduct?.features?.join("\n") ?? ""
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="target_audience">Target Audience</Label>
                  <Input
                    id="target_audience"
                    name="target_audience"
                    defaultValue={editingProduct?.target_audience ?? ""}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="hero_image_url">Hero Image URL</Label>
                  <Input
                    id="hero_image_url"
                    name="hero_image_url"
                    defaultValue={editingProduct?.hero_image_url ?? ""}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="image_url">Logo / Image URL</Label>
                  <Input
                    id="image_url"
                    name="image_url"
                    defaultValue={editingProduct?.image_url ?? ""}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="accent_color">Accent Color (hex)</Label>
                  <Input
                    id="accent_color"
                    name="accent_color"
                    placeholder="#6D28D9"
                    defaultValue={editingProduct?.accent_color ?? ""}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="external_app_url">External App URL</Label>
                  <Input
                    id="external_app_url"
                    name="external_app_url"
                    placeholder="https://app.example.com"
                    defaultValue={editingProduct?.external_app_url ?? ""}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cta_label">CTA Label (optional)</Label>
                  <Input
                    id="cta_label"
                    name="cta_label"
                    placeholder="Launch E-Inventory"
                    defaultValue={editingProduct?.cta_label ?? ""}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="cta_type">CTA Type</Label>
                <Select
                  name="cta_type"
                  defaultValue={editingProduct?.cta_type ?? "learn_more"}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="learn_more">Learn more</SelectItem>
                    <SelectItem value="launch">Launch</SelectItem>
                    <SelectItem value="contact">Contact sales</SelectItem>
                    <SelectItem value="login">Login</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="is_active"
                    name="is_active"
                    defaultChecked={editingProduct?.is_active ?? true}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="is_featured"
                    name="is_featured"
                    defaultChecked={editingProduct?.is_featured ?? false}
                  />
                  <Label htmlFor="is_featured">Featured</Label>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="sort_order">Sort Order</Label>
                <Input
                  id="sort_order"
                  name="sort_order"
                  type="number"
                  defaultValue={editingProduct?.sort_order ?? 0}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setProductDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading && (
        <Card className="p-8 text-center text-muted-foreground">
          Loading products...
        </Card>
      )}
      {error && (
        <Card className="p-8 text-center text-destructive">{error}</Card>
      )}

      <div className="space-y-6">
        {products.map((product) => (
          <Card key={product.id} className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{product.name}</h3>
                  <Badge variant={product.is_active ? "default" : "secondary"}>
                    {product.is_active ? "Active" : "Inactive"}
                  </Badge>
                  {product.is_featured && (
                    <Badge variant="outline">Featured</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {product.tagline}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  slug: {product.slug} · display order: {product.sort_order} ·{" "}
                  {product.product_features?.length ?? 0} feature(s) ·{" "}
                  {product.product_pricing?.length ?? 0} pricing tier(s)
                  {product.external_app_url
                    ? ` · ext: ${product.external_app_url}`
                    : ""}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openProductDialog(product)}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleProductActive(product)}
                  title={product.is_active ? "Unpublish" : "Publish"}
                >
                  {product.is_active ? (
                    <Eye className="size-4" />
                  ) : (
                    <EyeOff className="size-4 text-muted-foreground" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteProduct(product.id)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Features</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openFeatureDialog(product)}
                >
                  <Plus className="size-3" />
                  Add Feature
                </Button>
              </div>
              <div className="mt-3 space-y-2">
                {product.product_features?.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No features yet.
                  </p>
                )}
                {product.product_features?.map((feature) => (
                  <div
                    key={feature.id}
                    className="flex items-center justify-between rounded border p-2"
                  >
                    <div>
                      <p className="text-sm font-medium">{feature.feature_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {feature.feature_key} · {feature.feature_type}{" "}
                        {feature.is_highlighted ? "· Highlighted" : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openFeatureDialog(product, feature)}
                      >
                        <Pencil className="size-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteFeature(feature.id)}
                      >
                        <Trash2 className="size-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Pricing</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openPricingDialog(product)}
                >
                  <Plus className="size-3" />
                  Add Tier
                </Button>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {product.product_pricing?.length === 0 && (
                  <p className="text-sm text-muted-foreground sm:col-span-full">
                    No pricing tiers yet.
                  </p>
                )}
                {product.product_pricing?.map((tier) => (
                  <div
                    key={tier.id}
                    className="flex items-center justify-between rounded border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{tier.tier_name}</p>
                      <p className="text-xs text-muted-foreground">
                        ${tier.price_monthly}/mo · ${tier.price_yearly}/yr
                        {tier.is_popular ? " · Popular" : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openPricingDialog(product, tier)}
                      >
                        <Pencil className="size-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deletePricing(tier.id)}
                      >
                        <Trash2 className="size-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={featureDialogOpen} onOpenChange={setFeatureDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingFeature?.id ? "Edit Feature" : "New Feature"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={saveFeature} className="space-y-4">
            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}
            <input
              type="hidden"
              name="saas_product_id"
              value={editingFeature?.saas_product_id}
            />
            <input type="hidden" name="id" value={editingFeature?.id ?? ""} />
            <div className="space-y-1">
              <Label htmlFor="feature_key">Feature Key</Label>
              <Input
                id="feature_key"
                name="feature_key"
                required
                defaultValue={editingFeature?.feature_key}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="feature_name">Feature Name</Label>
              <Input
                id="feature_name"
                name="feature_name"
                required
                defaultValue={editingFeature?.feature_name}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="feature_description">Description</Label>
              <Textarea
                id="feature_description"
                name="feature_description"
                required
                defaultValue={editingFeature?.feature_description}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="feature_type">Type</Label>
              <Select
                name="feature_type"
                defaultValue={editingFeature?.feature_type ?? "capability"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="capability">Capability</SelectItem>
                  <SelectItem value="integration">Integration</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                  <SelectItem value="limit">Limit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="is_highlighted"
                name="is_highlighted"
                defaultChecked={editingFeature?.is_highlighted ?? false}
              />
              <Label htmlFor="is_highlighted">Highlighted</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="is_active"
                name="is_active"
                defaultChecked={editingFeature?.is_active ?? true}
              />
              <Label htmlFor="is_active">Active (shown publicly)</Label>
            </div>
            <div className="space-y-1">
              <Label htmlFor="sort_order">Sort Order</Label>
              <Input
                id="sort_order"
                name="sort_order"
                type="number"
                defaultValue={editingFeature?.sort_order ?? 0}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFeatureDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={pricingDialogOpen} onOpenChange={setPricingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPricing?.id ? "Edit Pricing Tier" : "New Pricing Tier"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={savePricing} className="space-y-4">
            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}
            <input
              type="hidden"
              name="saas_product_id"
              value={editingPricing?.saas_product_id}
            />
            <input type="hidden" name="id" value={editingPricing?.id ?? ""} />
            <div className="space-y-1">
              <Label htmlFor="tier_name">Tier Name</Label>
              <Input
                id="tier_name"
                name="tier_name"
                required
                defaultValue={editingPricing?.tier_name}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="price_monthly">Monthly Price</Label>
                <Input
                  id="price_monthly"
                  name="price_monthly"
                  type="number"
                  min="0"
                  required
                  defaultValue={editingPricing?.price_monthly}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="price_yearly">Yearly Price</Label>
                <Input
                  id="price_yearly"
                  name="price_yearly"
                  type="number"
                  min="0"
                  required
                  defaultValue={editingPricing?.price_yearly}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                name="currency"
                placeholder="INR"
                defaultValue={editingPricing?.currency ?? "INR"}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="features">Features (JSON)</Label>
              <Textarea
                id="features"
                name="features"
                defaultValue={
                  editingPricing
                    ? JSON.stringify(editingPricing.features ?? {}, null, 2)
                    : "{}"
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="limits">Limits (JSON)</Label>
              <Textarea
                id="limits"
                name="limits"
                defaultValue={
                  editingPricing
                    ? JSON.stringify(editingPricing.limits ?? {}, null, 2)
                    : "{}"
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={editingPricing?.description ?? ""}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="is_popular"
                name="is_popular"
                defaultChecked={editingPricing?.is_popular ?? false}
              />
              <Label htmlFor="is_popular">Popular</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="is_active"
                name="is_active"
                defaultChecked={editingPricing?.is_active ?? true}
              />
              <Label htmlFor="is_active">Active (shown publicly)</Label>
            </div>
            <div className="space-y-1">
              <Label htmlFor="sort_order">Sort Order</Label>
              <Input
                id="sort_order"
                name="sort_order"
                type="number"
                defaultValue={editingPricing?.sort_order ?? 0}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPricingDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
