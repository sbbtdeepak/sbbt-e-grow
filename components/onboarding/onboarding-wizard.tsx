"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  saveOnboardingState,
  skipOnboardingStep,
  completeOnboarding,
  type OnboardingState,
} from "@/app/(app)/onboarding/actions";

const STEPS = [
  { num: 1, title: "Welcome" },
  { num: 2, title: "Company Profile" },
  { num: 3, title: "Marketplace" },
  { num: 4, title: "Seller Account" },
  { num: 5, title: "Products" },
  { num: 6, title: "Complete" },
];

type Props = {
  initialState: OnboardingState;
  companyName: string;
  planName: string;
};

export function OnboardingWizard({
  initialState,
  companyName,
  planName,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState(initialState.currentStep);
  const [saving, setSaving] = useState(false);

  const [marketplaceName, setMarketplaceName] = useState("Amazon");
  const [sellerName, setSellerName] = useState("");
  const [productCount, setProductCount] = useState(0);

  const goNext = async (nextStep?: number) => {
    setSaving(true);
    const target = nextStep ?? Math.min(6, step + 1);
    const res = await saveOnboardingState(target);
    if (res.ok) {
      setStep(target);
    }
    setSaving(false);
  };

  const handleSkipMarketplaces = async () => {
    setSaving(true);
    await skipOnboardingStep("skippedMarketplaces");
    setStep(4);
    setSaving(false);
  };

  const handleSkipSellers = async () => {
    setSaving(true);
    await skipOnboardingStep("skippedSellers");
    setStep(5);
    setSaving(false);
  };

  const handleSkipProducts = async () => {
    setSaving(true);
    await skipOnboardingStep("skippedProducts");
    setStep(6);
    setSaving(false);
  };

  const handleComplete = async () => {
    setSaving(true);
    await completeOnboarding();
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="mx-auto w-full max-w-xl py-8">
      {/* Progress indicator */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {STEPS.map((s) => (
          <div
            key={s.num}
            className={`flex h-2 flex-1 rounded-full ${
              s.num <= step ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      <Card className="w-full">
        <CardContent className="p-6 sm:p-8">
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <h1 className="text-2xl font-semibold tracking-tight">
                Welcome, {companyName}
              </h1>
              <p className="text-sm text-muted-foreground">
                You are on the <strong>{planName}</strong> plan. Let us set up
                your workspace so you can start managing orders, products, and
                reports.
              </p>
              <Button onClick={() => goNext(2)} disabled={saving}>
                Get Started
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <h1 className="text-2xl font-semibold tracking-tight">
                Company Profile
              </h1>
              <p className="text-sm text-muted-foreground">
                Let us make sure your company details are correct.
              </p>
              <Label>Company Name</Label>
              <Input defaultValue={companyName} placeholder="Company name" />
              <Label>GST</Label>
              <Input placeholder="GST number" />
              <div className="flex items-center justify-between gap-3 pt-4">
                <Button variant="ghost" onClick={() => goNext(1)}>
                  Back
                </Button>
                <Button onClick={() => goNext(3)} disabled={saving}>
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-4">
              <h1 className="text-2xl font-semibold tracking-tight">
                Marketplace
              </h1>
              <p className="text-sm text-muted-foreground">
                Add your sales marketplaces like Amazon, Meesho, Flipkart,
                Website.
              </p>
              <ul className="flex flex-col gap-2 text-sm">
                <li>Amazon</li>
                <li>Meesho</li>
                <li>Flipkart</li>
                <li>Website</li>
                <li>Other</li>
              </ul>
              <Label>Marketplace Name</Label>
              <Input
                placeholder="e.g. Amazon"
                value={marketplaceName}
                onChange={(e) => setMarketplaceName(e.target.value)}
              />
              <div className="flex items-center justify-between gap-3 pt-4">
                <Button variant="outline" onClick={() => goNext(2)}>
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    onClick={handleSkipMarketplaces}
                    disabled={saving}
                  >
                    Skip
                  </Button>
                  <Button onClick={() => goNext(4)} disabled={saving}>
                    Add Marketplace
                  </Button>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col gap-4">
              <h1 className="text-2xl font-semibold tracking-tight">
                Seller Account
              </h1>
              <p className="text-sm text-muted-foreground">
                Add seller accounts under your marketplace.
              </p>
              <Label>Seller Account Name</Label>
              <Input
                placeholder="e.g. Account 1 - Sunita"
                value={sellerName}
                onChange={(e) => setSellerName(e.target.value)}
              />
              <div className="flex items-center justify-between gap-3 pt-4">
                <Button variant="outline" onClick={() => goNext(3)}>
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={handleSkipSellers} disabled={saving}>
                    Skip
                  </Button>
                  <Button onClick={() => goNext(5)} disabled={saving}>
                    Add Seller
                  </Button>
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="flex flex-col gap-4">
              <h1 className="text-2xl font-semibold tracking-tight">
                Products
              </h1>
              <p className="text-sm text-muted-foreground">
                Add your initial products ({productCount} / 10 added). You can
                always add more later.
              </p>
              <Label>SKU</Label>
              <Input placeholder="e.g. PLANT-001" />
              <Label>Product Name</Label>
              <Input placeholder="e.g. Money Plant" />
              <div className="flex items-center justify-between gap-3 pt-4">
                <Button variant="outline" onClick={() => goNext(4)}>
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={handleSkipProducts} disabled={saving}>
                    Skip
                  </Button>
                  <Button
                    onClick={() => {
                      setProductCount((c) => c + 1);
                    }}
                    disabled={saving}
                  >
                    Add Product
                  </Button>
                </div>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="flex flex-col gap-4">
              <h1 className="text-2xl font-semibold tracking-tight">
                Company Setup Complete
              </h1>
              <p className="text-sm text-muted-foreground">
                You are all set to manage your business with SBBT E-Grow.
              </p>
              <div className="text-sm">Plan: {planName}</div>
              <Button onClick={handleComplete} disabled={saving}>
                Go to Dashboard
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
