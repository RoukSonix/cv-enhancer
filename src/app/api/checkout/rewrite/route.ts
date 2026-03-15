import { NextRequest, NextResponse } from "next/server";
import { stripe, getRewritePriceId } from "@/lib/stripe";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { extractTextFromPdf } from "@/lib/pdf-fallback";
import { isValidEmail } from "@/lib/email";

export const runtime = "nodejs";

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

    const formData = await req.formData();
    const tier = formData.get("tier") as string | null;
    const email = formData.get("email") as string | null;
    const notes = (formData.get("notes") as string | null) || null;
    const resumeFile = formData.get("resume") as File | null;
    const resumeTextRaw = formData.get("resumeText") as string | null;

    // Validate tier
    if (!tier || (tier !== "basic" && tier !== "premium")) {
      return NextResponse.json({ error: "Invalid tier. Must be 'basic' or 'premium'." }, { status: 400 });
    }

    // Validate email
    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }

    // Extract resume text
    let resumeText = resumeTextRaw?.trim() || "";

    if (resumeFile && resumeFile.size > 0) {
      const buffer = Buffer.from(await resumeFile.arrayBuffer());
      const { text } = await extractTextFromPdf(buffer);
      resumeText = text;
    }

    if (!resumeText) {
      return NextResponse.json({ error: "Resume text is required. Upload a PDF or paste text." }, { status: 400 });
    }

    // Get optional auth session
    const session = await auth();

    // Create order in DB BEFORE Stripe checkout
    const order = await prisma.rewriteOrder.create({
      data: {
        email: email.toLowerCase(),
        tier,
        resumeText,
        notes,
        status: "pending",
        userId: session?.user?.id || null,
      },
    });

    // Determine price ID
    const priceId = getRewritePriceId(tier);

    // Create Stripe Checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        purchaseType: "rewrite",
        orderId: order.id,
        tier,
      },
      customer_email: email.toLowerCase(),
      success_url: `${origin}/rewrite/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/rewrite`,
    });

    // Update order with Stripe session ID
    await prisma.rewriteOrder.update({
      where: { id: order.id },
      data: { stripeSessionId: checkoutSession.id },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Rewrite checkout error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
