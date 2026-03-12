import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { stripe, STRIPE_PRICE_SINGLE, STRIPE_PRICE_BUNDLE } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    // CSRF protection
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    const expectedOrigin = `${protocol}://${host}`;

    if (!origin || origin !== expectedOrigin) {
      return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
    }

    const body = await req.json();
    const { roastId, priceType } = body as {
      roastId?: string;
      priceType?: string;
    };

    if (!roastId || typeof roastId !== "string") {
      return NextResponse.json({ error: "roastId is required" }, { status: 400 });
    }

    if (priceType !== "single" && priceType !== "bundle") {
      return NextResponse.json(
        { error: 'priceType must be "single" or "bundle"' },
        { status: 400 }
      );
    }

    const roast = await prisma.roast.findUnique({
      where: { id: roastId },
      select: { id: true, paid: true },
    });

    if (!roast) {
      return NextResponse.json({ error: "Roast not found" }, { status: 404 });
    }

    if (roast.paid) {
      return NextResponse.json({ error: "Roast is already paid" }, { status: 409 });
    }

    const priceId =
      priceType === "single" ? STRIPE_PRICE_SINGLE : STRIPE_PRICE_BUNDLE;

    const metadata: Record<string, string> = { roastId, priceType };
    if (priceType === "bundle") {
      metadata.bundleToken = nanoid(16);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      metadata,
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/cancel?roast_id=${roastId}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
