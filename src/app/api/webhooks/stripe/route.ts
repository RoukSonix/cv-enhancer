import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { runRoastAI } from "@/lib/roast-ai";
import type { Prisma } from "@/generated/prisma/client";
import type { RoastResult } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let event: Stripe.Event;

  try {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");
    if (!sig) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }
    event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  // Handle template purchases (must be before roastId guard — templates have no roastId)
  if (session.metadata?.purchaseType === "templates") {
    const existing = await prisma.templatePurchase.findUnique({
      where: { stripeSessionId: session.id },
    });
    if (existing) return NextResponse.json({ received: true });

    await prisma.templatePurchase.create({
      data: {
        email: session.customer_email ?? session.customer_details?.email ?? "",
        stripeSessionId: session.id,
        userId: session.metadata.userId || null,
      },
    });
    return NextResponse.json({ received: true });
  }

  const { roastId, priceType, bundleToken } = session.metadata ?? {};

  if (!roastId || !priceType) {
    console.error("Webhook missing metadata:", session.metadata);
    return NextResponse.json({ received: true });
  }

  try {
    // Idempotency check
    const existing = await prisma.roast.findUnique({
      where: { id: roastId },
      select: { stripeSessionId: true },
    });

    if (existing?.stripeSessionId === session.id) {
      return NextResponse.json({ received: true });
    }

    // Mark as paid first (before AI call which may be slow/fail)
    await prisma.roast.update({
      where: { id: roastId },
      data: {
        paid: true,
        stripeSessionId: session.id,
        paidAt: new Date(),
      },
    });

    // Handle bundle credits
    if (priceType === "bundle" && bundleToken) {
      await prisma.credit.createMany({
        data: [
          {
            bundleToken,
            stripeSessionId: session.id,
            roastId,
            usedAt: new Date(),
          },
          { bundleToken, stripeSessionId: session.id },
          { bundleToken, stripeSessionId: session.id },
        ],
      });
    }

    // Re-run AI with paid prompt
    try {
      const roast = await prisma.roast.findUnique({
        where: { id: roastId },
        select: { resumeText: true },
      });

      if (roast) {
        const aiResult = await runRoastAI(roast.resumeText, "paid");

        const newResult: RoastResult = {
          ...aiResult,
          id: roastId,
          createdAt: new Date().toISOString(),
          paid: true,
        };

        await prisma.roast.update({
          where: { id: roastId },
          data: {
            tier: "paid",
            result: newResult as unknown as Prisma.JsonObject,
            overallScore: newResult.overallScore,
          },
        });
      }
    } catch (aiError) {
      console.error("Failed to re-run AI for paid roast:", aiError);
      // Roast is still marked paid — success page will handle retry
    }
  } catch (dbError) {
    console.error("Webhook DB error:", dbError);
    // Return 200 anyway — Stripe retries on non-2xx
  }

  return NextResponse.json({ received: true });
}
