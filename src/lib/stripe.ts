import Stripe from "stripe";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const STRIPE_PRICE_SINGLE = requireEnv("STRIPE_PRICE_SINGLE");
export const STRIPE_PRICE_BUNDLE = requireEnv("STRIPE_PRICE_BUNDLE");
export const STRIPE_PRICE_TEMPLATES = requireEnv("STRIPE_PRICE_TEMPLATES");
export const STRIPE_WEBHOOK_SECRET = requireEnv("STRIPE_WEBHOOK_SECRET");

export const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"));

// Lazy-loaded rewrite price IDs — not required at module level to avoid breaking
// existing tests that don't set these env vars
export function getRewritePriceId(tier: "basic" | "premium"): string {
  const envVar = tier === "basic" ? "STRIPE_PRICE_REWRITE_BASIC" : "STRIPE_PRICE_REWRITE_PREMIUM";
  const value = process.env[envVar];
  if (!value) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
  return value;
}
