import { NextRequest, NextResponse } from "next/server";
import { stripe, STRIPE_PRICE_TEMPLATES } from "@/lib/stripe";
import { auth } from "@/lib/auth";

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
    const { email } = body as { email?: string };

    // Get optional user session
    const session = await auth();

    const customerEmail = session?.user?.email ?? email;

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: STRIPE_PRICE_TEMPLATES, quantity: 1 }],
      metadata: {
        purchaseType: "templates",
        userId: session?.user?.id ?? "",
      },
      ...(customerEmail ? { customer_email: customerEmail } : {}),
      success_url: `${origin}/templates/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/templates`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Template checkout error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
