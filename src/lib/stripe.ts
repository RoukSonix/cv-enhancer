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
export const STRIPE_WEBHOOK_SECRET = requireEnv("STRIPE_WEBHOOK_SECRET");

export const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
